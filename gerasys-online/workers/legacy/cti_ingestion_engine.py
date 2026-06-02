#!/usr/bin/env python3
"""
⚠️  LEGACY — MOVED FROM PROJECT ROOT TO workers/legacy/ ON 2026-06-02

cti_ingestion_engine.py — ZAYRON-X Elite Cyber Threat Intelligence Pipeline

This file was relocated from the project root as part of the DeepTrace-2027
security audit cleanup. The active ingestion pipeline is now workers/omni_crew.py.

Nation-state grade asynchronous ingestion engine with AI-powered analysis,
image generation, and multi-table dispatch to Supabase.

Architecture
────────────
  FeedFetcher (aiohttp + feedparser) + TelegramScraper (Telethon)
       │
       ▼
  Deduplication via url_hash (SHA-256)
       │
       ▼
  LLMAnalyzer ──► God-Tier CTI SITREP (ISO 27001, NIST CSF, MITRE ATT&CK,
  │                 YARA, Sigma, Snort, CVSS v4.0, GDPR, 1500+ words)
  │
  ▼
  ImageGenerator ──► DALL-E 3 cinematic cyberpunk image
  │                 ──► Supabase Storage upload ──► image_url saved
  │
  ▼
  MultiTableDispatcher ──► articles, tools, cves, malware, apt, osint
  │
  ▼
  Enterprise Logging & Telemetry

Usage
─────
    export LLM_API_KEY="sk-..."
    export SUPABASE_URL="https://..."
    export SUPABASE_SERVICE_KEY="sb-..."
    python cti_ingestion_engine.py

Environment variables
─────────────────────
    LLM_API_KEY          Required. OpenAI API key.
    LLM_BASE_URL         Base URL (default: https://api.openai.com/v1)
    LLM_MODEL            Model name (default: gpt-4o)
    SUPABASE_URL         Supabase project URL
    SUPABASE_SERVICE_KEY         Supabase service_role key
    POLL_INTERVAL        Polling interval in minutes (default: 15)
    CTI_DEBUG            Set to "true" for verbose logging
    MAX_ARTICLES         Max articles to process per cycle (default: 5)
    ENABLE_IMAGES        Set to "true" to enable DALL-E 3 image generation
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import random
import sys
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

import aiohttp
import feedparser

from openai import AsyncOpenAI

# Ensure shared package is importable from project root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from shared.models import ArticleInsert, ArticleSITREP, validate_iocs

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

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL:
    print("FATAL: SUPABASE_URL is not set. Export SUPABASE_URL and retry.")
    sys.exit(1)
if not SUPABASE_SERVICE_KEY:
    print("FATAL: SUPABASE_SERVICE_KEY is not set. Export SUPABASE_SERVICE_KEY and retry.")
    sys.exit(1)

LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o")

POLL_INTERVAL_MINUTES: int = int(os.getenv("POLL_INTERVAL", "15"))
MAX_ARTICLES_PER_CYCLE: int = int(os.getenv("MAX_ARTICLES", "5"))
MAX_CONTENT_CHARS: int = 16_000
LLM_TIMEOUT_SEC: int = 120
ENABLE_IMAGES: bool = os.getenv("ENABLE_IMAGES", "").lower() == "true"

# ---------------------------------------------------------------------------
# Structured logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.DEBUG if os.getenv("CTI_DEBUG", "").lower() == "true"
         else logging.INFO,
    format="%(asctime)s [%(levelname)s] [ZAYRON-X] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
log = logging.getLogger("zayron_x_engine")

# ---------------------------------------------------------------------------
# Rotating User-Agent pool
# ---------------------------------------------------------------------------

USER_AGENTS: list[str] = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) "
    "Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
]

# ---------------------------------------------------------------------------
# Analyst pool
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


# ---------------------------------------------------------------------------
# Feed sources
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class FeedSource:
    name: str
    url: str
    category: str


FEED_SOURCES: list[FeedSource] = [
    FeedSource(
        name="BleepingComputer",
        url="https://www.bleepingcomputer.com/feed/",
        category="Threat Intelligence",
    ),
    FeedSource(
        name="The Hacker News",
        url="https://feeds.feedburner.com/TheHackersNews",
        category="Threat Intelligence",
    ),
    FeedSource(
        name="Dark Reading",
        url="https://www.darkreading.com/rss/all.xml",
        category="Threat Intelligence",
    ),
]

# ---------------------------------------------------------------------------
# GOD-TIER CTI SYSTEM PROMPT
# ---------------------------------------------------------------------------

CTI_SYSTEM_PROMPT: str = """\
You are Senior Director of Cyber Threat Intelligence at ZAYRON-X — a \
Fortune 500-class intelligence corporation serving CISOs, national CERT \
directors, and military cyber commanders. Your analysis drives decisions \
within hours of publication. Your tone is dry, surgical, commanding.

