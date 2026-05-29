#!/usr/bin/env python3
"""
engine_articles.py — ZAYRON-X DeepSeek AI Article Generation Engine

God-Tier threat intelligence article generator powered by DeepSeek AI.
Takes raw Telegram feeds from the radar pipeline and transforms them into
massive 1500-3000 word intelligence dossiers optimized for global SEO.

Architecture
────────────
  Supabase raw_feeds (pending queue)
       │
       ▼
  MASTER_PROMPT → DeepSeek AI (via OpenAI-compatible API)
       │
       ▼
  Article Normalizer → Supabase articles table
       │
       ▼
  Category Dispatch → tools, cves, malware, apt, osint tables

Usage
─────
    export DEEPSEEK_API_KEY="sk-..."
    export SUPABASE_URL="https://..."
    export SUPABASE_SERVICE_KEY="sb-..."
    python engine_articles.py

Environment variables
─────────────────────
    DEEPSEEK_API_KEY     DeepSeek API key (required)
    DEEPSEEK_BASE_URL    API base (default: https://api.deepseek.com/v1)
    DEEPSEEK_MODEL       Model (default: deepseek-chat)
    SUPABASE_URL         Supabase project URL
    SUPABASE_SERVICE_KEY         Supabase service_role key
    BATCH_SIZE           Feeds to process per cycle (default: 5)
    POLL_INTERVAL        Minutes between cycles (default: 5)
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import random
import re
import sys
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import aiohttp
from openai import AsyncOpenAI

# Ensure shared package is importable from project root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------------------
# .env.local loading — reads from Next.js project root
# ---------------------------------------------------------------------------

try:
    from dotenv import load_dotenv
    ENV_PATH = os.path.join(os.path.dirname(__file__), "gerasys-online", ".env.local")
    if os.path.isfile(ENV_PATH):
        load_dotenv(ENV_PATH)
        print(f"Loaded environment from {ENV_PATH}")
    else:
        # Fallback: try sibling .env.local
        FALLBACK = os.path.join(os.path.dirname(__file__), "..", "gerasys-online", ".env.local")
        if os.path.isfile(FALLBACK):
            load_dotenv(FALLBACK)
            print(f"Loaded environment from {FALLBACK}")
except ImportError:
    print("python-dotenv not installed — using os.environ directly")

from shared.models import ArticleInsert, ArticleSITREP, validate_iocs

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("FATAL: SUPABASE_URL and SUPABASE_SERVICE_KEY are required.")
    sys.exit(1)

BATCH_SIZE: int = int(os.getenv("BATCH_SIZE", "5"))
POLL_INTERVAL_MINUTES: int = int(os.getenv("POLL_INTERVAL", "5"))
LLM_TIMEOUT_SEC: int = 180

logging.basicConfig(
    level=logging.DEBUG if os.getenv("ENGINE_DEBUG", "").lower() == "true"
         else logging.INFO,
    format="%(asctime)s [%(levelname)s] [ENGINE] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
log = logging.getLogger("zayron_x_engine")

# ---------------------------------------------------------------------------
# MASTER PROMPT — ZAYRON-X Elite Threat Intelligence (SEO-Optimized)
# ---------------------------------------------------------------------------

MASTER_PROMPT: str = """\
You are a Senior Cyber Threat Intelligence Director at ZAYRON-X with five \
decades of operational experience across nation-state APT campaigns, \
critical infrastructure defense, and Fortune 500 incident response. You \
produce the definitive threat intelligence dossiers relied upon by CISOs, \
national CERTs, and military cyber commands.

Your writing reflects a career spent in the operational trenches — every \
assessment is surgical, every recommendation actionable. You do not \
speculate. You do not hedge. You deliver intelligence that commands \
respect at the highest levels of government and industry.

═══════════════════════════════════════════════════════════════
⚠  ABSOLUTE ZERO-HALLUCINATION POLICY — NON-NEGOTIABLE
   THIS SECTION OVERRIDES ALL OTHER INSTRUCTIONS
═══════════════════════════════════════════════════════════════

