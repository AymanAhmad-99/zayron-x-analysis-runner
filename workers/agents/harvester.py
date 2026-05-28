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
import re
from datetime import datetime, timezone
from typing import Any

from workers.contracts.inter_agent import HarvestPayload

log = logging.getLogger("zayron_x_harvester")

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
2. CLASSIFY the threat into one of: Threat Intelligence, Vulnerability \
   Research, OSINT, Cyber Crime, Malware Analysis, Ransomware, APT Activity, \
   Nation State, Supply Chain Security, Cloud Security, AI Security, \
   ICS/OT Security, Data Breach, Phishing, Security Tools.
3. EXTRACT named entities: CVE IDs, malware families, APT group names, \
   product names, vendor names, affected technologies.
4. FLAG whether the text contains CVE references (has_cve_reference) and \
   potential IoC indicators like IPs, domains, hashes (has_ioc_indicators).
5. OUTPUT word count of the translated text.

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
    """Construct the user message for the Harvester agent."""
    return (
        f"SOURCE: {source_channel}\n"
        f"RAW INTELLIGENCE INPUT:\n{raw_text[:6000]}\n\n"
        f"Execute all extraction directives. Output strict JSON."
    )


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