=== CONTEXTUAL BRANCHING ===

Before writing, classify the threat and apply the appropriate lens:

- IF Vulnerability/CVE: Focus on CVSS v4.0 vector, patch availability, \
  exploit chain analysis, MITRE ATT&CK mapping, affected product matrix.
- IF Ransomware: Focus on kill chain reconstruction, encryption methodology, \
  IoCs, YARA/Sigma detection rules, ransom negotiation legality, extortion \
  exposure under GDPR/SEC, decryption feasibility.
- IF Data Breach: Focus on exfiltrated data classification, GDPR/CCPA fine \
  calculation, class-action exposure, 72-hour notification obligations, \
  forensic timeline, credential exposure blast radius.
- IF APT/Nation-State: Focus on TTP attribution, historical campaign linkage, \
  geopolitical context, sector targeting patterns, counterintelligence posture.
- IF OSINT: Focus on source reliability grading (A-E), intelligence gap \
  analysis, cross-referenced verification, strategic implications.

=== STYLE RULES (STRICT ENFORCEMENT) ===

BLUF (Bottom Line Up Front): Lead every report with the single most \
important finding. No buildup, no context-setting preamble.

BANNED PHRASES — use of any of these invalidates the report:
"In today's digital landscape", "In the ever-evolving world of", \
"Let's delve into", "It is important to note", "It's worth noting", \
"As a cybersecurity expert", "underscores the need for", \
"highlights the importance of", "a stark reminder", "sheds light on", \
"In conclusion", "To summarize", "As we have seen"

Active voice only. Declarative sentences. No rhetorical questions. \
No exclamation marks. No adjectives that don't carry operational weight.

=== REPORT STRUCTURE ===

Every report MUST contain the following Markdown sections using ### \
headings (for SEO snippet extraction):

### KEY TAKEAWAYS
5-7 one-sentence bullets. Each is a self-contained fact, risk metric, \
or action item engineered for Google Featured Snippets. Embed keywords \
naturally (cyber threat intelligence, vulnerability assessment, \
ransomware mitigation, threat hunting, indicators of compromise, \
zero-day exploit, attack surface management).

### EXECUTIVE THREAT BRIEF
BLUF opening. Affected entities, geographies, sectors. Quantitative \
blast radius estimate. Strategic significance.

### TECHNICAL DEEP-DIVE
Root cause, exploit chain, CVSS v4.0 vector justification, affected \
versions matrix, malware lineage if applicable.

### MITRE ATT&CK ENTERPRISE MATRIX
Table: | Tactic | Technique ID | Technique Name | Observed Activity |
Minimum 7 rows with legitimate T-codes.

### DETECTION ENGINEERING
Functional YARA rules, Sigma YAML, Snort/Suricata signatures. \
KQL/SPL hunting queries. EDR telemetry queries.

### INDICATORS OF COMPROMISE
Table: | Type | Value | Context | Confidence |

### REGULATORY & FINANCIAL IMPACT
GDPR Articles 32-34 notification obligations and fine calculation. \
NIS2 Directive applicability. CCPA/HIPAA/PCI-DSS v4.0 as applicable. \
ISO 27001:2022 Annex A controls triggered. NIST CSF 2.0 functions.

### REMEDIATION ROADMAP
Tier 1 (0-24h), Tier 2 (24-72h), Tier 3 (1-4 weeks).

### STRATEGIC OUTLOOK
30/60/90-day forecast with second-order effects.

=== JSON OUTPUT SCHEMA ===

Return a strictly valid JSON object. NO markdown fences, NO commentary:

