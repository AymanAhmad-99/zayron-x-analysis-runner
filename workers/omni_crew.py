#!/usr/bin/env python3
"""
workers/omni_crew.py — ZAYRON-X Consolidated Intelligence Master Crew Orchestrator

Consolidates the 7-Agent distributed intelligence swarm into a single-pass inference
Master Agent under the free-tier daily rate limits (500 requests/day).
Paced to process exactly 1 feed every 180 seconds (3 minutes), hitting exactly 480/day.
Uses direct database queries for RAG context, bypassing the localhost:3000 loopback.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
import sys
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from typing import Any, Optional

import aiohttp

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from workers.config import (
    ANTI_FUD_BANNED_PHRASES,
    CREW_BATCH_SIZE,
    CREW_POLL_INTERVAL_MIN,
    GEMINI_API_KEY,
    GEMINI_FLASH_MODEL,
    GEMINI_PRO_MODEL,
    MAX_RETRIES_PER_AGENT,
    SUPABASE_SERVICE_KEY,
    SUPABASE_URL,
    validate_config,
)
from workers.contracts.inter_agent import ExecutiveSITREP
from workers.persistence import (
    claim_pending_feeds,
    mark_feed_status,
    persist_sitrep,
    trigger_revalidation,
    utc_now_iso,
)

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

# ---------------------------------------------------------------------------
# Redis-Backed Daily Quota Ledger (WARN-05)
# Survives Docker container restarts. Key is UTC-date-scoped.
# ---------------------------------------------------------------------------

UPSTASH_REDIS_URL: str = os.getenv("UPSTASH_REDIS_REST_URL", "")
UPSTASH_REDIS_TOKEN: str = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")
DAILY_REQUEST_LIMIT: int = int(os.getenv("DAILY_REQUEST_LIMIT", "480"))


def _quota_key() -> str:
    """Return today's UTC quota Redis key, e.g. 'zayron:quota:2026-06-11'."""
    return f"zayron:quota:{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"


def _redis_request(method: str, path: str, body: str | None = None) -> Any:
    """Minimal synchronous Upstash REST call. Returns parsed JSON or None on failure."""
    if not UPSTASH_REDIS_URL or not UPSTASH_REDIS_TOKEN:
        return None
    url = UPSTASH_REDIS_URL.rstrip("/") + path
    headers = {
        "Authorization": f"Bearer {UPSTASH_REDIS_TOKEN}",
        "Content-Type": "application/json",
    }
    data = body.encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=4) as resp:
            return json.loads(resp.read().decode())
    except Exception as exc:
        log.debug("[QUOTA-LEDGER] Redis request failed (non-fatal): %s", exc)
        return None


def quota_get_today() -> int:
    """Return the current daily inference count from Redis. Returns 0 on failure."""
    result = _redis_request("GET", f"/get/{urllib.parse.quote(_quota_key())}")
    if result and result.get("result") is not None:
        try:
            return int(result["result"])
        except (TypeError, ValueError):
            pass
    return 0


def quota_increment() -> int:
    """Atomically increment today's daily counter. Sets TTL to 25h on first write."""
    key = urllib.parse.quote(_quota_key())
    # INCR returns the new count
    result = _redis_request("GET", f"/incr/{key}")
    new_count = 0
    if result and result.get("result") is not None:
        try:
            new_count = int(result["result"])
        except (TypeError, ValueError):
            pass
    # Set TTL of 90000 seconds (25 hours) to ensure rollover on midnight UTC
    if new_count == 1:
        _redis_request("GET", f"/expire/{key}/90000")
    return new_count

# ---------------------------------------------------------------------------
# Master Agent System Prompt (Literature-based Swarm Integration)
# ---------------------------------------------------------------------------