RULE 1 — NO FABRICATED IoCs:
The "iocs" array MUST contain ONLY indicator values that are EXPLICITLY and \
LITERALLY present verbatim in the raw input text. You are STRICTLY FORBIDDEN \
from generating, inferring, or extrapolating any of the following unless they \
appear character-for-character in the raw input:
  • IP addresses (IPv4 or IPv6) — NEVER write values such as "10.0.0.1", \
    "192.168.x.x", "203.0.113.x", or any numeric IP not in the raw input.
  • Domain names or hostnames — NEVER write values such as "example.com", \
    "malicious-domain.ru", "c2-server.net", or any domain not in the raw input.
  • File hashes (SHA256, MD5, SHA1) — NEVER construct or template a hash string.
  • Commit IDs or git hashes — NEVER write values like "a1b2c3d4..." or \
    "placeholder commit" unless copied verbatim from the raw input.
  • URLs, email addresses, registry keys, file paths, mutex names, or any \
    other indicator unless it appears verbatim in the raw input.

If the raw input contains ZERO extractable IoCs you MUST set:
  "iocs": []
An empty array is the CORRECT output when no IoCs exist in the source. \
A fabricated IoC is infinitely worse than an empty list.

RULE 2 — NO PLACEHOLDER TEXT:
STRICTLY FORBIDDEN in every output field:
  • The words: "placeholder", "example", "sample", "dummy", "test", "N/A", \
    "TBD", "unknown hash", "unknown IP", "unknown domain"
  • Template fill-in patterns: "[HASH HERE]", "<IP>", "[CVE-YEAR-XXXXX]", \
    or "CVE-202X-XXXXX" used as an actual CVE value

RULE 3 — CVSS VECTOR ACCURACY:
Only provide a "cvss_v4_vector" value if a CVE or exploitable vulnerability \
is explicitly mentioned in the raw input AND the vector is derivable from \
technical facts in that input. Otherwise set "cvss_v4_vector": null.

═══════════════════════════════════════════════════════════════
⚠  TECHNICAL ACCURACY MANDATE — DETECTION RULE LOGIC
═══════════════════════════════════════════════════════════════

Every detection rule MUST be technically congruent with the attack vector \
described in the raw input.

NETWORK RULE CONSTRAINT:
Snort/Suricata rules are ONLY appropriate when the threat involves a \
NETWORK-OBSERVABLE attack vector, such as:
  • Exploitation of a network-facing service (web server, VPN, firewall, RDP)
  • C2 beacon traffic, DNS tunneling, or exfiltration over the network
  • Phishing emails traversing the mail relay
  • Lateral movement via SMB, WinRM, or similar network protocols

If the threat is a LOCAL or KERNEL-LEVEL exploit (privilege escalation, \
local file inclusion, kernel memory corruption, physical access, or a pure \
endpoint attack with no network component), you MUST NOT generate \
Snort/Suricata network signatures. Set "snort_signatures": [] and instead \
generate host-based content: YARA rules, Sigma rules for endpoint telemetry, \
EDR queries, and OS audit policy recommendations.

YARA RULE ACCURACY:
YARA rules must target observable artifact characteristics — byte sequences, \
strings, PE metadata — derivable from technical facts in the raw input. \
Do not generate generic YARA templates that could match any malware.

SIGMA RULE ACCURACY:
Sigma rules must reference real Windows Event Log IDs, Sysmon Event IDs, \
Linux audit log fields, or cloud log sources logically relevant to the \
described attack. Map detection logic to the specific technique, not a \
generic catch-all.

MITRE ATT&CK ACCURACY:
Use only legitimate, currently published MITRE ATT&CK Enterprise technique \
IDs. Do not invent T-codes. Map only techniques directly evidenced by the \
raw input — do not pad the matrix with irrelevant tactics.

═══════════════════════════════════════════════════════════════
I. LANGUAGE — ENGLISH ONLY
═══════════════════════════════════════════════════════════════

All output is 100% English. When source material arrives in any other \
language, translate it into flawless, native-level cybersecurity English. \
Preserve original threat actor names and malware family names in parentheses \
on first reference for attribution traceability. The final report must read \
as if authored by a senior analyst at a Five Eyes intelligence agency — \
precise, idiomatic, and indistinguishable from a native speaker.

═══════════════════════════════════════════════════════════════
II. SEO TITLE ARCHITECTURE
═══════════════════════════════════════════════════════════════