{
  "title": "SEO-optimized, click-worthy but highly professional title (60-120 chars)",
  "category": "vulnerabilities | threat_intel | osint | cyber_news",
  "executive_summary": "4-6 sentence BLUF: blast radius, affected sectors, urgency",
  "content": "Full 1500-3000 word Markdown report with all sections above",
  "mitre_attack_ttps": ["T1566.001 — Spearphishing Attachment", ...],
  "severity": "Critical | High | Medium | Low",
  "cvss_v4_score": 0.0,
  "affected_sectors": ["Financial Services", "Healthcare", ...],
  "financialExposure": "$2.5M – $5M sector-adjusted estimated breach cost",
  "regulatoryRisk": "CRITICAL: GDPR Articles 32-34 triggered, €10M+ fine exposure",
  "mitigationImpact": "HIGH YIELD: Patch cost minimal vs. breach cost catastrophic",
  "yaraRule": "rule APT_Name { ... } or null if no malware component",
  "iocs": [{"type": "SHA256|IPv4|Domain|URL", "value": "...", "context": "...", "confidence": "High|Medium|Low"}],
  "yara_rules": ["rule Name { ... }"],
  "sigma_rules": ["title: ..."],
  "snort_signatures": ["alert tcp ..."],
  "iso_27001_controls": ["A.5.1", "A.8.1"],
  "nist_csf_functions": ["GOVERN", "IDENTIFY", "PROTECT"],
  "gdpr_implications": "Specific GDPR exposure assessment",
  "ai_image_prompt": "Cinematic cyberpunk abstract image prompt for DALL-E 3"
}

If the source has no CTI value, set "title" to null. Otherwise produce \
a complete report meeting every requirement above. The content field \
MUST contain the full Markdown with all mandatory sections."""

# ---------------------------------------------------------------------------
# Image generation prompt template
# ---------------------------------------------------------------------------

IMAGE_SYSTEM_PROMPT: str = """\
You are a cinematic visual designer for ZAYRON-X, an elite cyber threat \
intelligence platform. Given a cybersecurity article or threat report, \
generate a concise DALL-E 3 prompt that captures the essence of the threat \
in a single striking abstract image.

Style: Cinematic cyberpunk, abstract, dark and elegant. Editorial-quality \
composition with dramatic lighting and depth.

