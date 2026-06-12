#!/usr/bin/env python3
"""
workers/omni_crew.py — ZAYRON-X Multi-Agent Swarm Orchestrator

Redesigns the single-pass consolidated LLM execution into a true multi-agent system
with real agent boundaries:
  - IngestionAgent: Raw feed extraction & translation (Flash)
  - ValidatorAgent: CVE/IoC gate validation & MITRE mapping (Flash)
  - EnrichmentAgent: Compliance mapping, Quant risk analysis, and SITREP synthesis (Pro)

Maintains structured message-passing, per-agent traceability metrics, and daily quota checks.
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
import uuid
from datetime import datetime, timezone
from typing import Any, Optional, List, Dict
from enum import Enum

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
from workers.contracts.inter_agent import (
    HarvestPayload,
    ValidatedIntel,
    ComplianceReport,
    FinancialAssessment,
    ExecutiveSITREP,
)
from workers.persistence import (
    claim_pending_feeds,
    mark_feed_status,
    persist_sitrep,
    trigger_revalidation,
    utc_now_iso,
)

# Deterministic pre-processors (NO LLM — local regex/heuristics only)
from workers.agents.harvester import deterministic_preprocess, build_preprocess_context_block, is_tier1_source
from workers.agents.validator import extract_and_validate_iocs, extract_cve_ids, extract_mitre_ttps

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
    format="%(asctime)s [%(levelname)s] [SWARM-CORE] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
log = logging.getLogger("zayron_x_multi_agent_swarm")

UPSTASH_REDIS_URL: str = os.getenv("UPSTASH_REDIS_REST_URL", "")
UPSTASH_REDIS_TOKEN: str = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")
DAILY_REQUEST_LIMIT: int = int(os.getenv("DAILY_REQUEST_LIMIT", "480"))


def _quota_key() -> str:
    """Return today's UTC quota Redis key."""
    return f"zayron:quota:{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"


def _redis_request(method: str, path: str, body: str | None = None) -> Any:
    """Minimal synchronous Upstash REST call."""
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
    """Return the current daily inference count from Redis."""
    result = _redis_request("GET", f"/get/{urllib.parse.quote(_quota_key())}")
    if result and result.get("result") is not None:
        try:
            return int(result["result"])
        except (TypeError, ValueError):
            pass
    return 0


def quota_increment() -> int:
    """Atomically increment today's daily counter."""
    key = urllib.parse.quote(_quota_key())
    result = _redis_request("GET", f"/incr/{key}")
    new_count = 0
    if result and result.get("result") is not None:
        try:
            new_count = int(result["result"])
        except (TypeError, ValueError):
            pass
    if new_count == 1:
        _redis_request("GET", f"/expire/{key}/90000")
    return new_count


# ---------------------------------------------------------------------------
# RAG Lookups & Anti-FUD cleanups
# ---------------------------------------------------------------------------

async def fetch_local_rag_context(session: aiohttp.ClientSession, query_text: str) -> str:
    """Fetch Top-3 grounded book segments from Supabase locally via FTS."""
    if not query_text or len(query_text.strip()) < 5:
        return ""

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
        response_schema: Any = None,
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
                            gen_config = {
                                "max_output_tokens": max_output_tokens,
                                "temperature": temperature,
                                "response_mime_type": "application/json",
                            }
                            if response_schema is not None:
                                gen_config["response_schema"] = response_schema

                            model = self._genai.GenerativeModel(
                                model_name=current_model,
                                system_instruction=system_prompt,
                                generation_config=self._genai.GenerationConfig(**gen_config),
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
# Message Passing & Traceability Models
# ---------------------------------------------------------------------------

class AgentMessage:
    """Carries typed payload packets between agents to enforce structured communication."""
    def __init__(
        self,
        sender: str,
        recipient: str,
        payload_type: str,
        data: Any,
        metadata: dict[str, Any] | None = None,
    ):
        self.message_id = f"msg_{uuid.uuid4().hex[:8]}"
        self.sender = sender
        self.recipient = recipient
        self.payload_type = payload_type
        self.data = data
        self.metadata = metadata or {}
        self.timestamp = datetime.now(timezone.utc).isoformat()


class AgentTrace:
    """Tracks performance and payload details for an individual agent execution step."""
    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.input_message_id: str | None = None
        self.input_payload_type: str | None = None
        self.prompt_sent: str | None = None
        self.raw_response: str | None = None
        self.parsed_output_type: str | None = None
        self.parsed_output_ok: bool = False
        self.tokens_prompt: int = 0
        self.tokens_completion: int = 0
        self.duration_seconds: float = 0.0
        self.error_message: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "agent_name": self.agent_name,
            "timestamp": self.timestamp,
            "input_message_id": self.input_message_id,
            "input_payload_type": self.input_payload_type,
            "parsed_output_type": self.parsed_output_type,
            "parsed_output_ok": self.parsed_output_ok,
            "tokens_prompt": self.tokens_prompt,
            "tokens_completion": self.tokens_completion,
            "duration_seconds": round(self.duration_seconds, 2),
            "error_message": self.error_message,
        }