Every title must be engineered for maximum search visibility while \
remaining technically accurate. Construct titles using at least two of \
these proven high-CTR patterns:

  URGENCY: "Breaking", "Active Exploitation", "Emergency Patch Advisory", \
  "Under Active Attack", "Time-Critical Update"

  BLAST RADIUS: "Millions of Systems Affected", "Global Attack Campaign", \
  "Critical Zero-Day Vulnerability", "Supply Chain Compromise", \
  "Widespread Data Breach"

  AUTHORITY: "ZAYRON-X Deep-Dive Analysis", "Technical Forensics Report", \
  "Complete Exploitation Chain Breakdown", "Definitive Threat Assessment"

  CURIOSITY: "What Security Teams Must Know", "How the Attack Unfolds", \
  "Detection Strategies That Work", "The Vulnerability Nobody Is Talking About"

Target title length: 60–120 characters. Integrate at least one specific \
identifier — CVE ID, APT group name, malware family, or targeted technology. \
Title must include high-value SEO keywords naturally embedded.

═══════════════════════════════════════════════════════════════
III. REPORT STRUCTURE & CONTENT REQUIREMENTS
═══════════════════════════════════════════════════════════════

Produce a 1500+ word Markdown report. Every section below is mandatory.

## KEY TAKEAWAYS
Open the report with a bulleted list of 5–7 actionable takeaways. Each \
bullet must be one sentence long, packed with a specific fact or \
recommendation. This section is engineered for Google Featured Snippets \
and must contain high-volume LSI keywords integrated naturally.

## EXECUTIVE THREAT BRIEF
2–3 paragraphs establishing strategic context. Lead with a BLUF (Bottom \
Line Up Front). State what occurred, the affected attack surface, the \
adversary's likely objective, and the estimated blast radius. Include \
geographic exposure, sector impact percentages, and financial risk \
quantification.

## TECHNICAL DEEP-DIVE
Full-spectrum technical analysis:
- Vulnerability mechanics: root cause at the code/architecture level, \
  affected components, memory corruption details, type confusion, race \
  conditions, or logic flaws as applicable
- Exploit chain reconstruction: step-by-step kill chain with pseudocode \
  illustrating the exploitation primitives
- Malware analysis: code lineage, packer/crypter identification, \
  anti-analysis techniques, C2 protocol dissection
- Cryptographic weaknesses if relevant: cipher flaws, key management \
  failures, protocol downgrade vectors
- CVSS v4.0 vector string with component-by-component justification

## MITRE ATT&CK ENTERPRISE MATRIX
Complete mapping with precise T-codes and canonical technique names.

## DETECTION ENGINEERING
Provide operational, compilable detection content. Apply the TECHNICAL \
ACCURACY MANDATE: only generate Snort/Suricata signatures when the attack \
vector is network-observable. For local/kernel/endpoint attacks, omit \
network signatures entirely and focus on host-based detection:
- YARA rules (functional, compilable) for malware and tool detection
- Sigma rules (complete YAML) for SIEM correlation across Splunk, \
  Elastic, and Microsoft Sentinel
- Snort/Suricata signatures — ONLY when a network component exists
- KQL and SPL hunting queries for Microsoft Defender and Splunk
- EDR telemetry queries for CrowdStrike Falcon and SentinelOne

## INDICATORS OF COMPROMISE
Structured IoC table. ONLY include IoC values that appear verbatim in the \
raw input. If no IoCs are present, write only the table header followed by: \
"No indicators were present in the source intelligence."

| Type | Value | Context | Confidence |
|------|-------|---------|------------|

## COMPLIANCE & REGULATORY IMPACT
Map the threat to:
- ISO 27001:2022 Annex A controls (specific clause references)
- NIST CSF 2.0 functions: GOVERN, IDENTIFY, PROTECT, DETECT, RESPOND, RECOVER
- GDPR Articles 32, 33, 34 obligations and potential fine exposure
- NIS2 Directive applicability for EU essential/digital infrastructure
- PCI-DSS v4.0 requirements if payment systems are affected

## REMEDIATION ROADMAP
Prioritized, timeline-driven actions:
- Tier 1 (Immediate, 0–24h): critical patches, containment, isolation
- Tier 2 (Short-term, 24–72h): detection deployment, configuration hardening
- Tier 3 (Medium-term, 1–4 weeks): architecture changes, compensating controls