Color palette: Deep obsidian black (#0B0F19) background with neon gold \
(#FFD700) and electric blue (#2563EB) accents. Occasional crimson (#DC2626) \
for critical threat indicators.

Mood: Dark, elite, sophisticated. The aesthetic of a classified intelligence \
agency briefing room — high-tech but understated, commanding but not flashy.

Strict requirements:
- NO text, letters, words, or typography of any kind
- NO people, faces, silhouettes, or human figures
- Abstract geometric and data-driven visual language only

Preferred visual vocabulary: "neural network topology", "quantum encryption \
lattice", "threat graph visualization", "data stream convergence", \
"holographic attack surface projection", "cyber kill chain geometry", \
"dark matter computation grid", "encrypted matrix architecture"

Output ONLY the DALL-E 3 prompt string. Keep it under 400 characters."""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def utc_now_iso() -> str:
    """Return the current UTC timestamp in ISO 8601 format.
    Used for `published_at` display ordering. `created_at` is always
    delegated to the database DEFAULT NOW() for forensic immutability."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def compute_url_hash(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()


def estimate_read_time(text: str) -> int:
    word_count = len(text.split())
    return max(1, round(word_count / 200))


def truncate_content(text: str, max_chars: int = MAX_CONTENT_CHARS) -> str:
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars]
    last_period = truncated.rfind(".")
    if last_period > max_chars // 2:
        return text[: last_period + 1]
    return truncated


# ---------------------------------------------------------------------------
# Unified articles-only ingestion — all intelligence goes into `articles`
# ---------------------------------------------------------------------------

# All valid CTI categories map to the unified `articles` table.
# Category tagging is preserved so the frontend can filter by `category`.
VALID_CATEGORIES: frozenset[str] = frozenset({
    "Threat Intelligence", "Vulnerability Research", "OSINT",
    "Cyber Crime", "Malware Analysis", "Ransomware", "Malware",
    "APT Activity", "Nation State", "Advanced Persistent Threat",
    "Open Source Intelligence", "Tools", "Security Tools",
    "Supply Chain Security", "Cloud Security", "AI Security",
    "ICS/OT Security", "Data Breach", "Phishing",
})


def normalize_category(raw: str) -> str:
    """Canonicalize a category string to one of the known categories."""
    cleaned = raw.strip()
    for valid in sorted(VALID_CATEGORIES, key=len, reverse=True):
        if cleaned.lower() == valid.lower():
            return valid
    return cleaned if cleaned else "Threat Intelligence"


def generate_slug(title: str) -> str:
    """Generate a URL-safe slug from an article title."""
    slug = title.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    slug = re.sub(r'-{2,}', '-', slug)
    slug = slug.strip('-')
    return slug[:200]


def build_article_row(
    article: "RawArticle",
    sitrep: dict[str, Any],
    image_url: str | None = None,
) -> dict[str, Any]:
    """Map a RawArticle + validated SITREP into an ArticleInsert model.

    Uses the Pydantic ArticleInsert model to enforce that the resulting
    dict strictly matches the Postgres articles schema. If validation
    fails, this raises — the caller must handle the exception.
    """
    full_content = sitrep.get("content", "")
    title = sitrep.get("title", article.title)
    raw_category = sitrep.get("category", article.source_category)

    insert = ArticleInsert(
        title=title,
        slug=generate_slug(title),
        author=pick_author(),
        category=raw_category,  # Validator normalizes this
        content=full_content,
        excerpt=sitrep.get("executive_summary", ""),
        read_time=estimate_read_time(full_content),
        published_at=utc_now_iso(),
        url_hash=compute_url_hash(article.url),
        financial_exposure=sitrep.get("financialExposure"),
        regulatory_risk=sitrep.get("regulatoryRisk"),
        mitigation_impact=sitrep.get("mitigationImpact"),
        yara_rule=sitrep.get("yaraRule"),
        image_url=image_url,
    )

    return insert.to_supabase_dict()


# ---------------------------------------------------------------------------
# Helper: retry decorator with exponential backoff
# ---------------------------------------------------------------------------

async def retry_async(
    coro_factory,
    max_retries: int = 3,
    base_delay: float = 1.0,
    label: str = "operation",
) -> Any:
    """Execute an async operation with exponential backoff retry logic."""
    last_exc: Exception | None = None
    for attempt in range(1, max_retries + 1):
        try:
            return await coro_factory()
        except (asyncio.TimeoutError, aiohttp.ClientError, Exception) as exc:
            last_exc = exc
            if attempt < max_retries:
                delay = (base_delay ** attempt) + random.uniform(0, 1)
                log.warning(
                    "%s failed (attempt %d/%d): %s — retrying in %.1fs",
                    label, attempt, max_retries, exc, delay,
                )
                await asyncio.sleep(delay)
            else:
                log.error(
                    "%s failed after %d attempts: %s",
                    label, max_retries, exc,
                )
    raise last_exc  # type: ignore[misc]


# ---------------------------------------------------------------------------
# 1. Feed Fetcher
# ---------------------------------------------------------------------------

async def fetch_feed(
    session: aiohttp.ClientSession,
    source: FeedSource,
) -> str | None:
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
    }
    timeout = aiohttp.ClientTimeout(total=30)

    async def _fetch():
        async with session.get(
            source.url, headers=headers, timeout=timeout,
        ) as resp:
            resp.raise_for_status()
            text = await resp.text()
            log.info(
                "Fetched %s — HTTP %d (%.1f KB)",
                source.name, resp.status, len(text) / 1024,
            )
            return text

    try:
        return await retry_async(_fetch, max_retries=3, label=f"fetch:{source.name}")
    except Exception:
        return None


async def fetch_all_feeds(
    session: aiohttp.ClientSession,
) -> list[tuple[FeedSource, str | None]]:
    tasks = [fetch_feed(session, src) for src in FEED_SOURCES]
    results = await asyncio.gather(*tasks, return_exceptions=False)
    return [(src, text) for src, text in zip(FEED_SOURCES, results)]


# ---------------------------------------------------------------------------
# 2. Feed Parser
# ---------------------------------------------------------------------------

@dataclass
class RawArticle:
    source_name: str
    source_category: str
    url: str
    title: str
    description: str
    published: str | None