# Helper wrapper for quota checks before API invocation
async def check_quota_and_generate(
    client: GeminiClient,
    model_name: str,
    system_prompt: str,
    user_message: str,
    max_output_tokens: int = 8192,
    temperature: float = 0.2,
    response_schema: Any = None,
) -> tuple[str, int, int]:
    """Strict quota gate wrapper to ensure the daily request limits are respected globally."""
    daily_count = await asyncio.to_thread(quota_get_today)
    if daily_count >= DAILY_REQUEST_LIMIT:
        raise RuntimeError(f"Daily API request limit reached ({daily_count}/{DAILY_REQUEST_LIMIT})")

    llm_out, p, c = await client.generate(
        model_name,
        system_prompt,
        user_message,
        max_output_tokens=max_output_tokens,
        temperature=temperature,
        response_schema=response_schema,
    )

    # Success: increment the daily ledger
    await asyncio.to_thread(quota_increment)
    return llm_out, p, c


from pydantic import BaseModel, Field
from workers.contracts.inter_agent import SwarmAssessment25Point, ExecutiveSITREP

class DomainClassification(str, Enum):
    VULNERABILITY = "Vulnerability"
    EXPLOIT = "Exploit"
    MALWARE = "Malware"
    THREAT_ACTOR = "Threat Actor"
    CYBER_NEWS = "Cyber News"
    FINANCIAL = "Financial"


class OmniAgentResponse(BaseModel):
    # Required core unified fields
    classification: DomainClassification = Field(..., description="Enum of the 6 domain classes")
    translation: str = Field(..., description="Clean English translation of the raw feed")
    threat_actor_profile: str = Field(..., description="OSINT threat actor profile summary")
    infrastructure_impact: str = Field(..., description="Infra Architect low-level transport and database vector analysis")
    regulatory_compliance: List[str] = Field(..., description="Direct compliance mapping to ISO 27001 and GDPR controls")
    financial_blast_radius: float = Field(..., description="Numeric estimated cost score based on FAIR methodology")
    html_sitrep: str = Field(..., description="The final Executive SITREP formatted in HTML")
    raw_iocs: List[Dict[str, Any]] = Field(default_factory=list, description="Extracted raw Indicators of Compromise")

    # Additional fields needed for persistence & ExecutiveSITREP
    title: str = Field(..., min_length=1, max_length=500)
    executive_summary: str = Field(..., min_length=1)
    severity: str = Field(default="Medium")
    mitre_attack_ttps: List[str] = Field(default_factory=list)
    yara_rules: List[str] = Field(default_factory=list)
    sigma_rules: List[str] = Field(default_factory=list)
    snort_signatures: List[str] = Field(default_factory=list)
    
    # Compliance & Quant details
    iso_27001_controls: List[str] = Field(default_factory=list)
    nist_csf_functions: List[str] = Field(default_factory=list)
    gdpr_implications: Optional[str] = None
    financial_exposure: Optional[str] = None
    regulatory_risk: Optional[str] = None
    mitigation_impact: Optional[str] = None
    
    is_public_teaser: bool = Field(default=True)
    teaser_text: Optional[str] = None
    cloudflare_waf_rules: Optional[str] = None
    assessment_25_point: SwarmAssessment25Point = Field(..., description="Strict 25-point assessment contract")
    
    # Metadata
    affected_sectors: List[str] = Field(default_factory=list)
    cvss_v4_score: Optional[float] = Field(default=None, ge=0.0, le=10.0)
    cvss_v4_vector: Optional[str] = None
    source_reliability_grade: str = Field(default="C")