## STRATEGIC OUTLOOK
Forecast the threat's evolution over the next 30, 60, and 90 days. Assess \
second-order effects, likely copycat activity, and recommended strategic \
posture adjustments. Place the incident in its geopolitical context.

═══════════════════════════════════════════════════════════════
IV. STYLE & TONE — AI FINGERPRINT REMOVAL
═══════════════════════════════════════════════════════════════

Write with the calibrated authority of a 50-year cybersecurity veteran \
addressing a Fortune 100 CISO. Every sentence must deliver a fact, an \
assessment, or an actionable instruction.

BANNED PHRASES — ABSOLUTE PROHIBITION (presence = quality failure):

AI IDENTITY MARKERS:
  "As an AI", "As an AI language model", "I am an AI", "I cannot",
  "I do not have the ability to", "my training data", "my knowledge cutoff"

FILLER & HEDGING PHRASES:
  "In conclusion", "To summarize", "In summary", "To conclude",
  "It is important to note", "It's worth noting", "It should be noted",
  "It is worth mentioning", "Notably,", "Importantly,",
  "As previously mentioned", "As mentioned above", "As noted earlier"

GENERIC AI OPENERS:
  "In today's digital landscape", "In the ever-evolving world of \
  cybersecurity", "In the rapidly evolving", "In an increasingly",
  "As cyber threats continue to", "As technology advances",
  "Let's delve into", "Let's explore", "Let us examine"

HOLLOW EMPHASIS PHRASES:
  "underscores the need for", "highlights the importance of",
  "serves as a reminder", "a stark reminder", "sheds light on",
  "cannot be overstated", "it goes without saying", "needless to say",
  "of utmost importance", "plays a crucial role", "is a testament to"

PLACEHOLDER LANGUAGE (also covered by Zero-Hallucination Policy):
  "placeholder", "example", "sample data", "dummy", "lorem ipsum",
  "[INSERT", "[REDACTED", "your organization", "your company"

STYLE RULES:
- Active voice exclusively. "The adversary deployed ransomware" not \
  "Ransomware was deployed."
- No exclamation marks. No rhetorical questions.
- Precise technical language at all times. Assume the reader is a senior \
  incident responder, threat hunter, or CISO.

═══════════════════════════════════════════════════════════════
V. OUTPUT FORMAT
═══════════════════════════════════════════════════════════════

Return a valid JSON object — no markdown fences, no commentary:

{
  "title": "SEO-optimized title (60-120 characters, includes CVE/APT/product name)",
  "executive_summary": "4-6 sentence BLUF summary with blast radius, sectors, urgency",
  "content": "## KEY TAKEAWAYS\\n- ...\\n- ...\\n\\n## EXECUTIVE THREAT BRIEF\\n\\n... [FULL 1500+ WORD MARKDOWN REPORT WITH ALL SECTIONS]",
  "category": "Threat Intelligence|Malware Analysis|APT Activity|Vulnerability Research|Ransomware|Nation State|OSINT|Security Tools|Cyber Crime|Data Breach|Supply Chain Security|Cloud Security|AI Security|ICS/OT Security|Phishing",
  "severity": "Critical|High|Medium|Low|Informational",
  "mitre_attack_ttps": ["T1566.001 — Spearphishing Attachment", ...],
  "cvss_v4_vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N or null if no CVE present",
  "affected_sectors": ["Healthcare", "Financial Services", "Energy", ...],
  "affected_countries": ["US", "EU", "CN", ...],
  "estimated_financial_impact": "$X - $Y million",
  "estimated_affected_orgs": "N organizations",
  "iocs": [{"type": "SHA256|IPv4|Domain|URL|Email", "value": "...", "context": "...", "confidence": "High|Medium|Low"}],
  "yara_rules": ["rule Name { ... }"],
  "sigma_rules": ["title: ...\\nid: ...\\n..."],
  "snort_signatures": ["alert tcp ... (ONLY if attack is network-observable, else set to [])"],
  "iso_27001_controls": ["A.5.1", "A.8.1", "A.12.2"],
  "nist_csf_functions": ["GOVERN — ..., IDENTIFY — ..., PROTECT — ..."],
  "gdpr_impact": "Assessment of GDPR relevance and potential fine exposure",
  "remediation_playbook": "Step-by-step DevSecOps remediation with code snippets",
  "ai_image_prompt": "Cinematic cyberpunk abstract image prompt for DALL-E 3"
}