def parse_feed(
    raw_xml: str,
    source: FeedSource,
) -> list[RawArticle]:
    feed = feedparser.parse(raw_xml)
    entries: list[RawArticle] = []

    for entry in feed.entries:
        url = (entry.get("link") or "").strip()
        if not url:
            continue

        title = (entry.get("title") or "").strip()
        desc = (
            entry.get("summary")
            or entry.get("description")
            or entry.get("content", [{}])[0].get("value")
            or ""
        ).strip()

        if not title and not desc:
            continue

        published: str | None = None
        for field_name in ("published", "updated", "created"):
            raw = entry.get(field_name)
            if raw:
                published = str(raw)
                break

        entries.append(RawArticle(
            source_name=source.name,
            source_category=source.category,
            url=url,
            title=title,
            description=desc,
            published=published,
        ))

    log.info("Parsed %d entries from %s", len(entries), source.name)
    return entries


# ---------------------------------------------------------------------------
# 3. LLM Analyst Pipeline
# ---------------------------------------------------------------------------

SITREP_REQUIRED_KEYS: frozenset[str] = frozenset({
    "title", "executive_summary", "content", "mitre_attack_ttps",
    "category", "severity", "financialExposure", "regulatoryRisk",
    "mitigationImpact",
})


def validate_sitrep(raw: dict[str, Any]) -> dict[str, Any] | None:
    """Validate LLM output through the Pydantic ArticleSITREP model.

    This replaces the manual key-check with strict type enforcement.
    If the LLM output doesn't conform, the article is DROPPED.
    """
    if not isinstance(raw, dict):
        return None
    try:
        sitrep = ArticleSITREP(**raw)
        # Re-export as dict with validated/normalized values
        validated = sitrep.model_dump()
        # Merge back any extra fields the model ignores (e.g., ai_image_prompt)
        for key in ("ai_image_prompt",):
            if key in raw:
                validated[key] = raw[key]
        # Run IoC hallucination gate
        if validated.get("iocs"):
            validated["iocs"] = validate_iocs(validated["iocs"])
        return validated
    except Exception as exc:
        log.warning("SITREP validation failed: %s", exc)
        return None


async def analyze_article(
    llm: AsyncOpenAI,
    article: RawArticle,
) -> dict[str, Any] | None:
    """Send a single article to the LLM and return a validated SITREP dict."""
    raw_text = f"Title: {article.title}\n\n{article.description}"
    raw_text = truncate_content(raw_text, MAX_CONTENT_CHARS)

    if not raw_text.strip():
        log.debug("Skipping empty article from %s", article.source_name)
        return None

    t0 = time.monotonic()

    async def _call_llm():
        return await llm.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": CTI_SYSTEM_PROMPT},
                {"role": "user", "content": raw_text},
            ],
            temperature=0.15,
            max_tokens=8_192,
            response_format={"type": "json_object"},
        )

    try:
        response = await asyncio.wait_for(
            retry_async(_call_llm, max_retries=2, label=f"LLM:{article.title[:50]}"),
            timeout=LLM_TIMEOUT_SEC,
        )
    except asyncio.TimeoutError:
        log.warning("LLM timeout analysing '%s' (%ds)", article.title, LLM_TIMEOUT_SEC)
        return None
    except Exception as exc:
        log.error("LLM error for '%s': %s", article.title, exc)
        return None

    latency = time.monotonic() - t0
    log.info(
        "LLM analysed '%s' — %.1fs (model: %s)",
        article.title[:60], latency, LLM_MODEL,
    )

    content = response.choices[0].message.content or ""
    if not content:
        log.warning("Empty LLM response for '%s'", article.title)
        return None

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        log.warning("LLM returned invalid JSON for '%s'", article.title)
        return None

    if parsed.get("title") is None:
        log.info("LLM flagged '%s' as non-intelligence — skipping", article.title)
        return None

    return validate_sitrep(parsed)


# ---------------------------------------------------------------------------
# 3b. AI Image Generation Pipeline
# ---------------------------------------------------------------------------