MASTER_INTELLIGENCE_PROMPT: str = """\
You are the ZAYRON-X Sovereign Swarm Master Intel Engine, an autonomous consolidated intelligence orchestrator.
You receive raw threat feeds and local RAG grounding contexts. You must run 7 virtual agent sub-modules internally in a single-pass inference to analyze the threat signal and synthesize a complete, production-ready intelligence dossier.

LITERATURE-BASED GROUNDING DIRECTIVES:
1. HARVESTER & OSINT SPY: Anchor technical reasoning strictly to Richards Heuer & Randolph H. Pherson's 'Structured Analytic Techniques for Intelligence Analysis' and core Tor/Telegram Metadata schemas.
2. INFRASTRUCTURE ARCHITECT: Anchor analysis strictly to Kleppmann's 'Designing Data-Intensive Applications' (partition behaviors, replication limits, DB impact) and Stevens' 'TCP/IP Illustrated' (packet transit, routing traversal, transport layers).
3. FORENSIC VALIDATOR: Map to MITRE ATT&CK/CAPEC and Richards Heuer's 'Psychology of Intelligence Analysis' to eliminate cognitive bias. Extract IoCs with confidence.
4. COMPLIANCE AUDITOR: Map strictly to ISO/IEC 27001:2022 controls, NIST CSF 2.0 functions, and GDPR legal liability frameworks.
5. QUANT ECONOMETRICIAN: Calculate the strict Financial Blast Radius (FBR score 0.0 to 10.0) based on the FAIR Methodology (Information Risk Quantification).
6. INSIDER THREAT PARSER: Integrate Kevin Mitnick's 'The Art of Deception' paradigms. If the threat signal stems from an insider leak, misconfiguration, or employee cognitive vulnerability, reverse-engineer the behavioral mistake, flag employee psychological triggers (Fatigue, Over-Trust, Urgency, Authority), and output an actionable micro-training advisory.
7. WEAVER GRID: Synthesize everything. You MUST never use raw markdown characters (like '##' or '**') inside HTML content strings. Use clean HTML semantic tags (<h2>, <p>, <ul>, <li>, <table>, <tr>, <td>, <thead>, <th>, <tbody>).

COGNITIVE LAYER STORYTELLING CONVERSION (FOR THE EXECUTIVE BRIEF):
Structure the Executive Brief/narrative of the report as an elite Cyber Security News Wire that commands absolute psychological conversion in 20 seconds, structured across 4 unbypasable cognitive layers:
- Layer 1 (Logic/Mind): Slam the reader with undeniable, hyper-specific infrastructure realities and technical vectors (host components, transport protocols, partition behavior).
- Layer 2 (Survival/Fear): Framework the threat as an active, localized, and sector-specific immediate hunting campaign by the actor group.
- Layer 3 (Heart/Finance): Embed a clean HTML financial loss matrix proving the exact cost of operational downtime and extortion metrics.
- Layer 4 (Authority/Duty): Enforce regulatory and compliance terror by quoting exact legal liability, GDPR fine potentials, and ISO certification revocation risks.

ANTI-FUD VOCABULARY LAW (BANNED PHRASES):
You must write in a COLD, CORPORATE, and ANALYTICAL tone. Banned phrases include:
"unprecedented threat", "devastating attack", "game-changing", "catastrophic breach", "nightmare scenario", "apocalyptic", "terrifying", "alarming", "shocking discovery", "wake-up call", "ticking time bomb", "cyber armageddon", "cyber pearl harbor", "digital doomsday", "existential threat", "worst-case scenario", "in today's digital landscape", "in the ever-evolving world", "let's delve into", "it is important to note", "it's worth noting", "as a cybersecurity expert", "underscores the need for", "highlights the importance of", "a stark reminder", "sheds light on", "in conclusion", "to summarize", "as we have seen", "cannot be overstated", "it goes without saying", "needless to say", "of utmost importance", "plays a crucial role", "is a testament to", "serves as a reminder", "in an increasingly", "as cyber threats continue to", "as technology advances", "let's explore", "let us examine".

NO PLACEHOLDERS:
Under no circumstances output placeholders like 'Unknown' or '-' or null. If data is missing, calculate relative proximity values using our ground-truth library (infer from category/channel properties).

OUTPUT FORMAT:
Output MUST be a single JSON object (no markdown fences, no formatting other than valid JSON) containing the following fields:
{
  "title": "A concise, high-impact, professional CTI title",
  "teaser_text": "A high-impact, 40-word marketing headline and hook for the public FRONT PAGE.",
  "executive_summary": "HTML string containing the Executive Brief structured across the 4 cognitive layers.",
  "content": "HTML string containing the complete, 1500+ word detailed analysis report with Key Takeaways, Technical Deep-Dive, Compliance Analysis, and Defensive Engineering.",
  "category": "threat_intel | vulnerabilities | osint | tools",
  "severity": "Critical | High | Medium | Low | Informational",
  "mitre_attack_ttps": ["T1190 — Exploit Public-Facing Application", ...],
  "yara_rules": ["rule rule_name { ... }"],
  "sigma_rules": ["title: ..."],
  "snort_signatures": [],
  "iso_27001_controls": ["A.12.6.1", ...],
  "nist_csf_functions": ["PR.IP-1", ...],
  "gdpr_implications": "Detailed GDPR articles and compliance risk",
  "financial_exposure": "$500K - $2.0M range",
  "regulatory_risk": "NIS2 & GDPR fine exposures",
  "mitigation_impact": "Configuration audit ROI",
  "fbr_score": 5.5,
  "is_public_teaser": true,
  "cloudflare_waf_rules": "WAF block rules or JSON string config",
  "assessment_25_point": {
    "cve_vulnerability_mapping": "...",
    "cvss_vector_analysis": "...",
    "exploit_complexity_score": "...",
    "affected_software_hardware": "...",
    "infrastructure_dependency_depth": "...",
    "network_traversal_mechanics": "...",
    "threat_origin_forensics": "...",
    "iso_27001_compliance": "...",
    "nist_csf_alignment": "...",
    "gdpr_liability_check": "...",
    "regulatory_fine_exposure": "...",
    "nis2_impact_classification": "...",
    "compliance_risk_level": "...",
    "yara_signature_readiness": "...",
    "sigma_log_patterns": "...",
    "cloudflare_waf_rules": "...",
    "mitigation_playbook_difficulty": "...",
    "hunting_queries": "...",
    "insider_behavioral_remediation": "...",
    "financial_blast_radius": "...",
    "downtime_cost_exposure": "...",
    "breach_cost_exposure": "...",
    "sector_financial_multiplier": "...",
    "mitigation_roi_percentage": "...",
    "insurance_impact": "..."
  },
  "affected_sectors": ["Healthcare", ...],
  "cvss_v4_score": 8.0,
  "cvss_v4_vector": "CVSS:4.0/...",
  "source_reliability_grade": "A|B|C|D|E",
  "yara_rule": "rule rule_name { ... }",
  "ai_image_prompt": "Unsplash search keyword or image prompt"
}
"""