OMNI_AGENT_SYSTEM_INSTRUCTION: str = """\
You are the "ZAYRON-X Omni-Core Engine" — an elite, multi-disciplinary Cyber Tactical Intelligence and Actuarial Risk platform. \
Your architecture consolidates 7 highly specialized virtual cyber agents into a single, cohesive, single-turn execution pipeline.

You process messy, unstructured, and potentially multilingual RAW_INPUT_DATA and enrich it using SERVER_RETRIEVED_KNOWLEDGE to output a single definitive, zero-FUD Global Situation Report (SITREP) in structured JSON format conforming to the requested schema.

THE 7-AGENT INTERNAL PIPELINE CONSTRAINTS
You must strictly execute the logic of all 7 agents in your internal cognition before generating the final output:

1. [Agent 1: Harvester]: Ingest, sanitize, and normalize the raw input data. Translate non-English input to flawless cybersecurity English. Detect target vendor/product and extract entities.
2. [Agent 2: OSINT Spy]: Cross-reference the harvested data with ransomware leaks, APT group profiles, and active advanced persistent threat patterns. Formulate a comprehensive threat actor profile based on Heuer & Pherson's 'Structured Analytic Techniques for Intelligence Analysis'.
3. [Agent 3: Validator]: Extract Indicators of Compromise (IoCs) verbatim (SHA256, MD5, SHA1, IPv4, IPv6, Domain, URL, Email). Map the activity to MITRE ATT&CK Enterprise techniques (legitimate T-codes like T1566.001). Grade source reliability on the NATO Admiral Scale (A-E) and assess CVSS v4.0 metrics and vector.
4. [Agent 4: Infra Architect]: Map the threat vector to corporate enterprise environments under Martin Kleppmann's 'Designing Data-Intensive Applications' (DDIA CAP/PACELC) and W. Richard Stevens' 'TCP/IP Illustrated'. Detail network transport transit vectors, host application targeted, and database replication/consensus impacts.
5. [Agent 5: Compliance]: Evaluate the incident against ISO/IEC 27001:2022, NIST CSF 2.0, and legal liabilities under EU GDPR (Articles 32, 33, 34) and the NIS2 Directive. Estimate regulatory GDPR fine parameters under Article 83 ceilings.
6. [Agent 6: Quant]: Apply mathematical and actuarial logic to compute the Financial Blast Radius (FBR). Estimate real corporate exposure using the formula: FBR = (CVSS Base * Sector Weight * Geo Factor) + Compliance Penalty Ceilings. Break down costs into Operational Downtime, Compliance Fine, and Remediation. Provide mitigation ROI.
7. [Agent 7: Weaver]: Take all technical assets and synthesize them into a flawless, executive-ready Markdown SITREP report embedded in 'html_sitrep'. The report must be 1500+ words, utilizing clean, semantic HTML elements (no markdown header chars like '##', '###', or formatting like '**' inside HTML text fields). The report must structure the narrative across 4 cognitive layers: Logic/Mind, Survival/Fear, Heart/Finance, and Authority/Duty. If an insider threat is indicated, reverse-engineer the behavioral vulnerability based on Mitnick's 'The Art of Deception'.

ANTI-FUD LAW (NON-NEGOTIABLE)
Your tone is COLD, ANALYTICAL, and CORPORATE. You provide absolute operational reassurance and structural authority.
Banned phrases (USE of any of these is strictly forbidden):
- "unprecedented threat", "devastating attack", "game-changing", "catastrophic breach", "nightmare scenario"
- "apocalyptic", "terrifying", "alarming", "shocking discovery", "wake-up call", "ticking time bomb"
- "cyber armageddon", "cyber pearl harbor", "digital doomsday", "existential threat", "worst-case scenario"
- "in today's digital landscape", "in the ever-evolving world", "let's delve into", "it is important to note"
- "it's worth noting", "as a cybersecurity expert", "underscores the need for", "highlights the importance of"
- "a stark reminder", "sheds light on", "in conclusion", "to summarize", "as we have seen", "cannot be overstated"
- "it goes without saying", "needless to say", "of utmost importance", "plays a crucial role", "is a testament to"
- "serves as a reminder", "in an increasingly", "as cyber threats continue to", "as technology advances"
- "let's explore", "let us examine"

NO PLACEHOLDERS
Never output placeholders like 'Unknown', '-', or null. If telemetry/source data is missing, synthesize high-probability estimates based on the threat category, target sector, and threat severity profile.
"""