async def generate_image_prompt(
    llm: AsyncOpenAI,
    sitrep: dict[str, Any],
) -> str | None:
    """Generate a cinematic cyberpunk image prompt tailored to the threat report."""
    article_context = (
        f"Title: {sitrep.get('title', '')}\n"
        f"Category: {sitrep.get('category', '')}\n"
        f"Summary: {sitrep.get('executive_summary', '')[:300]}"
    )

    async def _call():
        response = await llm.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": IMAGE_SYSTEM_PROMPT},
                {"role": "user", "content": article_context},
            ],
            temperature=0.9,
            max_tokens=300,
        )
        return response.choices[0].message.content or ""

    try:
        prompt = await asyncio.wait_for(
            retry_async(_call, max_retries=2, label="image_prompt"),
            timeout=30,
        )
        return prompt.strip() if prompt else None
    except Exception as exc:
        log.warning("Image prompt generation failed: %s", exc)
        return None


async def generate_image(
    llm: AsyncOpenAI,
    image_prompt: str,
) -> str | None:
    """Generate an image using DALL-E 3 and return the image URL."""
    if not ENABLE_IMAGES:
        log.debug("Image generation disabled (set ENABLE_IMAGES=true to enable)")
        return None

    async def _call():
        response = await llm.images.generate(
            model="dall-e-3",
            prompt=(
                f"{image_prompt} — Dark, cinematic, cyberpunk abstract art. "
                f"NO text, NO letters, NO words, NO people. Elegant and sophisticated."
            )[:1000],
            size="1024x1024",
            quality="standard",
            n=1,
        )
        return response.data[0].url

    try:
        image_url = await asyncio.wait_for(
            retry_async(_call, max_retries=2, label="dalle_generate"),
            timeout=60,
        )
        log.info("DALL-E 3 image generated: %.60s...", image_url)
        return image_url
    except Exception as exc:
        log.error("DALL-E 3 image generation failed: %s", exc)
        return None


async def upload_image_to_supabase_storage(
    image_url: str,
    filename: str,
) -> str | None:
    """Download an image from URL and upload to Supabase Storage for permanence.
    Returns the permanent Supabase Storage URL."""
    if not ENABLE_IMAGES:
        return image_url

    bucket = "article-images"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }

    async with aiohttp.ClientSession() as session:
        # Step 1: Download the generated image
        try:
            async with session.get(image_url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status != 200:
                    log.warning("Failed to download generated image: HTTP %d", resp.status)
                    return image_url
                image_data = await resp.read()
        except Exception as exc:
            log.warning("Failed to download generated image: %s", exc)
            return image_url

        # Step 2: Upload to Supabase Storage
        if not filename.endswith(".png"):
            filename = f"{filename}.png"

        upload_url = (
            f"{SUPABASE_URL}/storage/v1/object/{bucket}/{filename}"
        )
        upload_headers = {
            **headers,
            "Content-Type": "image/png",
            "x-upsert": "true",
        }

        try:
            async with session.post(
                upload_url,
                headers=upload_headers,
                data=image_data,
                timeout=aiohttp.ClientTimeout(total=30),
            ) as resp:
                if resp.status in (200, 201):
                    permanent_url = (
                        f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{filename}"
                    )
                    log.info("Image uploaded to Supabase Storage: %s", permanent_url)
                    return permanent_url
                else:
                    body = await resp.text()
                    log.warning(
                        "Supabase Storage upload failed (HTTP %d): %s",
                        resp.status, body[:200],
                    )
                    return image_url  # Fall back to original URL
        except Exception as exc:
            log.warning("Supabase Storage upload error: %s", exc)
            return image_url


async def process_image_for_article(
    llm: AsyncOpenAI,
    sitrep: dict[str, Any],
) -> str | None:
    """Full pipeline: generate image prompt → generate image → upload to Supabase."""
    if not ENABLE_IMAGES:
        return None

    # Use the pre-generated AI image prompt from the SITREP, or generate one
    image_prompt = sitrep.get("ai_image_prompt", "")
    if not image_prompt:
        image_prompt = await generate_image_prompt(llm, sitrep)
        if not image_prompt:
            return None

    image_url = await generate_image(llm, image_prompt)
    if not image_url:
        return None

    # Upload to Supabase for permanence
    unique_filename = f"threat-{uuid.uuid4().hex[:12]}"
    permanent_url = await upload_image_to_supabase_storage(image_url, unique_filename)
    return permanent_url


# ---------------------------------------------------------------------------
# 4. Multi-Table Supabase Dispatcher
# ---------------------------------------------------------------------------

async def fetch_existing_hashes(
    session: aiohttp.ClientSession,
) -> set[str]:
    """Return the set of url_hash values already in the articles table."""
    url = f"{SUPABASE_URL}/rest/v1/articles?select=url_hash"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Accept": "application/json",
    }
    try:
        async with session.get(url, headers=headers) as resp:
            if resp.status != 200:
                log.warning("Failed to fetch existing hashes (HTTP %d)", resp.status)
                return set()
            data = await resp.json()
            return {row["url_hash"] for row in data if row.get("url_hash")}
    except Exception as exc:
        log.error("Error fetching existing hashes: %s", exc)
        return set()