# ---------------------------------------------------------------------------
# Free-Tier Deduplication & Direct RAG Lookups
# ---------------------------------------------------------------------------

async def fetch_local_rag_context(session: aiohttp.ClientSession, query_text: str) -> str:
    """Fetch Top-3 grounded book segments from Supabase locally via FTS."""
    if not query_text or len(query_text.strip()) < 5:
        return ""

    # Clean the query for websearch FTS
    clean_query = re.sub(r"[^\w\s]", " ", query_text).strip()
    search_terms = " & ".join([w for w in clean_query.split() if len(w) > 2][:5])
    if not search_terms:
        return ""

    url = f"{SUPABASE_URL}/rest/v1/knowledge_embeddings"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Accept": "application/json",
    }

    # Query using websearch full-text search capability
    query_url = f"{url}?select=content&content=wfts.{search_terms}&limit=3"
    try:
        async with session.get(query_url, headers=headers, timeout=5) as resp:
            if resp.status == 200:
                data = await resp.json()
                if data:
                    segments = [d.get("content", "") for d in data if d.get("content")]
                    if segments:
                        return "\n\n[LOCAL RAG KNOWLEDGE REFERENCE]:\n" + "\n---\n".join(segments)
    except Exception as exc:
        log.warning("[LOCAL-RAG] Query failed: %s", exc)

    # Fallback to general chunks to ensure grounded reference structure
    try:
        fallback_url = f"{url}?select=content&limit=3"
        async with session.get(fallback_url, headers=headers, timeout=5) as resp:
            if resp.status == 200:
                data = await resp.json()
                if data:
                    segments = [d.get("content", "") for d in data if d.get("content")]
                    if segments:
                        return "\n\n[LOCAL RAG GROUND-TRUTH FALLBACK]:\n" + "\n---\n".join(segments)
    except Exception as exc:
        log.warning("[LOCAL-RAG] Fallback query failed: %s", exc)

    return ""


