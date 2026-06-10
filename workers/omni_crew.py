#!/usr/bin/env python3
"""
workers/omni_crew.py — ZAYRON-X Omnipresent Intelligence Crew Orchestrator (2027 Edge-RAG Decoupled)

Architecture
────────────
5 isolated concurrent processing lines:
  LINE-01: CVE/VULN (feed_type='cve')
  LINE-02: DARKWEB (feed_type='darkweb')
  LINE-03: TELEGRAM (feed_type='telegram')
  LINE-04: OSINT/NEWS (feed_type='rss')
  LINE-05: FINANCIAL SYNTHESIS (Central Validator queue consumer)

Token Bucket Rate-Limiter ensures strictly sequential Gemini generation calls with immutable 5.0s sleep.
Cloudflare Edge-RAG integration fetches vector grounding before generation.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import time
from typing import Any, Optional

import aiohttp

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from workers.config import (
    CREW_BATCH_SIZE,
    CREW_POLL_INTERVAL_MIN,
    GEMINI_API_KEY,
    GEMINI_FLASH_MODEL,
    GEMINI_PRO_MODEL,
    MAX_RETRIES_PER_AGENT,
    TOKEN_BUDGET_COMPLIANCE,
    TOKEN_BUDGET_HARVESTER,
    TOKEN_BUDGET_QUANT,
    TOKEN_BUDGET_VALIDATOR,
    TOKEN_BUDGET_WEAVER,
    validate_config,
    SUPABASE_SERVICE_KEY
)
from workers.contracts.inter_agent import (
    ComplianceReport,
    ExecutiveSITREP,
    FinancialAssessment,
    HarvestPayload,
    ValidatedIntel,
    OSINTPayload,
    InfraAssessment,
)
from workers.agents.harvester import HARVESTER_SYSTEM_PROMPT, build_harvest_prompt, parse_harvest_response
from workers.agents.osint_spy import OSINT_SPY_SYSTEM_PROMPT, build_osint_spy_prompt, parse_osint_spy_response
from workers.agents.infra_architect import INFRA_ARCHITECT_SYSTEM_PROMPT, build_infra_architect_prompt, parse_infra_architect_response
from workers.agents.validator import VALIDATOR_SYSTEM_PROMPT, build_validator_prompt, parse_validator_response
from workers.agents.compliance import COMPLIANCE_SYSTEM_PROMPT, build_compliance_prompt, parse_compliance_response
from workers.agents.quant import QUANT_SYSTEM_PROMPT, build_quant_prompt, parse_quant_response
from workers.agents.weaver import WEAVER_SYSTEM_PROMPT, build_anti_fud_retry_prompt, build_weaver_prompt, enforce_anti_fud, parse_weaver_response
from workers.persistence import claim_pending_feeds, mark_feed_status, persist_sitrep, trigger_revalidation, utc_now_iso

try:
    from google.api_core import exceptions as google_exceptions
except ImportError:
    class DummyException(Exception): pass
    class google_exceptions:
        ResourceExhausted = DummyException
        RetryError = DummyException
        GoogleAPICallError = DummyException

logging.basicConfig(
    level=logging.DEBUG if os.getenv("CREW_DEBUG", "").lower() == "true" else logging.INFO,
    format="%(asctime)s [%(levelname)s] [OMNI-CREW] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
log = logging.getLogger("zayron_x_omni_crew")

NEXT_PUBLIC_APP_URL = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")


async def fetch_rag_context(http_session: aiohttp.ClientSession, line_token: str, query: str) -> str:
    """Fetch Top-3 grounded book segments from Cloudflare Vectorize via Edge-RAG endpoint."""
    url = f"{NEXT_PUBLIC_APP_URL}/api/admin/sync-knowledge"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    payload = {"action": "query", "line_token": line_token, "query": query, "limit": 3}
    try:
        async with http_session.post(url, headers=headers, json=payload, timeout=5) as resp:
            if resp.status == 200:
                data = await resp.json()
                segments = data.get("segments", [])
                if segments:
                    return "\n\n[EDGE-RAG GROUNDING KNOWLEDGE]:\n" + "\n---\n".join(segments)
    except Exception as exc:
        log.warning("[EDGE-RAG] Lookup failed for %s: %s", line_token, exc)
    return ""


class GeminiClient:
    def __init__(self, api_key: str):
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            self._genai = genai
            self._initialized = True
            log.info("Gemini SDK initialized")
        except ImportError:
            log.error("google-generativeai not installed.")
            self._initialized = False
        
        self._inference_lock = asyncio.Lock()

    async def generate(
        self,
        model_name: str,
        system_prompt: str,
        user_message: str,
        max_output_tokens: int = 4096,
        temperature: float = 0.2,
    ) -> tuple[str, int, int]:
        if not self._initialized:
            raise RuntimeError("Gemini SDK not initialized")

        backoff_delays = [30, 60, 120]
        current_model = model_name

        async with self._inference_lock:
            while True:
                attempt = 0
                while True:
                    try:
                        def _call() -> tuple[str, int, int]:
                            model = self._genai.GenerativeModel(
                                model_name=current_model,
                                system_instruction=system_prompt,
                                generation_config=self._genai.GenerationConfig(
                                    max_output_tokens=max_output_tokens,
                                    temperature=temperature,
                                    response_mime_type="application/json",
                                ),
                            )
                            response = model.generate_content(user_message)
                            text = response.text or ""
                            ptok = getattr(response.usage_metadata, "prompt_token_count", len(user_message)//4) if hasattr(response, "usage_metadata") else len(user_message)//4
                            ctok = getattr(response.usage_metadata, "candidates_token_count", len(text)//4) if hasattr(response, "usage_metadata") else len(text)//4
                            return text, ptok, ctok

                        res = await asyncio.to_thread(_call)
                        
                        # MISSION 1: IMMUTABLE THROTTLING CONDITION (12 RPM)
                        log.debug("Enforcing immutable 20.0s rate limit sleep...")
                        await asyncio.sleep(20.0)
                        
                        return res

                    except (google_exceptions.ResourceExhausted, google_exceptions.RetryError) as exc:
                        if attempt < len(backoff_delays):
                            delay = backoff_delays[attempt]
                            attempt += 1
                            log.warning("Rate limit on %s. Waiting %ds...", current_model, delay)
                            await asyncio.sleep(delay)
                        else:
                            if current_model == GEMINI_PRO_MODEL and GEMINI_FLASH_MODEL != GEMINI_PRO_MODEL:
                                current_model = GEMINI_FLASH_MODEL
                                break
                            raise exc
                    except google_exceptions.GoogleAPICallError as exc:
                        if current_model == GEMINI_PRO_MODEL and GEMINI_FLASH_MODEL != GEMINI_PRO_MODEL:
                            current_model = GEMINI_FLASH_MODEL
                            break
                        raise exc


async def run_pipeline_stages_1_3(
    client: GeminiClient, 
    http_session: aiohttp.ClientSession,
    feed: dict[str, Any], 
    line_token: str
) -> tuple[ValidatedIntel, ComplianceReport, dict[str, int], str] | None:
    raw_text = feed.get("raw_content", "")
    source = feed.get("source_channel", "unknown")
    token_tracker = {"prompt": 0, "completion": 0}

    # EDGE-RAG Correlation Lookup
    rag_context = await fetch_rag_context(http_session, line_token, raw_text[:500])
    
    # 1. Harvest & OSINT Spy in parallel
    try:
        sys_prompt_harv = HARVESTER_SYSTEM_PROMPT + rag_context
        user_msg_harv = build_harvest_prompt(raw_text, source)
        sys_prompt_osint = OSINT_SPY_SYSTEM_PROMPT + rag_context
        user_msg_osint = build_osint_spy_prompt(raw_text, source)

        async def run_harv():
            llm_out, p, c = await client.generate(GEMINI_FLASH_MODEL, sys_prompt_harv, user_msg_harv, TOKEN_BUDGET_HARVESTER, 0.1)
            return parse_harvest_response(raw_text, source, llm_out), p, c

        async def run_osint():
            llm_out, p, c = await client.generate(GEMINI_FLASH_MODEL, sys_prompt_osint, user_msg_osint, TOKEN_BUDGET_HARVESTER, 0.1)
            return parse_osint_spy_response(raw_text, source, llm_out), p, c

        (harvest, hp, hc), (osint, op, oc) = await asyncio.gather(run_harv(), run_osint())
        token_tracker["prompt"] += (hp + op)
        token_tracker["completion"] += (hc + oc)
    except Exception as exc:
        log.error("[%s] Advanced Ingestion (Harvester & OSINT Spy) failed: %s", line_token, exc)
        return None

    # 2. Infrastructure Defense & Forensic Validation in parallel
    try:
        sys_prompt_infra = INFRA_ARCHITECT_SYSTEM_PROMPT + rag_context
        user_msg_infra = build_infra_architect_prompt(harvest, osint)
        sys_prompt_val = VALIDATOR_SYSTEM_PROMPT + rag_context
        user_msg_val = build_validator_prompt(harvest)

        async def run_infra():
            llm_out, p, c = await client.generate(GEMINI_FLASH_MODEL, sys_prompt_infra, user_msg_infra, TOKEN_BUDGET_HARVESTER, 0.1)
            return parse_infra_architect_response(llm_out), p, c

        async def run_val():
            llm_out, p, c = await client.generate(GEMINI_FLASH_MODEL, sys_prompt_val, user_msg_val, TOKEN_BUDGET_VALIDATOR, 0.1)
            return parse_validator_response(harvest, llm_out), p, c

        (infra, ip, ic), (validated, vp, vc) = await asyncio.gather(run_infra(), run_val())
        token_tracker["prompt"] += (ip + vp)
        token_tracker["completion"] += (ic + vc)

        # Attach osint & infra results to validated model
        validated.osint = osint
        validated.infra = infra
    except Exception as exc:
        log.error("[%s] Infrastructure Defense & Forensic Validation failed: %s", line_token, exc)
        return None

    # 3. Compliance
    try:
        sys_prompt = COMPLIANCE_SYSTEM_PROMPT + rag_context
        user_msg = build_compliance_prompt(validated)
        llm_out, p, c = await client.generate(GEMINI_PRO_MODEL, sys_prompt, user_msg, TOKEN_BUDGET_COMPLIANCE, 0.2)
        token_tracker["prompt"] += p; token_tracker["completion"] += c
        compliance = parse_compliance_response(llm_out)
    except Exception as exc:
        log.error("[%s] Compliance failed: %s", line_token, exc)
        return None
        
    return validated, compliance, token_tracker, raw_text


# Queue for Line 5 (Financial Synthesis)
synthesis_queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()


async def extraction_line_worker(line_id: str, feed_type: str, client: GeminiClient, interval_min: int) -> None:
    """Lines 1-4: Extract intelligence and push to Synthesis Queue."""
    log.info("Started %s (feed_type=%s)", line_id, feed_type)
    while True:
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
                feeds = await claim_pending_feeds(session, limit=CREW_BATCH_SIZE, feed_type=feed_type)
                for feed in feeds:
                    feed_id = feed.get("id")
                    result = await run_pipeline_stages_1_3(client, session, feed, line_id)
                    if result is None:
                        await mark_feed_status(session, feed_id, "crew_failed")
                        continue
                    
                    validated, compliance, tokens, raw_text = result
                    await synthesis_queue.put({
                        "feed_id": feed_id,
                        "feed": feed,
                        "validated": validated,
                        "compliance": compliance,
                        "tokens": tokens,
                        "raw_text": raw_text,
                        "source": feed.get("source_channel", "unknown")
                    })
        except Exception as exc:
            log.error("%s Error: %s", line_id, exc)
        await asyncio.sleep(interval_min * 60)


async def synthesis_line_worker(client: GeminiClient) -> None:
    """Line 5: Central Validator (Financial Synthesis & Weaver)."""
    log.info("Started LINE-05-SYNTHESIS")
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
        while True:
            try:
                task_data = await synthesis_queue.get()
                feed_id = task_data["feed_id"]
                validated: ValidatedIntel = task_data["validated"]
                compliance: ComplianceReport = task_data["compliance"]
                tokens: dict[str, int] = task_data["tokens"]
                raw_text: str = task_data["raw_text"]
                source: str = task_data["source"]
                
                # EDGE-RAG Correlation Lookup for Weaving
                rag_context = await fetch_rag_context(session, "LINE-05-SYNTHESIS", raw_text[:500])

                # Stage 4: Quant (Financial Synthesis - uses FBRCalculator internally)
                try:
                    sys_prompt = QUANT_SYSTEM_PROMPT + rag_context
                    user_msg = build_quant_prompt(validated, compliance)
                    llm_out, p, c = await client.generate(GEMINI_FLASH_MODEL, sys_prompt, user_msg, TOKEN_BUDGET_QUANT, 0.15)
                    tokens["prompt"] += p; tokens["completion"] += c
                    financial = parse_quant_response(validated, compliance, llm_out)
                except Exception as exc:
                    log.error("[LINE-05] Quant failed: %s", exc)
                    await mark_feed_status(session, feed_id, "crew_failed")
                    synthesis_queue.task_done()
                    continue

                # Stage 5: Weaver
                sitrep = None
                messages = [build_weaver_prompt(validated, compliance, financial)]
                sys_prompt = WEAVER_SYSTEM_PROMPT + rag_context
                
                for attempt in range(1, MAX_RETRIES_PER_AGENT + 2):
                    try:
                        llm_out, p, c = await client.generate(GEMINI_PRO_MODEL, sys_prompt, "\n\n".join(messages), TOKEN_BUDGET_WEAVER, 0.25)
                        tokens["prompt"] += p; tokens["completion"] += c
                        sitrep = parse_weaver_response(validated, compliance, financial, llm_out)
                        if sitrep is not None:
                            break
                        
                        if attempt <= MAX_RETRIES_PER_AGENT:
                            try:
                                cleaned = llm_out.strip().strip("```json").strip("```").strip()
                                _, violations = enforce_anti_fud(json.loads(cleaned))
                                messages.append(build_anti_fud_retry_prompt(violations))
                            except:
                                messages.append("REJECTED: Invalid JSON or Anti-FUD violation. Rewrite.")
                    except Exception as exc:
                        log.error("[LINE-05] Weaver attempt %d failed: %s", attempt, exc)
                
                if sitrep is None:
                    await mark_feed_status(session, feed_id, "crew_failed")
                elif not sitrep.anti_fud_passed:
                    await mark_feed_status(session, feed_id, "anti_fud_rejected")
                else:
                    success = await persist_sitrep(session, sitrep, raw_text, source_channel=source)
                    if success:
                        await mark_feed_status(
                            session, feed_id, "crew_promoted",
                            analysis=sitrep.executive_summary[:500],
                            translated_title=sitrep.title,
                            translated_content=sitrep.content[:2000],
                            category=sitrep.category,
                            prompt_tokens=tokens["prompt"],
                            completion_tokens=tokens["completion"],
                            promoted_at=utc_now_iso()
                        )
                        await trigger_revalidation(session)
                    else:
                        await mark_feed_status(session, feed_id, "persist_failed")

                synthesis_queue.task_done()
            except Exception as exc:
                log.error("[LINE-05] Unhandled error: %s", exc)
                await asyncio.sleep(5)


async def main_loop() -> None:
    log.info("Starting ZAYRON-X Omnipresent Intelligence Crew (5 Isolated Lines)")
    config_errors = validate_config()
    if config_errors:
        for err in config_errors: log.critical("CONFIG ERROR: %s", err)
        sys.exit(1)

    client = GeminiClient(api_key=GEMINI_API_KEY)

    # Launch the 5 independent lines
    asyncio.create_task(extraction_line_worker("LINE-01-CVE", "cve", client, CREW_POLL_INTERVAL_MIN))
    asyncio.create_task(extraction_line_worker("LINE-02-DARKWEB", "darkweb", client, CREW_POLL_INTERVAL_MIN))
    asyncio.create_task(extraction_line_worker("LINE-03-TELEGRAM", "telegram", client, CREW_POLL_INTERVAL_MIN))
    asyncio.create_task(extraction_line_worker("LINE-04-OSINT", "rss", client, CREW_POLL_INTERVAL_MIN))
    asyncio.create_task(synthesis_line_worker(client))

    while True:
        await asyncio.sleep(3600)

def main() -> None:
    asyncio.run(main_loop())

if __name__ == "__main__":
    main()