If the raw input has zero threat intelligence value, set "title" to null.
Otherwise, produce a complete 1500+ word report meeting every requirement \
above."""

# ---------------------------------------------------------------------------
# CTI Analyst Pool
# ---------------------------------------------------------------------------

CTI_AUTHORS: list[str] = [
    "Marcus Kovac",
    "Dr. Tariq Youssef",
    "Sarah Chen",
    "Elena Voss",
    "David Hughes",
    "Aiko Tanaka",
    "Dmitri Volkov",
    "Omar Al-Fayed",
]


def pick_author() -> str:
    return random.choice(CTI_AUTHORS)


def estimate_read_time(text: str) -> int:
    word_count = len(text.split())
    return max(1, round(word_count / 200))


def compute_url_hash(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()


def utc_now_iso() -> str:
    """Return the current UTC timestamp in ISO 8601 format.
    Used for `published_at` display ordering. `created_at` is always
    delegated to the database DEFAULT NOW() for forensic immutability."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


# ---------------------------------------------------------------------------
# Helper: retry with exponential backoff
# ---------------------------------------------------------------------------

async def retry_async(coro_factory, max_retries: int = 3, label: str = "op") -> Any:
    last_exc: Exception | None = None
    for attempt in range(1, max_retries + 1):
        try:
            return await coro_factory()
        except Exception as exc:
            last_exc = exc
            if attempt < max_retries:
                delay = (2 ** attempt) + random.uniform(0, 1)
                log.warning("%s attempt %d/%d failed: %s — retrying in %.1fs",
                            label, attempt, max_retries, exc, delay)
                await asyncio.sleep(delay)
            else:
                log.error("%s failed after %d attempts: %s", label, max_retries, exc)
    raise last_exc  # type: ignore[misc]


# ---------------------------------------------------------------------------
# Supabase: Fetch pending feeds
# ---------------------------------------------------------------------------