def clean_anti_fud_text(text: str) -> str:
    """Scrub banned phrases from the generated text and replace them with colder equivalents."""
    if not text:
        return ""
    for phrase in ANTI_FUD_BANNED_PHRASES:
        pattern = re.compile(re.escape(phrase), re.IGNORECASE)
        replacement = "critical concern"
        if phrase == "unprecedented threat":
            replacement = "identified anomaly"
        elif phrase == "devastating attack":
            replacement = "security incident"
        elif phrase == "game-changing":
            replacement = "notable"
        elif phrase == "catastrophic breach":
            replacement = "data exposure event"
        elif phrase == "worst-case scenario":
            replacement = "upper boundary condition"
        elif phrase in ["let's delve into", "let's explore", "let us examine", "let's examine"]:
            replacement = "analysis indicates"
        elif phrase in ["it is important to note", "it's worth noting", "cannot be overstated"]:
            replacement = "specifically"
        elif phrase in ["highlights the importance of", "underscores the need for"]:
            replacement = "necessitates"
        elif phrase == "a stark reminder":
            replacement = "illustrative case"
        elif phrase == "in conclusion":
            replacement = "remediation actions require"
        
        text = pattern.sub(replacement, text)
    return text


def parse_master_response(llm_output: str) -> ExecutiveSITREP | None:
    """Parse JSON block, clean Anti-FUD violations, and validate against contract schema."""
    try:
        start_idx = llm_output.find('{')
        end_idx = llm_output.rfind('}')
        if start_idx != -1 and end_idx != -1:
            cleaned_json = llm_output[start_idx:end_idx+1]
        else:
            cleaned_json = llm_output.strip()
            
        parsed = json.loads(cleaned_json)
    except Exception as exc:
        log.error("Failed to decode Master Agent JSON: %s", exc)
        return None

    if not parsed.get("title"):
        log.warning("Parsed JSON is missing a title.")
        return None

    # Clean FUD phrases inside text structures
    for field in ["title", "executive_summary", "content", "teaser_text"]:
        val = parsed.get(field)
        if isinstance(val, str):
            parsed[field] = clean_anti_fud_text(val)

    # Clean 25-point assessment values
    assessment = parsed.get("assessment_25_point")
    if isinstance(assessment, dict):
        for k, v in assessment.items():
            if isinstance(v, str):
                assessment[k] = clean_anti_fud_text(v)
        parsed["assessment_25_point"] = assessment

    # Normalize properties
    cat = parsed.get("category") or "threat_intel"
    parsed["category"] = ExecutiveSITREP.validate_category(cat)

    sev = parsed.get("severity") or "Medium"
    parsed["severity"] = ExecutiveSITREP.validate_severity(sev)

    # Synthesize fallback YARA rule if missing
    if not parsed.get("yara_rule") or parsed.get("yara_rule") == "None":
        cleaned_title = re.sub(r'[^a-zA-Z0-9]', '_', parsed["title"])
        yara_name = f"zayron_{cleaned_title.lower()}_auto"
        parsed["yara_rule"] = (
            f"rule {yara_name} {{\n"
            f"    meta:\n"
            f"        author = \"ZAYRON-X Auto-Generator\"\n"
            f"        severity = \"{parsed['severity']}\"\n"
            f"    strings:\n"
            f"        $s1 = \"{yara_name}\"\n"
            f"    condition:\n"
            f"        any of them\n"
            f"}}"
        )
    if not parsed.get("yara_rules"):
        parsed["yara_rules"] = [parsed["yara_rule"]]

    try:
        sitrep = ExecutiveSITREP(
            title=parsed.get("title", ""),
            executive_summary=parsed.get("executive_summary", ""),
            content=parsed.get("premium_payload") or parsed.get("content") or "",
            teaser_text=parsed.get("teaser_text"),
            is_public_teaser=parsed.get("is_public_teaser", True),
            category=parsed["category"],
            severity=parsed["severity"],
            mitre_attack_ttps=parsed.get("mitre_attack_ttps", []),
            yara_rules=parsed.get("yara_rules", []),
            sigma_rules=parsed.get("sigma_rules", []),
            snort_signatures=parsed.get("snort_signatures", []),
            iocs=parsed.get("iocs", []),
            iso_27001_controls=parsed.get("iso_27001_controls", []),
            nist_csf_functions=parsed.get("nist_csf_functions", []),
            gdpr_implications=parsed.get("gdpr_implications"),
            financial_exposure=parsed.get("financial_exposure"),
            regulatory_risk=parsed.get("regulatory_risk"),
            mitigation_impact=parsed.get("mitigation_impact"),
            fbr_score=parsed.get("fbr_score", 0.0),
            affected_sectors=parsed.get("affected_sectors", ["Technology"]),
            cvss_v4_score=parsed.get("cvss_v4_score"),
            cvss_v4_vector=parsed.get("cvss_v4_vector"),
            source_reliability_grade=parsed.get("source_reliability_grade", "C"),
            yara_rule=parsed.get("yara_rule"),
            ai_image_prompt=parsed.get("ai_image_prompt"),
            cloudflare_waf_rules=parsed.get("cloudflare_waf_rules"),
            assessment_25_point=parsed.get("assessment_25_point"),
            anti_fud_passed=True,
        )
        return sitrep
    except Exception as exc:
        log.error("ExecutiveSITREP Pydantic validation failed: %s", exc)
        return None