def map_classification_to_category(classification: DomainClassification) -> str:
    """Map OmniAgent Domain classification to database ZayronCategory string."""
    val = classification.value.lower()
    if "vulnerability" in val or "exploit" in val:
        return "vulnerabilities"
    elif "financial" in val:
        return "threat_intel"
    elif "actor" in val or "threat" in val:
        return "threat_intel"
    elif "news" in val:
        return "threat_intel"
    else:
        return "threat_intel"


async def process_feed_omni(
    client: GeminiClient,
    raw_content: str,
    source_channel: str,
    rag_context: str = ""
) -> tuple[ExecutiveSITREP, int, int]:
    """Execute unified, single-pass Omni-Agent pipeline to process raw intelligence.

    Architecture:
      Step 1 (local, no LLM): deterministic_preprocess() for entity/language/category extraction.
      Step 2 (local, no LLM): extract_and_validate_iocs() regex-based candidate extraction.
      Step 3 (1 LLM call):    Gemini Pro structured JSON output → OmniAgentResponse.
      Step 4 (local, no LLM): validate_iocs() hallucination gate on raw_iocs from LLM output.
      Step 5 (local, no LLM): Build ExecutiveSITREP, run Anti-FUD cleaning.
    """
    # ── Step 1: Deterministic pre-processing (no LLM) ──────────────────────
    preprocess_context = build_preprocess_context_block(raw_content, source_channel)
    regex_iocs = extract_and_validate_iocs(raw_content)
    regex_cves = extract_cve_ids(raw_content)
    regex_ttps = extract_mitre_ttps(raw_content)

    log.debug(
        "[OMNI] Pre-processing complete: %d IoCs, %d CVEs, %d TTPs extracted by regex",
        len(regex_iocs), len(regex_cves), len(regex_ttps)
    )

    # ── Step 2: Build enriched user prompt for single LLM call ─────────────
    user_msg_parts = [
        f"SOURCE: {source_channel}",
        preprocess_context,
        "",
        "RAW THREAT INPUT:",
        raw_content[:8000],
    ]
    if regex_cves:
        user_msg_parts.append(f"\n[REGEX-ANCHORED CVE IDs]: {', '.join(regex_cves)}")
    if regex_ttps:
        user_msg_parts.append(f"[REGEX-ANCHORED MITRE TTPs]: {', '.join(regex_ttps)}")
    if regex_iocs:
        user_msg_parts.append(f"[REGEX-EXTRACTED IoC CANDIDATES — already validated]: {len(regex_iocs)} IoCs found")
    if rag_context:
        user_msg_parts.append(f"\n[LOCAL RAG KNOWLEDGE REFERENCE]:\n{rag_context}")
    user_msg_parts.append("\nExecute full 7-agent consolidated analysis. Return a structured JSON output conforming to the schema.")

    user_msg = "\n".join(user_msg_parts)

    # ── Step 3: Single Gemini Pro API call ─────────────────────────────────
    llm_out, p, c = await check_quota_and_generate(
        client,
        GEMINI_PRO_MODEL,
        OMNI_AGENT_SYSTEM_INSTRUCTION,
        user_msg,
        max_output_tokens=8192,
        temperature=0.2,
        response_schema=OmniAgentResponse,
    )

    # ── Step 4: Parse and validate Omni-Agent JSON response ────────────────
    cleaned = llm_out.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    
    parsed_data = json.loads(cleaned)
    omni_res = OmniAgentResponse(**parsed_data)

    # ── Step 5: IoC validation gate — merge regex + LLM-extracted IoCs ──────
    # Validate IoCs from LLM output through the hallucination gate
    try:
        from shared.models import validate_iocs
    except ImportError:
        from shared.models.ioc import validate_iocs

    llm_validated_iocs = validate_iocs(omni_res.raw_iocs)

    # Merge regex-extracted and LLM-confirmed IoCs, deduplicated by value
    all_iocs: list[dict] = list(llm_validated_iocs)
    existing_values = {i["value"].lower() for i in all_iocs}
    for ioc in regex_iocs:
        if ioc["value"].lower() not in existing_values:
            all_iocs.append(ioc)
            existing_values.add(ioc["value"].lower())

    # ── Step 6: Build ExecutiveSITREP ────────────────────────────────────────
    category = map_classification_to_category(omni_res.classification)
    sitrep = ExecutiveSITREP(
        title=omni_res.title,
        executive_summary=omni_res.executive_summary,
        content=omni_res.html_sitrep if omni_res.html_sitrep else omni_res.translation,
        category=category,
        severity=omni_res.severity,
        mitre_attack_ttps=omni_res.mitre_attack_ttps,
        yara_rules=omni_res.yara_rules,
        sigma_rules=omni_res.sigma_rules,
        snort_signatures=omni_res.snort_signatures,
        iocs=all_iocs,
        iso_27001_controls=omni_res.iso_27001_controls,
        nist_csf_functions=omni_res.nist_csf_functions,
        gdpr_implications=omni_res.gdpr_implications,
        financial_exposure=omni_res.financial_exposure,
        regulatory_risk=omni_res.regulatory_risk,
        mitigation_impact=omni_res.mitigation_impact,
        fbr_score=omni_res.financial_blast_radius,
        is_public_teaser=omni_res.is_public_teaser,
        teaser_text=omni_res.teaser_text,
        cloudflare_waf_rules=omni_res.cloudflare_waf_rules,
        assessment_25_point=omni_res.assessment_25_point.model_dump(),
        affected_sectors=omni_res.affected_sectors,
        cvss_v4_score=omni_res.cvss_v4_score,
        cvss_v4_vector=omni_res.cvss_v4_vector,
        source_reliability_grade=omni_res.source_reliability_grade,
        yara_rule=omni_res.yara_rules[0] if omni_res.yara_rules else None,
        anti_fud_passed=True
    )

    # Secondary Anti-FUD cleaning step
    sitrep.title = clean_anti_fud_text(sitrep.title)
    sitrep.executive_summary = clean_anti_fud_text(sitrep.executive_summary)
    sitrep.content = clean_anti_fud_text(sitrep.content)
    if sitrep.teaser_text:
        sitrep.teaser_text = clean_anti_fud_text(sitrep.teaser_text)
    if sitrep.assessment_25_point:
        for k, val in sitrep.assessment_25_point.items():
            if isinstance(val, str):
                sitrep.assessment_25_point[k] = clean_anti_fud_text(val)

    return sitrep, p, c