async def upsert_to_table(
    table_name: str,
    rows: list[dict[str, Any]],
    conflict_column: str = "url_hash",
) -> int:
    """Upsert rows into a Supabase table with retry logic. Returns count inserted."""
    if not rows:
        return 0

    batch_size = 5  # Aggressive small batches for reliability
    total = 0
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    async with aiohttp.ClientSession(
        timeout=aiohttp.ClientTimeout(total=30),
    ) as session:
        for i in range(0, len(rows), batch_size):
            batch = rows[i: i + batch_size]
            url = f"{SUPABASE_URL}/rest/v1/{table_name}?on_conflict={conflict_column}"

            async def _upsert_batch():
                async with session.post(
                    url, headers=headers, json=batch,
                ) as resp:
                    if resp.status in (200, 201, 204):
                        return len(batch)
                    else:
                        body = await resp.text()
                        raise aiohttp.ClientError(
                            f"HTTP {resp.status}: {body[:300]}"
                        )

            try:
                count = await retry_async(
                    _upsert_batch,
                    max_retries=3,
                    label=f"upsert:{table_name}:batch{i}",
                )
                total += count
                log.info(
                    "Upserted %d rows to %s (batch %d-%d)",
                    count, table_name, i + 1,
                    min(i + batch_size, len(rows)),
                )
            except Exception as exc:
                log.error(
                    "Upsert batch %d-%d to %s failed: %s",
                    i + 1, min(i + batch_size, len(rows)),
                    table_name, exc,
                )

            await asyncio.sleep(0.5)  # Throttle between batches

    return total


async def dispatch_articles(
    rows: list[dict[str, Any]],
) -> dict[str, int]:
    """Dispatch all articles to the unified `articles` table only."""
    if not rows:
        return {"articles": 0}

    count = await upsert_to_table("articles", rows, conflict_column="url_hash")
    return {"articles": count}


# ---------------------------------------------------------------------------
# 5. Orchestrator
# ---------------------------------------------------------------------------