# ---------------------------------------------------------------------------
# API Engine Client
# ---------------------------------------------------------------------------

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
        max_output_tokens: int = 8192,
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
                        
                        # Add structural API spacing delay to clear flash limits
                        await asyncio.sleep(5.0)
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

# ---------------------------------------------------------------------------
# Consolidated Master Swarm Scheduler
# ---------------------------------------------------------------------------

async def master_crew_scheduler(client: GeminiClient) -> None:
    log.info("Started Master Swarm Scheduler (3-Minute Paced Queue)")
    seen_hashes: set[str] = set()

    while True:
        loop_start = time.time()
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=45)) as session:
            # 1. Fetch & atomically claim exactly 1 pending feed of any type
            feeds = await claim_pending_feeds(session, limit=1)
            if not feeds:
                log.debug("No pending feeds. Waiting 10 seconds...")
                await asyncio.sleep(10)
                continue

            feed = feeds[0]
            feed_id = feed.get("id")
            raw_content = feed.get("raw_content", "")
            source = feed.get("source_channel", "unknown")

            log.info("Processing Feed ID: %s (source: %s)", feed_id, source)

            # 2. Local Python Filtering & Noise Deduplication
            cleaned_content = raw_content.strip()
            if not cleaned_content or len(cleaned_content) < 20:
                log.info("Feed %s classified as noise (length %d < 20). Skipping LLM.", feed_id, len(cleaned_content))
                await mark_feed_status(session, feed_id, "crew_ignored")
                continue

            # In-memory deduplication check
            url_hash = hashlib.sha256(cleaned_content.encode("utf-8")).hexdigest()
            if url_hash in seen_hashes:
                log.info("Feed %s is a duplicate (in-memory match). Skipping LLM.", feed_id)
                await mark_feed_status(session, feed_id, "crew_ignored")
                continue

            # Database duplicate check
            db_check_url = f"{SUPABASE_URL}/rest/v1/articles?url_hash=eq.{url_hash}&select=id"
            headers = {
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Accept": "application/json",
            }
            is_dup = False
            try:
                async with session.get(db_check_url, headers=headers, timeout=5) as check_resp:
                    if check_resp.status == 200:
                        rows = await check_resp.json()
                        if rows:
                            is_dup = True
            except Exception as exc:
                log.warning("Database duplicate check failed: %s. Continuing...", exc)

            if is_dup:
                log.info("Feed %s is a duplicate (database match). Skipping LLM.", feed_id)
                seen_hashes.add(url_hash)
                await mark_feed_status(session, feed_id, "crew_ignored")
                continue

            seen_hashes.add(url_hash)

            # 3. Fetch Local RAG context directly from Supabase
            rag_context = await fetch_local_rag_context(session, raw_content[:500])

            # 4. Quota gate: check Redis ledger before consuming a Gemini request.
            # This survives container restarts — counter is stored in Upstash, not RAM.
            daily_count = await asyncio.to_thread(quota_get_today)
            if daily_count >= DAILY_REQUEST_LIMIT:
                log.warning(
                    "[QUOTA-LEDGER] Daily limit reached (%d/%d). Backing off 30 minutes.",
                    daily_count, DAILY_REQUEST_LIMIT,
                )
                await mark_feed_status(session, feed_id, "pending")  # Release the claim
                await asyncio.sleep(1800)  # 30-minute backoff
                continue

            # 5. Master Agent Single-Pass LLM Call
            log.info("Invoking single Consolidated Master Agent... [Quota: %d/%d]", daily_count, DAILY_REQUEST_LIMIT)
            sys_prompt = MASTER_INTELLIGENCE_PROMPT + rag_context
            user_msg = (
                f"SOURCE CHANNEL: {source}\n"
                f"RAW THREAT telemetry:\n{raw_content}\n\n"
                f"Execute full 7-agent consolidated analysis. Output strict JSON only."
            )

            sitrep = None
            token_tracker = {"prompt": 0, "completion": 0}

            try:
                llm_out, p, c = await client.generate(
                    GEMINI_PRO_MODEL,
                    sys_prompt,
                    user_msg,
                    max_output_tokens=8192,
                    temperature=0.2
                )
                token_tracker["prompt"] += p
                token_tracker["completion"] += c

                # Increment the persistent daily quota counter after a successful API call.
                new_total = await asyncio.to_thread(quota_increment)
                log.info("[QUOTA-LEDGER] Daily inference count: %d/%d", new_total, DAILY_REQUEST_LIMIT)

                # Parse and clean output
                sitrep = parse_master_response(llm_out)

            except Exception as exc:
                log.error("Consolidated Master Inference failed: %s", exc)
                await mark_feed_status(session, feed_id, "crew_failed")
                await asyncio.sleep(5)
                continue

            if sitrep is None:
                log.warning("Master Agent returned invalid or unparseable payload. Marking failed.")
                await mark_feed_status(session, feed_id, "crew_failed")
                continue

            # 5. Persist SITREP & Mark Feed status
            success = await persist_sitrep(session, sitrep, raw_content, source_channel=source)
            if success:
                log.info("Successfully persisted Master intelligence report: %s", sitrep.title)
                await mark_feed_status(
                    session, feed_id, "crew_promoted",
                    analysis=sitrep.executive_summary[:500],
                    translated_title=sitrep.title,
                    translated_content=sitrep.content[:2000],
                    category=sitrep.category,
                    prompt_tokens=token_tracker["prompt"],
                    completion_tokens=token_tracker["completion"],
                    promoted_at=utc_now_iso()
                )
                await trigger_revalidation(session)
            else:
                log.error("Failed to persist Master intelligence report to database.")
                await mark_feed_status(session, feed_id, "persist_failed")

            # 6. Pacing sleep: enforce exactly 180 seconds per LLM request
            elapsed = time.time() - loop_start
            remaining = max(0.0, 180.0 - elapsed)
            log.info("Master analysis complete. Pacing sleep: waiting %.1f seconds...", remaining)
            await asyncio.sleep(remaining)