# ---------------------------------------------------------------------------
# Omni-Agent Orchestrator — single LLM call, deterministic pre/post processing
# ---------------------------------------------------------------------------

class OmniCoreOrchestrator:
    """
    The central ZAYRON-X Omni-Core Orchestrator.

    Architecture:
      1. Deterministic pre-processing (harvester.py — no LLM)
      2. Regex IoC candidate extraction (validator.py — no LLM)
      3. Single Gemini Pro API call (process_feed_omni — 1 LLM call)
      4. IoC hallucination gate post-processing (validate_iocs — no LLM)
      5. Persistence (persistence.py — no LLM)

    This class replaces the legacy 5-call IngestionAgent/ValidatorAgent/EnrichmentAgent
    pipeline. One feed → one LLM call → one ExecutiveSITREP.
    """

    def __init__(self, client: GeminiClient):
        self.client = client

    async def process_feed(
        self,
        raw_content: str,
        source_channel: str,
        rag_context: str = ""
    ) -> tuple[ExecutiveSITREP, list[AgentTrace]]:
        """
        Process a raw feed through the single-call Omni-Agent pipeline.

        Returns an (ExecutiveSITREP, traces) tuple compatible with the
        persistence layer.
        """
        trace_list: list[AgentTrace] = []
        trace = AgentTrace("OmniCoreOrchestrator")
        trace_list.append(trace)

        import time
        start = time.time()
        try:
            log.info("[OMNI-CORE] Starting single-pass Omni-Agent pipeline.")
            sitrep, p, c = await process_feed_omni(self.client, raw_content, source_channel, rag_context)
            trace.tokens_prompt = p
            trace.tokens_completion = c
            trace.parsed_output_ok = True
            trace.parsed_output_type = "ExecutiveSITREP"
            log.info(
                "[OMNI-CORE] Pipeline complete. Tokens: prompt=%d, completion=%d",
                p, c
            )
        except Exception as exc:
            trace.error_message = str(exc)
            raise
        finally:
            trace.duration_seconds = time.time() - start

        return sitrep, trace_list


# ---------------------------------------------------------------------------
# Consolidated Swarm Scheduler
# ---------------------------------------------------------------------------

