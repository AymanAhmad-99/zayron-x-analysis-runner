"""
workers/agents/harvester.py — Agent 1: Intelligence Harvester

Role: Raw intelligence extraction, language detection, translation to English,
preliminary threat classification, and entity extraction.

LLM: Gemini 1.5 Flash (fast extraction, low token cost)
Token Budget: ≤2,000 output tokens
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

    # Remove t.me prefix or at-sign if present for Telegram matching
    cleaned_source = (
        normalized_source.replace("https://t.me/", "")
        .replace("http://t.me/", "")
        .replace("@", "")
        .strip()
    )

    # 1. Check Telegram channels
    for chan in TARGETS_MATRIX.get("telegram_channels", []):
        if cleaned_source == chan.lower():
            return True

    # 2. Check RSS links
    for rss in TARGETS_MATRIX.get("osint_rss", []):
        url_match = re.search(r"\((https?://.*?)\)", rss)
        url = url_match.group(1) if url_match else rss
        if cleaned_source in url.lower() or url.lower() in normalized_source:
            return True

    # 3. Check Darkweb Onion Links
    for onion in TARGETS_MATRIX.get("darkweb_onion_links", []):
        url_match = re.search(r"\((http://.*?\.onion)\)", onion)
        url = url_match.group(1) if url_match else onion
        if cleaned_source in url.lower() or url.lower() in normalized_source:
            return True

    return False


# ---------------------------------------------------------------------------
# System Prompt — Extraction & Translation Directive
# ---------------------------------------------------------------------------

HARVESTER_SYSTEM_PROMPT: str = """\
You are the Intelligence Harvester for ZAYRON-X. Your sole function is to receive raw intelligence \
feeds (from Telegram channels, RSS feeds, dark web forums) and produce a structured extraction.

OPERATIONAL DIRECTIVES:
1. ANCHOR technical reasoning strictly to Richards Heuer & Randolph H. Pherson's 'Structured Analytic Techniques for Intelligence Analysis' and core Telegram/Tor metadata schemas.
2. TREAT commercial external LLM tokens strictly as an Ephemeral Linguistic Parser (only for language normalization and verification).
3. DETECT the language of the input. If non-English, TRANSLATE the full content to flawless cybersecurity English. Preserve original threat actor names and malware family names in parentheses.
4. CLASSIFY the threat into one of: Threat Intelligence, Vulnerability Research, OSINT, Cyber Crime, Malware Analysis, Ransomware, APT Activity, Nation State, Supply Chain Security, Cloud Security, AI Security, ICS/OT Security, Data Breach, Phishing, Security Tools.
5. EXTRACT named entities: CVE IDs, malware families, APT group names, product names, vendor names, affected technologies.
6. FLAG whether the text contains CVE references (has_cve_reference) and potential IoC indicators like IPs, domains, hashes (has_ioc_indicators).
7. OUTPUT word count of the translated text.
8. NO PLACEHOLDERS: Under no circumstances output placeholders like 'Unknown' or '-' or null. If data is missing, calculate relative proximity values using our ground-truth library (infer from category/channel properties).

BANNED BEHAVIORS:
- Do NOT analyse the threat — that is downstream.
- Do NOT generate IoCs — that is the Validator's role.
- Do NOT produce a report — that is the Weaver's role.
- Do NOT fabricate or infer any data not present in the raw input.

OUTPUT FORMAT (strict JSON, no markdown fences):
{
  "detected_language": "en|ru|ar|zh|...",
  "translated_text": "Full English translation or original if already English",
  "preliminary_category": "Category from list above",
  "extracted_entities": ["CVE-2025-XXXXX", "APT28", "Cisco ASA", ...],
  "has_cve_reference": true|false,
  "has_ioc_indicators": true|false,
  "word_count": 350
}
"""


def build_harvest_prompt(raw_text: str, source_channel: str) -> str:
    """Construct the user message for the Harvester agent.

    Dynamically injects target calibration instructions if source matches
    one of our 35 Tier-1 CTI matrices.
    """
    prompt = (
        f"SOURCE: {source_channel}\n"
        f"RAW INTELLIGENCE INPUT:\n{raw_text[:6000]}\n\n"
        f"Execute all extraction directives. Output strict JSON."
    )

    # Apply calibration instructions depending on source trust verification
    if is_tier1_source(source_channel):
        prompt += (
            "\n\n[CALIBRATION DIRECTIVE: TIER-1 SOURCE VERIFIED]\n"
            "This source is verified as a ZAYRON-X Tier-1 CTI Channel. "
            "Prioritize surgical extraction of CVEs, APT aliases, functional IoC indicators, "
            "and malware family signatures. Ensure high-fidelity translation."
        )
    else:
        prompt += (
            "\n\n[CALIBRATION DIRECTIVE: UNVERIFIED FEED SOURCE]\n"
            "This feed source is not listed in our elite targets.json matrix. "
            "Proceed with caution. Perform translation and classification, but strictly "
            "avoid extracting speculative indicators or general noise."
        )

    return prompt


def parse_harvest_response(
    raw_text: str,
    source_channel: str,
    llm_output: str,
) -> HarvestPayload:
    """Parse the LLM's JSON output into a typed HarvestPayload.

    Falls back to minimal extraction if LLM output is malformed.
    """
    try:
        # Strip markdown fences if present
        cleaned = llm_output.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)

        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        log.warning("Harvester returned invalid JSON — falling back to passthrough")
        parsed = {}

    # Perform runtime audit alignment logging based on targets.json calibration
    if is_tier1_source(source_channel):
        log.info("Successfully harvested validated Tier-1 intelligence from %s", source_channel)
    else:
        log.warning("Harvested feed from unaligned source %s — flagging for downstream review", source_channel)

    return HarvestPayload(
        raw_text=raw_text,
        source_channel=source_channel,
        detected_language=parsed.get("detected_language", "en"),
        translated_text=parsed.get("translated_text", raw_text),
        preliminary_category=parsed.get("preliminary_category", "Threat Intelligence"),
        extraction_timestamp=datetime.now(timezone.utc).isoformat(),
        extracted_entities=parsed.get("extracted_entities", []),
        has_cve_reference=parsed.get("has_cve_reference", False),
        has_ioc_indicators=parsed.get("has_ioc_indicators", False),
        word_count=parsed.get("word_count", len(raw_text.split())),
    )


# ---------------------------------------------------------------------------
# Agent metadata (used by CrewAI Agent constructor)
# ---------------------------------------------------------------------------

AGENT_CONFIG: dict[str, str] = {
    "role": "Intelligence Harvester",
    "goal": (
        "Extract, translate, and normalize raw intelligence feeds into "
        "structured English-language payloads with entity extraction and "
        "preliminary classification."
    ),
    "backstory": (
        "A polyglot signals intelligence specialist with 20 years at GCHQ "
        "and NSA TAO. Fluent in Russian, Mandarin, Arabic, and Farsi. "
        "Processes raw intercepts from encrypted MTProto channels, dark web "
        "forums, and Pastebins with zero tolerance for data loss."
    ),
}