async def main_loop() -> None:
    log.info("Starting ZAYRON-X Consolidated Intelligence Master Crew")
    config_errors = validate_config()
    if config_errors:
        for err in config_errors:
            log.critical("CONFIG ERROR: %s", err)
        sys.exit(1)

    client = GeminiClient(api_key=GEMINI_API_KEY)

    # WARN-14 Remediation: Run stale-claim watchdog on every container boot.
    # Reverts any raw_feeds rows stuck in 'processing_crew' > 10 minutes
    # back to 'pending', clearing zombie entries from prior OOM kills.
    log.info("[WATCHDOG] Running stale-claim recovery sweep...")
    try:
        async with aiohttp.ClientSession() as _session:
            watchdog_url = f"{SUPABASE_URL}/rest/v1/rpc/revert_stale_crew_claims"
            watchdog_headers = {
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
            }
            async with _session.post(
                watchdog_url,
                headers=watchdog_headers,
                json={"stale_threshold_minutes": 10},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status in (200, 204):
                    reverted = await resp.json()
                    count = len(reverted) if isinstance(reverted, list) else 0
                    if count:
                        log.warning("[WATCHDOG] Reverted %d stale 'processing_crew' feeds to 'pending'.", count)
                    else:
                        log.info("[WATCHDOG] No stale claims found. Queue is clean.")
                else:
                    body = await resp.text()
                    log.warning("[WATCHDOG] RPC call returned HTTP %d: %s", resp.status, body[:200])
    except Exception as exc:
        log.warning("[WATCHDOG] Stale-claim sweep failed (non-fatal): %s", exc)

    # Run the central master scheduler
    await master_crew_scheduler(client)


def main() -> None:
    asyncio.run(main_loop())


if __name__ == "__main__":
    main()
