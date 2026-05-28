#!/usr/bin/env python3
"""
workers/omni_crew.py — ZAYRON-X Omnipresent Intelligence Crew Orchestrator

CrewAI-powered sequential pipeline that processes raw intelligence feeds
through 5 specialized agents:

  Harvester → Validator → [Compliance, Quant] → Weaver → Persistence

Architecture
────────────
  Supabase raw_feeds (status='pending')
       │
       ▼
  Feed Claiming (optimistic lock)
       │
       ▼
  Agent 1: Harvester (Flash)  — Extract, translate, classify
       │
       ▼
  Agent 2: Validator (Flash)  — Verify IoCs, map TTPs, grade source
       │
       ├──────────────────────┐
       ▼                      ▼
  Agent 3: Compliance (Pro)   Agent 4: Quant (Flash)
       │                      │
       └──────────┬───────────┘
                  ▼
  Agent 5: Weaver (Pro) — Synthesize + Anti-FUD gate
       │
       ▼
  Supabase articles table + Vercel ISR revalidation

Usage
─────
    export GEMINI_API_KEY="..."
    export SUPABASE_URL="https://..."
    export SUPABASE_SERVICE_KEY="sb-..."
    python -m workers.omni_crew          # Daemon mode
    python -m workers.omni_crew --once   # Single cycle
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import time
from typing import Any

import aiohttp

# ---------------------------------------------------------------------------
# Path setup — ensure project root is importable
# ---------------------------------------------------------------------------

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

# ---------------------------------------------------------------------------
# Internal imports
# ---------------------------------------------------------------------------

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
)
from workers.contracts.inter_agent import (
    ComplianceReport,
    ExecutiveSITREP,
    FinancialAssessment,
    HarvestPayload,
    ValidatedIntel,
)
from workers.agents.harvester import (
    HARVESTER_SYSTEM_PROMPT,
    build_harvest_prompt,
    parse_harvest_response,
)
from workers.agents.validator import (
    VALIDATOR_SYSTEM_PROMPT,
    build_validator_prompt,
    parse_validator_response,
)
from workers.agents.compliance import (
    COMPLIANCE_SYSTEM_PROMPT,
    build_compliance_prompt,
    parse_compliance_response,
)
from workers.agents.quant import (
    QUANT_SYSTEM_PROMPT,
    build_quant_prompt,
    parse_quant_response,
)
from workers.agents.weaver import (
    WEAVER_SYSTEM_PROMPT,
    build_anti_fud_retry_prompt,
    build_weaver_prompt,
    enforce_anti_fud,
    parse_weaver_response,
)
from workers.persistence import (
    claim_pending_feeds,
    mark_feed_status,
    persist_sitrep,
    trigger_revalidation,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.DEBUG if os.getenv("CREW_DEBUG", "").lower() == "true"
    else logging.INFO,
    format="%(asctime)s [%(levelname)s] [OMNI-CREW] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
log = logging.getLogger("zayron_x_omni_crew")


# ---------------------------------------------------------------------------
# Gemini LLM Client (google-generativeai SDK)
# ---------------------------------------------------------------------------


class GeminiClient:
    """Async wrapper around the Google Generative AI SDK.

    Supports both Pro and Flash models with configurable token budgets.
    Falls back to synchronous calls wrapped in asyncio.to_thread if the
    SDK doesn't support native async.
    """

    def __init__(self, api_key: str):
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            self._genai = genai
            self._initialized = True
            log.info("Gemini SDK initialized")
        except ImportError:
            log.error(
                "google-generativeai not installed. "
                "Run: pip install google-generativeai"
            )
            self._initialized = False

    async def generate(
        self,
        model_name: str,
        system_prompt: str,
        user_message: str,
        max_output_tokens: int = 4096,
        temperature: float = 0.2,
    ) -> str:
        """Generate a response from the specified Gemini model."""
        if not self._initialized:
            raise RuntimeError("Gemini SDK not initialized")

        def _call() -> str:
            model = self._genai.GenerativeModel(
                model_name=model_name,
                system_instruction=system_prompt,
                generation_config=self._genai.GenerationConfig(
                    max_output_tokens=max_output_tokens,
                    temperature=temperature,
                    response_mime_type="application/json",
                ),
            )
            response = model.generate_content(user_message)
            return response.text or ""

        return await asyncio.to_thread(_call)


# ---------------------------------------------------------------------------
# Pipeline Stages
# ---------------------------------------------------------------------------


async def stage_harvest(
    client: GeminiClient,
    raw_text: str,
    source_channel: str,
) -> HarvestPayload:
    """Stage 1: Harvester — Extract, translate, classify."""
    log.info("  [HARVESTER] Processing %d chars from %s", len(raw_text), source_channel)
    t0 = time.monotonic()

    user_msg = build_harvest_prompt(raw_text, source_channel)
    llm_output = await client.generate(
        model_name=GEMINI_FLASH_MODEL,
        system_prompt=HARVESTER_SYSTEM_PROMPT,
        user_message=user_msg,
        max_output_tokens=TOKEN_BUDGET_HARVESTER,
        temperature=0.1,
    )

    payload = parse_harvest_response(raw_text, source_channel, llm_output)
    log.info(
        "  [HARVESTER] Complete — lang=%s, category=%s, entities=%d (%.1fs)",
        payload.detected_language,
        payload.preliminary_category,
        len(payload.extracted_entities),
        time.monotonic() - t0,
    )
    return payload


async def stage_validate(
    client: GeminiClient,
    harvest: HarvestPayload,
) -> ValidatedIntel:
    """Stage 2: Validator — Cross-reference, verify IoCs, map TTPs."""
    log.info("  [VALIDATOR] Verifying intelligence...")
    t0 = time.monotonic()

    user_msg = build_validator_prompt(harvest)
    llm_output = await client.generate(
        model_name=GEMINI_FLASH_MODEL,
        system_prompt=VALIDATOR_SYSTEM_PROMPT,
        user_message=user_msg,
        max_output_tokens=TOKEN_BUDGET_VALIDATOR,
        temperature=0.1,
    )

    validated = parse_validator_response(harvest, llm_output)
    log.info(
        "  [VALIDATOR] Complete — IoCs=%d, TTPs=%d, severity=%s, grade=%s (%.1fs)",
        len(validated.verified_iocs),
        len(validated.mitre_ttps),
        validated.severity,
        validated.source_reliability_grade,
        time.monotonic() - t0,
    )
    return validated


async def stage_compliance(
    client: GeminiClient,
    validated: ValidatedIntel,
) -> ComplianceReport:
    """Stage 3a: Compliance — Regulatory framework mapping."""
    log.info("  [COMPLIANCE] Mapping regulatory frameworks...")
    t0 = time.monotonic()

    user_msg = build_compliance_prompt(validated)
    llm_output = await client.generate(
        model_name=GEMINI_PRO_MODEL,
        system_prompt=COMPLIANCE_SYSTEM_PROMPT,
        user_message=user_msg,
        max_output_tokens=TOKEN_BUDGET_COMPLIANCE,
        temperature=0.2,
    )

    report = parse_compliance_response(llm_output)
    log.info(
        "  [COMPLIANCE] Complete — ISO=%d, NIST=%d, GDPR=€%s, risk=%s (%.1fs)",
        len(report.iso_27001_controls),
        len(report.nist_csf_functions),
        f"{report.gdpr_fine_exposure_eur:,.0f}",
        report.compliance_risk_level,
        time.monotonic() - t0,
    )
    return report


async def stage_quant(
    client: GeminiClient,
    validated: ValidatedIntel,
    compliance: ComplianceReport,
) -> FinancialAssessment:
    """Stage 3b: Quant — Financial Blast Radius computation."""
    log.info("  [QUANT] Computing Financial Blast Radius...")
    t0 = time.monotonic()

    user_msg = build_quant_prompt(validated, compliance)
    llm_output = await client.generate(
        model_name=GEMINI_FLASH_MODEL,
        system_prompt=QUANT_SYSTEM_PROMPT,
        user_message=user_msg,
        max_output_tokens=TOKEN_BUDGET_QUANT,
        temperature=0.15,
    )

    assessment = parse_quant_response(validated, compliance, llm_output)
    log.info(
        "  [QUANT] Complete — FBR=%.2f, cost=$%s–$%s, orgs=%d (%.1fs)",
        assessment.fbr_score,
        f"{assessment.breach_cost_low:,.0f}",
        f"{assessment.breach_cost_high:,.0f}",
        assessment.affected_org_estimate,
        time.monotonic() - t0,
    )
    return assessment


async def stage_weave(
    client: GeminiClient,
    validated: ValidatedIntel,
    compliance: ComplianceReport,
    financial: FinancialAssessment,
) -> ExecutiveSITREP | None:
    """Stage 4: Weaver — Executive SITREP synthesis with Anti-FUD gate.

    Retries up to MAX_RETRIES_PER_AGENT times if Anti-FUD violations detected.
    """
    log.info("  [WEAVER] Synthesizing Executive SITREP...")

    user_msg = build_weaver_prompt(validated, compliance, financial)
    messages = [user_msg]

    for attempt in range(1, MAX_RETRIES_PER_AGENT + 2):
        t0 = time.monotonic()

        llm_output = await client.generate(
            model_name=GEMINI_PRO_MODEL,
            system_prompt=WEAVER_SYSTEM_PROMPT,
            user_message="\n\n".join(messages),
            max_output_tokens=TOKEN_BUDGET_WEAVER,
            temperature=0.25,
        )

        sitrep = parse_weaver_response(validated, compliance, financial, llm_output)

        if sitrep is not None:
            log.info(
                "  [WEAVER] Complete — title='%s' (%d words, attempt %d, %.1fs)",
                sitrep.title[:60],
                len(sitrep.content.split()),
                attempt,
                time.monotonic() - t0,
            )
            return sitrep

        # Anti-FUD violation or parse failure — check if we should retry
        if attempt <= MAX_RETRIES_PER_AGENT:
            # Try to extract violations for targeted feedback
            try:
                cleaned = llm_output.strip()
                if cleaned.startswith("```"):
                    import re
                    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
                    cleaned = re.sub(r"\s*```$", "", cleaned)
                parsed = json.loads(cleaned)
                _, violations = enforce_anti_fud(parsed)
                retry_msg = build_anti_fud_retry_prompt(violations)
            except Exception:
                retry_msg = (
                    "YOUR PREVIOUS OUTPUT WAS REJECTED. Ensure valid JSON output "
                    "with NO banned Anti-FUD phrases. Rewrite completely."
                )

            messages.append(retry_msg)
            log.warning(
                "  [WEAVER] Attempt %d failed — retrying with Anti-FUD feedback",
                attempt,
            )
        else:
            log.error(
                "  [WEAVER] FAILED after %d attempts — dropping this feed",
                attempt,
            )

    return None


# ---------------------------------------------------------------------------
# Full Pipeline Execution
# ---------------------------------------------------------------------------


async def run_crew(
    client: GeminiClient,
    raw_text: str,
    source_channel: str,
) -> ExecutiveSITREP | None:
    """Execute the full 5-agent pipeline on a single raw feed.

    Returns an ExecutiveSITREP if successful, None if any critical stage fails.
    """
    # Stage 1: Harvest
    try:
        harvest = await stage_harvest(client, raw_text, source_channel)
    except Exception as exc:
        log.error("Harvester failed: %s", exc)
        return None

    # Stage 2: Validate
    try:
        validated = await stage_validate(client, harvest)
    except Exception as exc:
        log.error("Validator failed: %s", exc)
        return None

    # Stage 3a + 3b: Compliance and Quant (run in parallel)
    try:
        compliance_task = stage_compliance(client, validated)
        quant_task = stage_quant(client, validated, ComplianceReport())

        # Start compliance first, then quant uses its result
        compliance = await compliance_task
        quant_assessment = await stage_quant(client, validated, compliance)
    except Exception as exc:
        log.error("Compliance/Quant stage failed: %s", exc)
        return None

    # Stage 4: Weave
    try:
        sitrep = await stage_weave(client, validated, compliance, quant_assessment)
    except Exception as exc:
        log.error("Weaver failed: %s", exc)
        return None

    return sitrep


# ---------------------------------------------------------------------------
# Ingestion Cycle
# ---------------------------------------------------------------------------


async def crew_cycle(
    client: GeminiClient,
    http_session: aiohttp.ClientSession,
) -> dict[str, Any]:
    """Execute one complete crew ingestion cycle."""
    start = time.monotonic()
    stats: dict[str, Any] = {
        "feeds_claimed": 0,
        "feeds_processed": 0,
        "articles_generated": 0,
        "anti_fud_rejections": 0,
        "errors": 0,
        "cycle_seconds": 0.0,
    }

    # Step 1: Claim pending feeds
    feeds = await claim_pending_feeds(http_session, limit=CREW_BATCH_SIZE)
    stats["feeds_claimed"] = len(feeds)

    if not feeds:
        log.info("No pending feeds to process")
        stats["cycle_seconds"] = time.monotonic() - start
        return stats

    log.info("Processing %d feeds through 5-agent crew", len(feeds))

    # Step 2: Process each feed sequentially (to respect Gemini rate limits)
    for feed in feeds:
        feed_id = feed.get("id", "")
        raw_text = feed.get("raw_content", "")
        source = feed.get("source_channel", "unknown")

        if not raw_text or len(raw_text) < 15:
            await mark_feed_status(http_session, feed_id, "skipped")
            continue

        log.info("═══ Processing feed %s from %s ═══", feed_id[:8], source)

        try:
            sitrep = await run_crew(client, raw_text, source)

            if sitrep is None:
                stats["errors"] += 1
                await mark_feed_status(http_session, feed_id, "crew_failed")
                continue

            if not sitrep.anti_fud_passed:
                stats["anti_fud_rejections"] += 1
                await mark_feed_status(
                    http_session, feed_id, "anti_fud_rejected"
                )
                continue

            # Persist to articles table
            success = await persist_sitrep(http_session, sitrep, raw_text)

            if success:
                stats["articles_generated"] += 1
                await mark_feed_status(
                    http_session,
                    feed_id,
                    "crew_promoted",
                    analysis=sitrep.executive_summary[:500],
                )
                # Trigger ISR revalidation
                await trigger_revalidation(http_session)
            else:
                stats["errors"] += 1
                await mark_feed_status(http_session, feed_id, "persist_failed")

        except Exception as exc:
            log.error("Unhandled error processing feed %s: %s", feed_id[:8], exc)
            stats["errors"] += 1
            await mark_feed_status(http_session, feed_id, "crew_error")

        stats["feeds_processed"] += 1

        # Rate-limit pause between feeds
        await asyncio.sleep(2)

    stats["cycle_seconds"] = time.monotonic() - start
    log.info(
        "═══ Cycle complete: claimed=%d, processed=%d, articles=%d, "
        "anti_fud_rejected=%d, errors=%d, %.1fs ═══",
        stats["feeds_claimed"],
        stats["feeds_processed"],
        stats["articles_generated"],
        stats["anti_fud_rejections"],
        stats["errors"],
        stats["cycle_seconds"],
    )
    return stats


# ---------------------------------------------------------------------------
# Daemon Main Loop
# ---------------------------------------------------------------------------


async def main_loop() -> None:
    """Main crew daemon — continuous processing on a configurable interval."""
    log.info("=" * 64)
    log.info("  ZAYRON-X Omnipresent Intelligence Crew")
    log.info("  Gemini Pro:  %s", GEMINI_PRO_MODEL)
    log.info("  Gemini Flash: %s", GEMINI_FLASH_MODEL)
    log.info("  Batch size: %d", CREW_BATCH_SIZE)
    log.info("  Poll interval: %d min", CREW_POLL_INTERVAL_MIN)
    log.info("=" * 64)

    # Validate configuration
    config_errors = validate_config()
    if config_errors:
        for err in config_errors:
            log.critical("CONFIG ERROR: %s", err)
        sys.exit(1)

    client = GeminiClient(api_key=GEMINI_API_KEY)

    cycle = 0
    async with aiohttp.ClientSession(
        timeout=aiohttp.ClientTimeout(total=30),
    ) as http_session:
        while True:
            cycle += 1
            log.info("═══ Crew cycle %d starting ═══", cycle)

            try:
                stats = await crew_cycle(client, http_session)
            except Exception as exc:
                log.critical("Crew cycle %d crashed: %s", cycle, exc)
                stats = {"errors": 1}

            log.info("Sleeping %d min until next cycle...", CREW_POLL_INTERVAL_MIN)
            await asyncio.sleep(CREW_POLL_INTERVAL_MIN * 60)


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------


def main() -> None:
    if "--once" in sys.argv:

        async def _once() -> None:
            config_errors = validate_config()
            if config_errors:
                for err in config_errors:
                    log.critical("CONFIG ERROR: %s", err)
                sys.exit(1)

            client = GeminiClient(api_key=GEMINI_API_KEY)
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30),
            ) as http_session:
                stats = await crew_cycle(client, http_session)
                print(json.dumps(stats, indent=2, default=str))

        asyncio.run(_once())
    else:
        asyncio.run(main_loop())


if __name__ == "__main__":
    main()
