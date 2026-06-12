"""
workers/agents/harvester.py — Deterministic Pre-Processor (NO LLM)

Role: Raw intelligence normalization, language heuristics, regex entity extraction,
and keyword-based preliminary classification.

This module contains ZERO LLM calls. It performs local, deterministic operations only.
All LLM-based analysis is handled by the single-pass Omni-Agent pipeline in omni_crew.py.
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

from workers.contracts.inter_agent import HarvestPayload

log = logging.getLogger("zayron_x_harvester")

# ---------------------------------------------------------------------------
# Dynamic Target Matrix Calibration Loading
# ---------------------------------------------------------------------------

TARGETS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "targets.json",
)


def load_calibration_targets() -> dict[str, list[str]]:
    """Load and clean target sources from targets.json for agent calibration."""
    try:
        if os.path.exists(TARGETS_PATH):
            with open(TARGETS_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as exc:
        log.warning("Failed to load targets.json calibration matrix: %s", exc)
    return {"telegram_channels": [], "darkweb_onion_links": [], "osint_rss": []}


TARGETS_MATRIX = load_calibration_targets()


def is_tier1_source(source: str) -> bool:
    """Verify if the source is part of the 35 Tier-1 CTI channels."""
    if not source:
        return False

    normalized_source = source.strip().lower()
    cleaned_source = (
        normalized_source.replace("https://t.me/", "")
        .replace("http://t.me/", "")
        .replace("@", "")
        .strip()
    )

    for chan in TARGETS_MATRIX.get("telegram_channels", []):
        if cleaned_source == chan.lower():
            return True

    for rss in TARGETS_MATRIX.get("osint_rss", []):
        url_match = re.search(r"\((https?://.*?)\)", rss)
        url = url_match.group(1) if url_match else rss
        if cleaned_source in url.lower() or url.lower() in normalized_source:
            return True

    for onion in TARGETS_MATRIX.get("darkweb_onion_links", []):
        url_match = re.search(r"\((http://.*?\.onion)\)", onion)
        url = url_match.group(1) if url_match else onion
        if cleaned_source in url.lower() or url.lower() in normalized_source:
            return True

    return False


# ---------------------------------------------------------------------------
# Regex Patterns for Deterministic Entity Extraction
# ---------------------------------------------------------------------------

_CVE_PATTERN = re.compile(r"CVE-\d{4}-\d{4,}", re.IGNORECASE)
_VENDOR_PATTERN = re.compile(
    r"\b(Microsoft|Apple|Google|Cisco|VMware|Fortinet|Palo Alto|SolarWinds|"
    r"Apache|OpenSSL|Linux|Windows|Android|iOS|macOS|AWS|Azure|GCP|Kubernetes|"
    r"Docker|Jenkins|GitLab|JetBrains|Atlassian|SAP|Oracle|IBM|Dell|HP|Juniper|"
    r"Citrix|F5|Ivanti|Barracuda|MOVEit|GoAnywhere|Progress Software)\b",
    re.IGNORECASE,
)
_THREAT_ACTOR_PATTERN = re.compile(
    r"\b(APT\d{1,3}|Lazarus|Cozy Bear|Fancy Bear|Sandworm|Volt Typhoon|"
    r"Salt Typhoon|LockBit|BlackCat|ALPHV|Clop|REvil|Conti|DarkSide|"
    r"BlackMatter|Hive|Royal|Play|Akira|Rhysida|Scattered Spider|"
    r"TA\d{3,4}|FIN\d{1,2}|UNC\d{3,4})\b",
    re.IGNORECASE,
)
_MALWARE_PATTERN = re.compile(
    r"\b(ransomware|trojan|backdoor|rootkit|wiper|stealer|loader|dropper|"
    r"botnet|C2|command.and.control|keylogger|spyware|adware|cryptominer|"
    r"webshell|cobalt.strike|mimikatz|metasploit)\b",
    re.IGNORECASE,
)

# Category keyword mapping (order matters — first match wins)
_CATEGORY_KEYWORDS: list[tuple[str, list[str]]] = [
    ("VULNERABILITY", ["cve", "patch", "vulnerability"]),
    ("EXPLOIT", ["exploit", "proof-of-concept", "poc"]),
    ("MALWARE", ["virus", "trojan", "backdoor", "ransomware", "malware", "payload"]),
    ("DARK_WEB", ["dark web", "darkweb", "onion", "leak", "forum", "marketplace", "credentials"]),
    ("THREAT_ACTOR", ["actor", "campaign", "ttps", "apt", "cybercriminal"]),
]


# ---------------------------------------------------------------------------
# System Prompt — Extraction & Translation Directive
# ---------------------------------------------------------------------------

HARVESTER_SYSTEM_PROMPT: str = """\
You are the Intelligence Harvester for ZAYRON-X — a Fortune 500-class threat \
intelligence corporation. Your sole function is to receive raw intelligence \
feeds (from Telegram channels, RSS feeds, dark web forums) and produce a \
structured extraction.