async def fetch_pending_feeds(
    session: aiohttp.ClientSession,
    limit: int = BATCH_SIZE,
) -> list[dict[str, Any]]:
    """Fetch pending raw_feeds from Supabase, oldest first."""
    url = (
        f"{SUPABASE_URL}/rest/v1/raw_feeds"
        f"?status=eq.pending"
        f"&order=created_at.asc"
        f"&limit={limit}"
        f"&select=*"
    )
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Accept": "application/json",
    }

    try:
        async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as resp:
            if resp.status != 200:
                log.warning("Failed to fetch pending feeds: HTTP %d", resp.status)
                return []
            return await resp.json()
    except Exception as exc:
        log.error("Error fetching pending feeds: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Supabase: Mark feed as processed
# ---------------------------------------------------------------------------

async def mark_feed_processed(
    session: aiohttp.ClientSession,
    feed_id: str,
    status: str = "processed",
    analysis: str | None = None,
) -> bool:
    """Update a raw_feed entry's status."""
    url = f"{SUPABASE_URL}/rest/v1/raw_feeds?id=eq.{feed_id}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    body: dict[str, Any] = {"status": status}
    if analysis:
        body["analysis"] = analysis[:500]

    try:
        async with session.patch(
            url, headers=headers, json=body,
            timeout=aiohttp.ClientTimeout(total=10),
        ) as resp:
            return resp.status in (200, 204)
    except Exception as exc:
        log.error("Error updating feed %s: %s", feed_id, exc)
        return False


# ---------------------------------------------------------------------------
# DeepSeek AI: Generate Article
# ---------------------------------------------------------------------------

async def generate_article(
    llm: AsyncOpenAI,
    raw_text: str,
    source_channel: str = "unknown",
) -> dict[str, Any] | None:
    """Send raw feed text to DeepSeek and return a validated SITREP."""
    user_message = (
        f"SOURCE CHANNEL: {source_channel}\n"
        f"RAW INTELLIGENCE INPUT:\n{raw_text[:8000]}\n\n"
        f"Apply ALL directives from the MASTER_PROMPT. Every report MUST be "
        f"1500+ words, in elite cybersecurity English, with full MITRE ATT&CK, "
        f"ISO 27001, GDPR, YARA, Sigma, and Snort content."
    )

    t0 = time.monotonic()

    async def _call_llm():
        return await llm.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": MASTER_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,
            max_tokens=8_192,
            response_format={"type": "json_object"},
        )

    try:
        response = await asyncio.wait_for(
            retry_async(_call_llm, max_retries=2, label=f"DeepSeek"),
            timeout=LLM_TIMEOUT_SEC,
        )
    except asyncio.TimeoutError:
        log.error("DeepSeek timeout after %ds", LLM_TIMEOUT_SEC)
        return None
    except Exception as exc:
        log.error("DeepSeek error: %s", exc)
        return None

    latency = time.monotonic() - t0
    content = response.choices[0].message.content or ""

    if not content:
        log.warning("Empty DeepSeek response")
        return None

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        log.warning("DeepSeek returned invalid JSON")
        # Try to extract JSON from the response
        match = re.search(r'\{[\s\S]*\}', content)
        if match:
            try:
                parsed = json.loads(match.group())
            except json.JSONDecodeError:
                return None
        else:
            return None

    if parsed.get("title") is None:
        log.info("Feed flagged as non-intelligence — skipping")
        return None

    # ── Pydantic SITREP validation (replaces manual key checks) ──
    try:
        sitrep = ArticleSITREP(**parsed)
        validated = sitrep.model_dump()
        # Preserve extra fields the model ignores
        for key in ("ai_image_prompt",):
            if key in parsed:
                validated[key] = parsed[key]
        # Run IoC hallucination gate
        if validated.get("iocs"):
            validated["iocs"] = validate_iocs(validated["iocs"])
    except Exception as exc:
        log.warning("SITREP validation failed: %s", exc)
        return None

    # Validate minimum word count
    article_content = validated.get("content", "")
    word_count = len(article_content.split())
    if word_count < 800:
        log.warning(
            "Article too short (%d words — minimum 1500 required by directive). "
            "Consider re-processing with stronger expansion.", word_count
        )

    log.info(
        "DeepSeek generated article: %.80s... (%d words, %.1fs)",
        validated.get("title", ""), word_count, latency,
    )

    return validated


# ---------------------------------------------------------------------------
# Slug generation
# ---------------------------------------------------------------------------

def generate_slug(title: str) -> str:
    """Generate a URL-safe slug from an article title."""
    slug = title.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    slug = re.sub(r'-{2,}', '-', slug)
    slug = slug.strip('-')
    return slug[:200]


# ---------------------------------------------------------------------------
# Supabase: Upsert Article
# ---------------------------------------------------------------------------

async def upsert_article(
    session: aiohttp.ClientSession,
    feed: dict[str, Any],
    sitrep: dict[str, Any],
) -> bool:
    """Insert the generated article into Supabase articles table."""
    url = f"{SUPABASE_URL}/rest/v1/articles"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    title = sitrep.get("title", feed.get("translated_title", "Untitled"))

    # ── Pydantic ArticleInsert validation ──
    try:
        insert = ArticleInsert(
            title=title,
            slug=generate_slug(title),
            author=pick_author(),
            category=sitrep.get("category", "Threat Intelligence"),
            content=sitrep.get("content", ""),
            excerpt=sitrep.get("executive_summary", "")[:500],
            read_time=estimate_read_time(sitrep.get("content", "")),
            published_at=utc_now_iso(),
            url_hash=compute_url_hash(feed.get("raw_content", title)),
        )
        row = insert.to_supabase_dict()
    except Exception as exc:
        log.error("ArticleInsert validation failed: %s", exc)
        return False

    try:
        async with session.post(
            url, headers=headers, json=row,
            timeout=aiohttp.ClientTimeout(total=15),
        ) as resp:
            ok = resp.status in (200, 201, 204)
            if not ok:
                body = await resp.text()
                log.warning("Article insert HTTP %d: %s", resp.status, body[:200])
            return ok
    except Exception as exc:
        log.error("Article insert error: %s", exc)
        return False


# ---------------------------------------------------------------------------
# Main Engine Cycle
# ---------------------------------------------------------------------------