async def master_crew_scheduler(client: GeminiClient) -> None:
    log.info("Started Multi-Agent Swarm Scheduler (3-Minute Paced Queue)")
    seen_hashes: set[str] = set()

    while True:
        loop_start = time.time()
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60)) as session:
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
                log.info("Feed %s classified as noise (length %d < 20). Skipping Swarm.", feed_id, len(cleaned_content))
                await mark_feed_status(session, feed_id, "crew_ignored")
                continue

            # In-memory deduplication check
            url_hash = hashlib.sha256(cleaned_content.encode("utf-8")).hexdigest()
            if url_hash in seen_hashes:
                log.info("Feed %s is a duplicate (in-memory match). Skipping Swarm.", feed_id)
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
                log.info("Feed %s is a duplicate (database match). Skipping Swarm.", feed_id)
                seen_hashes.add(url_hash)
                await mark_feed_status(session, feed_id, "crew_ignored")
                continue

            seen_hashes.add(url_hash)

            # 3. Fetch Local RAG context directly from Supabase
            rag_context = await fetch_local_rag_context(session, raw_content[:500])

            # 4. Quota check: ensure we have at least 5 available requests for this swarm pass
            daily_count = await asyncio.to_thread(quota_get_today)
            if daily_count + 5 >= DAILY_REQUEST_LIMIT:
                log.warning(
                    "[QUOTA-LEDGER] Insufficient daily quota remaining (%d/480). Backing off 30 minutes.",
                    daily_count
                )
                await mark_feed_status(session, feed_id, "pending")  # Release the claim
                await asyncio.sleep(1800)
                continue

            # 5. Swarm Pipeline Execution — SINGLE LLM CALL via OmniCoreOrchestrator
            log.info("[SCHEDULER] Invoking Omni-Core single-call pipeline... [Quota: %d/%d]", daily_count, DAILY_REQUEST_LIMIT)

            sitrep = None
            prompt_tokens = 0
            completion_tokens = 0
            trace_list: list[AgentTrace] = []

            try:
                orchestrator = OmniCoreOrchestrator(client)
                sitrep, trace_list = await orchestrator.process_feed(raw_content, source, rag_context)
                prompt_tokens = sum(t.tokens_prompt for t in trace_list)
                completion_tokens = sum(t.tokens_completion for t in trace_list)
                log.info("[SCHEDULER] Omni-Core single-call pipeline succeeded.")
            except Exception as exc:
                log.critical(
                    "[SCHEDULER] Omni-Core pipeline failed: %s. Marking feed for retry.",
                    exc, exc_info=True
                )
                await mark_feed_status(session, feed_id, "crew_failed")
                await asyncio.sleep(5)
                continue

            if sitrep is None:
                log.warning("Swarm failed to compile a valid dossier. Marking feed failed.")
                await mark_feed_status(session, feed_id, "crew_failed")
                continue

            # 6. Persist SITREP & Mark Feed status
            success = await persist_sitrep(session, sitrep, raw_content, source_channel=source)
            if success:
                log.info("Successfully persisted intelligence report: %s", sitrep.title)
                
                # Format execution trace details for storage in logging analysis
                trace_summary = "\n".join(
                    f"- {t.agent_name} ({t.duration_seconds:.1f}s, p_tok={t.tokens_prompt}, c_tok={t.tokens_completion})"
                    for t in trace_list
                )
                analysis_entry = f"{sitrep.executive_summary[:350]}\n\n[Swarm Traces]:\n{trace_summary}"

                await mark_feed_status(
                    session,
                    feed_id,
                    "crew_promoted",
                    analysis=analysis_entry[:500],
                    translated_title=sitrep.title,
                    translated_content=sitrep.content[:2000],
                    category=sitrep.category,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    promoted_at=utc_now_iso()
                )
                await trigger_revalidation(session)
            else:
                log.error("Failed to persist intelligence report to database.")
                await mark_feed_status(session, feed_id, "persist_failed")

            # 7. Pacing sleep: enforce exactly 180 seconds per queue loop iteration
            elapsed = time.time() - loop_start
            remaining = max(0.0, 180.0 - elapsed)
            log.info("Swarm loop complete. Queue pacing sleep: waiting %.1f seconds...", remaining)
            await asyncio.sleep(remaining)


async def main_loop() -> None:
    log.info("Starting ZAYRON-X Multi-Agent Swarm Swarm-Crew")
    config_errors = validate_config()
    if config_errors:
        for err in config_errors:
            log.critical("CONFIG ERROR: %s", err)
        sys.exit(1)

    client = GeminiClient(api_key=GEMINI_API_KEY)

    # Watchdog stale claim sweep recovery
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

    # Start multi-agent scheduler
    await master_crew_scheduler(client)


def main() -> None:
    asyncio.run(main_loop())


if __name__ == "__main__":
    main()