OPERATIONAL DIRECTIVES:
1. DETECT the language of the input. If non-English, TRANSLATE the full \
   content to flawless cybersecurity English. Preserve original threat actor \
   names and malware family names in parentheses.
2. CLASSIFY the threat.
3. EXTRACT named entities: CVE IDs, malware families, APT group names, \
   product names, vendor names, affected technologies.
4. FLAG whether the text contains CVE references (has_cve_reference) and \
   potential IoC indicators like IPs, domains, hashes (has_ioc_indicators).
5. OUTPUT word count of the translated text.

STRICT CLASSIFICATION CONSTRAINT:
You MUST classify the threat report and output ONLY ONE of the following categories in 'preliminary_category' in UPPERCASE:
- 'MALWARE': Any reports involving viruses, trojans, backdoors, ransomware binaries, or malicious payloads.
- 'THREAT_ACTOR': Reports about cybercriminal groups, APTs, or specific nation-state campaigns.
- 'VULNERABILITY': Reports regarding CVEs, software bugs, zero-days, or patch requirements.
- 'EXPLOIT': Reports detailing proof-of-concept code, exploit kits, or successful exploitation methodologies.
- 'DARK_WEB': Reports about leak sites, illicit forums, onion services, or credentials for sale on dark web marketplaces.

BANNED BEHAVIORS:
- Do NOT analyse the threat — that is downstream.
- Do NOT generate IoCs — that is the Validator's role.
- Do NOT produce a report — that is the Weaver's role.
- Do NOT fabricate or infer any data not present in the raw input.