async def engine_cycle(
    http_session: aiohttp.ClientSession,
    llm: AsyncOpenAI,
) -> dict[str, Any]:
    """Execute one complete article generation cycle."""
    start = time.monotonic()
    stats: dict[str, Any] = {
        "feeds_fetched": 0,
        "feeds_processed": 0,
        "articles_generated": 0,
        "skipped_non_intel": 0,
        "errors": 0,
    }

    # Step 1: Fetch pending feeds
    pending = await fetch_pending_feeds(http_session, BATCH_SIZE)
    stats["feeds_fetched"] = len(pending)

    if not pending:
        log.info("No pending feeds to process")
        stats["cycle_seconds"] = time.monotonic() - start
        return stats

    log.info("Processing %d pending feeds with DeepSeek AI", len(pending))

    # Step 2: Process each feed through DeepSeek
    semaphore = asyncio.Semaphore(1)  # Serialize LLM calls

    async def process_one(feed: dict[str, Any]) -> None:
        async with semaphore:
            feed_id = feed.get("id", "")
            raw_text = feed.get("raw_content", "")
            source = feed.get("source_channel", "unknown")

            if not raw_text or len(raw_text) < 15:
                await mark_feed_processed(http_session, feed_id, "skipped")
                return

            sitrep = await generate_article(llm, raw_text, source)

            if sitrep is None:
                stats["skipped_non_intel"] += 1
                await mark_feed_processed(http_session, feed_id, "rejected")
                return

            # Step 3: Insert article into Supabase
            success = await upsert_article(http_session, feed, sitrep)

            if success:
                stats["articles_generated"] += 1
                await mark_feed_processed(
                    http_session, feed_id, "promoted",
                    analysis=sitrep.get("executive_summary", ""),
                )
            else:
                stats["errors"] += 1
                await mark_feed_processed(http_session, feed_id, "error")

            stats["feeds_processed"] += 1
            await asyncio.sleep(2)  # Rate-limit throttle

    tasks = [process_one(f) for f in pending]
    await asyncio.gather(*tasks, return_exceptions=True)

    stats["cycle_seconds"] = time.monotonic() - start
    log.info(
        "Engine cycle complete: %d processed, %d articles, %d skipped, %.1fs",
        stats["feeds_processed"], stats["articles_generated"],
        stats["skipped_non_intel"], stats["cycle_seconds"],
    )
    return stats


# ---------------------------------------------------------------------------
# Daemon Main Loop
# ---------------------------------------------------------------------------

async def main_loop() -> None:
    """Main engine daemon — continuously processes pending feeds."""
    log.info("=" * 60)
    log.info("  ZAYRON-X DeepSeek Article Engine")
    log.info("  Model: %s", DEEPSEEK_MODEL)
    log.info("  Batch size: %d", BATCH_SIZE)
    log.info("  Poll interval: %d min", POLL_INTERVAL_MINUTES)
    log.info("=" * 60)

    if not DEEPSEEK_API_KEY:
        log.critical("DEEPSEEK_API_KEY is not set.")
        sys.exit(1)

    llm = AsyncOpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)

    cycle = 0
    async with aiohttp.ClientSession(
        timeout=aiohttp.ClientTimeout(total=30),
    ) as http_session:

        while True:
            cycle += 1
            log.info("=== Engine cycle %d starting ===", cycle)

            try:
                stats = await engine_cycle(http_session, llm)
            except Exception as exc:
                log.critical("Engine cycle %d crashed: %s", cycle, exc)
                stats = {"errors": 1}

            log.info("Sleeping %d min ...", POLL_INTERVAL_MINUTES)
            await asyncio.sleep(POLL_INTERVAL_MINUTES * 60)


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

def main() -> None:
    if "--once" in sys.argv:
        async def _once() -> None:
            if not DEEPSEEK_API_KEY:
                log.critical("DEEPSEEK_API_KEY is not set.")
                sys.exit(1)
            llm = AsyncOpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30),
            ) as http_session:
                stats = await engine_cycle(http_session, llm)
                print(json.dumps(stats, indent=2, default=str))
        asyncio.run(_once())
    else:
        asyncio.run(main_loop())


if __name__ == "__main__":
    main()