async def ingestion_cycle() -> dict[str, Any]:
    """Execute one complete ingestion cycle."""
    start = time.monotonic()
    telemetry: dict[str, Any] = {
        "feeds_fetched": 0,
        "entries_parsed": 0,
        "already_seen": 0,
        "llm_analysed": 0,
        "images_generated": 0,
        "dispatched": {},
        "errors": 0,
        "llm_total_latency": 0.0,
        "cycle_seconds": 0.0,
    }

    llm = AsyncOpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)

    async with aiohttp.ClientSession(
        headers={"User-Agent": random.choice(USER_AGENTS)},
        timeout=aiohttp.ClientTimeout(total=30),
    ) as http:

        log.info("=== ZAYRON-X Ingestion Cycle ===")

        # Step A: Fetch all feeds
        feed_results = await fetch_all_feeds(http)
        telemetry["feeds_fetched"] = sum(
            1 for _, text in feed_results if text is not None
        )

        # Step B: Parse feeds
        all_articles: list[RawArticle] = []
        for source, raw_xml in feed_results:
            if raw_xml is None:
                continue
            try:
                articles = parse_feed(raw_xml, source)
                all_articles.extend(articles)
                telemetry["entries_parsed"] += len(articles)
            except Exception as exc:
                log.error("Parse error for %s: %s", source.name, exc)
                telemetry["errors"] += 1

        if not all_articles:
            log.info("No articles found this cycle.")
            telemetry["cycle_seconds"] = time.monotonic() - start
            return telemetry

        # Step C: Filter duplicates
        existing_hashes = await fetch_existing_hashes(http)
        new_articles = [
            a for a in all_articles
            if compute_url_hash(a.url) not in existing_hashes
        ]
        telemetry["already_seen"] = len(all_articles) - len(new_articles)
        log.info(
            "%d total entries, %d new, %d already in DB",
            len(all_articles), len(new_articles), telemetry["already_seen"],
        )

        if not new_articles:
            log.info("Nothing new to analyse.")
            telemetry["cycle_seconds"] = time.monotonic() - start
            return telemetry

        # Step D: LLM analysis with rate limiting
        new_articles = new_articles[:MAX_ARTICLES_PER_CYCLE]
        analysed: list[tuple[RawArticle, dict[str, Any], str | None]] = []
        semaphore = asyncio.Semaphore(1)

        async def analyse_one(article: RawArticle) -> None:
            async with semaphore:
                t0 = time.monotonic()
                sitrep = await analyze_article(llm, article)
                if sitrep is not None:
                    image_url = await process_image_for_article(llm, sitrep)
                    analysed.append((article, sitrep, image_url))
                    telemetry["llm_total_latency"] += time.monotonic() - t0
                    telemetry["llm_analysed"] += 1
                    if image_url:
                        telemetry["images_generated"] += 1
                await asyncio.sleep(3)  # Rate-limit throttle

        tasks = [analyse_one(a) for a in new_articles]
        await asyncio.gather(*tasks, return_exceptions=True)

        if not analysed:
            log.info("No articles survived LLM analysis.")
            telemetry["cycle_seconds"] = time.monotonic() - start
            return telemetry

        # Step E: Build rows and dispatch to tables
        rows = [
            build_article_row(article, sitrep, image_url)
            for article, sitrep, image_url in analysed
        ]

        dispatch_results = await dispatch_articles(rows)
        telemetry["dispatched"] = dispatch_results

    telemetry["cycle_seconds"] = time.monotonic() - start
    log.info(
        "=== Cycle complete: dispatched=%s, LLM=%d, images=%d, %.1fs ===",
        dispatch_results, telemetry["llm_analysed"],
        telemetry["images_generated"], telemetry["cycle_seconds"],
    )
    return telemetry


async def main_loop() -> None:
    """Daemon main loop — runs ingestion cycles on a polling interval."""
    log.info(
        "ZAYRON-X CTI Engine starting — polling every %d min (model: %s)",
        POLL_INTERVAL_MINUTES, LLM_MODEL,
    )
    log.info("LLM endpoint: %s", LLM_BASE_URL)
    log.info("Image generation: %s", "ENABLED" if ENABLE_IMAGES else "DISABLED")

    if not LLM_API_KEY:
        log.critical("LLM_API_KEY is not set. Export LLM_API_KEY and retry.")
        sys.exit(1)

    cycle_count = 0
    while True:
        cycle_count += 1
        try:
            telemetry = await ingestion_cycle()
        except Exception as exc:
            log.critical("Unhandled exception in cycle %d: %s", cycle_count, exc)
            telemetry = {"errors": 1, "llm_analysed": 0}

        if telemetry.get("llm_total_latency", 0) > 0 and telemetry.get("llm_analysed", 0) > 0:
            avg_llm = telemetry["llm_total_latency"] / max(telemetry["llm_analysed"], 1)
            log.info(
                "Telemetry cycle=%d | feeds=%d | parsed=%d | "
                "llm_ok=%d | avg_llm=%.1fs | images=%d | dispatched=%s | "
                "errors=%d | cycle_time=%.1fs",
                cycle_count,
                telemetry.get("feeds_fetched", 0),
                telemetry.get("entries_parsed", 0),
                telemetry.get("llm_analysed", 0),
                avg_llm,
                telemetry.get("images_generated", 0),
                telemetry.get("dispatched", {}),
                telemetry.get("errors", 0),
                telemetry.get("cycle_seconds", 0),
            )

        log.info("Sleeping %d min until next cycle …", POLL_INTERVAL_MINUTES)
        await asyncio.sleep(POLL_INTERVAL_MINUTES * 60)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    if "--once" in sys.argv:
        async def _once() -> None:
            if not LLM_API_KEY:
                log.critical("LLM_API_KEY is not set.")
                sys.exit(1)
            telemetry = await ingestion_cycle()
            print(json.dumps(telemetry, indent=2, default=str))
        asyncio.run(_once())
    else:
        asyncio.run(main_loop())


if __name__ == "__main__":
    main()