OUTPUT FORMAT (strict JSON, no markdown fences):
{
  "detected_language": "en|ru|ar|zh|...",
  "translated_text": "Full English translation or original if already English",
  "preliminary_category": "MALWARE|THREAT_ACTOR|VULNERABILITY|EXPLOIT|DARK_WEB",
  "extracted_entities": ["CVE-2025-XXXXX", "APT28", "Cisco ASA", ...],
  "has_cve_reference": true|false,
  "has_ioc_indicators": true|false,
  "word_count": 350
}
"""


# ---------------------------------------------------------------------------
# Language Detection (Heuristics-Based, No LLM)
# ---------------------------------------------------------------------------

def detect_language(text: str) -> str:
    """Deterministically detect language of input text using Unicode range heuristics."""
    if not text or len(text.strip()) < 10:
        return "en"

    sample = text[:500]
    cyrillic_count = sum(1 for c in sample if "\u0400" <= c <= "\u04FF")
    arabic_count = sum(1 for c in sample if "\u0600" <= c <= "\u06FF")
    cjk_count = sum(1 for c in sample if "\u4E00" <= c <= "\u9FFF")
    latin_count = sum(1 for c in sample if "a" <= c.lower() <= "z")

    total = max(1, cyrillic_count + arabic_count + cjk_count + latin_count)

    if cyrillic_count / total > 0.20:
        return "ru"
    if arabic_count / total > 0.20:
        return "ar"
    if cjk_count / total > 0.20:
        return "zh"

    return "en"


# ---------------------------------------------------------------------------
# Deterministic Category Classification
# ---------------------------------------------------------------------------

def classify_category(text: str) -> str:
    """Keyword-based category classification — no LLM."""
    if not text:
        return "THREAT_ACTOR"
    lower = text.lower()
    for category, keywords in _CATEGORY_KEYWORDS:
        if keywords and any(kw in lower for kw in keywords):
            return category
    return "THREAT_ACTOR"


# ---------------------------------------------------------------------------
# Deterministic Entity Extraction
# ---------------------------------------------------------------------------

def extract_entities(text: str) -> list[str]:
    """Extract named entities from raw text using regex patterns."""
    entities: list[str] = []

    # CVE identifiers
    cves = _CVE_PATTERN.findall(text)
    entities.extend([c.upper() for c in cves])

    # Threat actors
    actors = _THREAT_ACTOR_PATTERN.findall(text)
    entities.extend(actors)

    # Vendor/product names
    vendors = _VENDOR_PATTERN.findall(text)
    entities.extend(vendors)

    # Deduplicate, preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for e in entities:
        if e.upper() not in seen:
            seen.add(e.upper())
            unique.append(e)

    return unique[:30]  # Cap to prevent token explosion


# ---------------------------------------------------------------------------
# Main Public Interface: Deterministic Pre-Processing
# ---------------------------------------------------------------------------

def deterministic_preprocess(raw_text: str, source_channel: str) -> dict[str, Any]:
    """
    Deterministic pre-processing of raw feed data.

    Returns a structured context dict that enriches the Omni-Agent prompt.
    NO LLM is invoked. All operations are purely regex/heuristic.
    """
    if not raw_text:
        raw_text = ""

    detected_language = detect_language(raw_text)
    entities = extract_entities(raw_text)
    preliminary_category = classify_category(raw_text)

    cve_ids = _CVE_PATTERN.findall(raw_text)
    has_cve_reference = len(cve_ids) > 0
    has_ioc_indicators = bool(
        re.search(
            r"\b(?:\d{1,3}\.){3}\d{1,3}\b|"              # IPv4
            r"\b[a-fA-F0-9]{32}\b|"                       # MD5
            r"\b[a-fA-F0-9]{40}\b|"                       # SHA1
            r"\b[a-fA-F0-9]{64}\b|"                       # SHA256
            r"(?:https?://)\S+",                           # URL
            raw_text,
        )
    )

    is_tier1 = is_tier1_source(source_channel)
    if is_tier1:
        log.info("Deterministic pre-processing: Tier-1 source verified — %s", source_channel)
    else:
        log.debug("Deterministic pre-processing: Unverified source — %s", source_channel)

    return {
        "detected_language": detected_language,
        "preliminary_category": preliminary_category,
        "extracted_entities": entities,
        "cve_ids": [c.upper() for c in cve_ids[:10]],
        "has_cve_reference": has_cve_reference,
        "has_ioc_indicators": has_ioc_indicators,
        "word_count": len(raw_text.split()),
        "is_tier1_source": is_tier1,
        "source_channel": source_channel,
    }


def build_preprocess_context_block(raw_text: str, source_channel: str) -> str:
    """
    Build a pre-processed context block string to inject into the Omni-Agent prompt.
    This gives the LLM ground-truth anchors before it begins its internal cognition.
    """
    ctx = deterministic_preprocess(raw_text, source_channel)
    lines = [
        "[DETERMINISTIC PRE-PROCESSING CONTEXT — DO NOT CONTRADICT THESE VALUES]",
        f"Source Channel: {source_channel} | Tier-1 Verified: {ctx['is_tier1_source']}",
        f"Detected Language: {ctx['detected_language']}",
        f"Preliminary Category (Keyword Match): {ctx['preliminary_category']}",
        f"CVE IDs Found (Regex): {', '.join(ctx['cve_ids']) or 'None'}",
        f"Entities Detected: {', '.join(ctx['extracted_entities'][:15]) or 'None'}",
        f"Has CVE Reference: {ctx['has_cve_reference']} | Has IoC Indicators: {ctx['has_ioc_indicators']}",
        f"Word Count: {ctx['word_count']}",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Legacy compatibility shim for unit tests that import HarvestPayload creation
# ---------------------------------------------------------------------------

def build_harvest_payload(raw_text: str, source_channel: str) -> HarvestPayload:
    """Create a HarvestPayload from deterministic pre-processing (no LLM)."""
    ctx = deterministic_preprocess(raw_text, source_channel)
    return HarvestPayload(
        raw_text=raw_text,
        source_channel=source_channel,
        detected_language=ctx["detected_language"],
        translated_text=raw_text,  # No LLM translation; pass raw for Omni-Agent
        preliminary_category=ctx["preliminary_category"],
        extraction_timestamp=datetime.now(timezone.utc).isoformat(),
        extracted_entities=ctx["extracted_entities"],
        has_cve_reference=ctx["has_cve_reference"],
        has_ioc_indicators=ctx["has_ioc_indicators"],
        word_count=ctx["word_count"],
    )


# ---------------------------------------------------------------------------
# Agent metadata
# ---------------------------------------------------------------------------

AGENT_CONFIG: dict[str, str] = {
    "role": "Deterministic Intelligence Pre-Processor",
    "goal": (
        "Perform local, deterministic normalization of raw intelligence feeds "
        "using regex and heuristics. No LLM calls. Provides ground-truth anchors "
        "for the downstream Omni-Agent single-pass pipeline."
    ),
    "backstory": (
        "A signals intelligence preprocessing layer that deterministically extracts "
        "CVEs, threat actors, vendor names, and language signals from raw feeds, "
        "anchoring the LLM's cognition to verifiable ground-truth values."
    ),
}
