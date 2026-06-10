"""
workers/agents/validator.py — Agent 2: Intelligence Validator

Role: Cross-reference verification, IoC validation through the deterministic
gate (shared.models.ioc.validate_iocs), MITRE ATT&CK TTP extraction,
source reliability grading (NATO Admiral scale A-E), and CVSS assessment.

LLM: Gemini 1.5 Flash
Token Budget: ≤2,000 output tokens
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
from typing import Any

# Ensure shared package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from shared.models import validate_iocs
from workers.contracts.inter_agent import HarvestPayload, ValidatedIntel, VerifiedIoC

log = logging.getLogger("zayron_x_validator")

# ---------------------------------------------------------------------------
# System Prompt — Verification & Cross-Reference Directive
# ---------------------------------------------------------------------------

VALIDATOR_SYSTEM_PROMPT: str = """\
You are the Intelligence Validator for ZAYRON-X. You receive pre-extracted intelligence from the \
Harvester and OSINT Spy agents and your role is to VERIFY, CROSS-REFERENCE, and GRADE it.

OPERATIONAL DIRECTIVES:

1. ANCHOR technical reasoning strictly to MITRE ATT&CK/CAPEC frameworks and Richards Heuer's 'Psychology of Intelligence Analysis' (cognitive bias mitigation, alternative hypotheses assessment).
2. TREAT commercial external LLM tokens strictly as an Ephemeral Linguistic Parser (only for normalization and schema validation). Do NOT introduce external speculation.
3. IOC EXTRACTION — Extract ALL Indicators of Compromise present VERBATIM in the translated text. NEVER fabricate, infer, or template IoCs. Types: SHA256, MD5, SHA1, IPv4, IPv6, Domain, URL, Email. If no IoCs are present, return an empty array.
4. MITRE ATT&CK MAPPING — Map the described activity to MITRE ATT&CK Enterprise techniques. Use ONLY legitimate, published T-codes (e.g., T1566.001). Do NOT invent technique IDs. Map only techniques directly evidenced by the intelligence.
5. CVE IDENTIFICATION — Extract all CVE IDs mentioned verbatim. Format: CVE-YYYY-NNNNN. Do NOT generate placeholder CVE IDs.
6. SOURCE RELIABILITY GRADING (NATO Admiral Scale):
   A = Completely reliable (official vendor advisory, CERT)
   B = Usually reliable (major security research firm)
   C = Fairly reliable (established security journalist)
   D = Not usually reliable (anonymous forum post)
   E = Unreliable (unverified social media)
7. SEVERITY ASSESSMENT — Based on the available evidence, assign: Critical, High, Medium, Low, or Informational.
8. CROSS-REFERENCE SCORE — A confidence score (0.0-1.0) reflecting how well the intelligence correlates across multiple independent sources. Single-source intelligence = 0.3. Multi-source corroborated = 0.8+.
9. CVSS v4.0 — Only provide a score and vector if a specific exploitable vulnerability is described with sufficient technical detail. Otherwise null.
10. NO PLACEHOLDERS: Under no circumstances output placeholders like 'Unknown' or '-' or null. If data is missing, calculate relative proximity values using our ground-truth library (infer from standard configurations).

OUTPUT FORMAT (strict JSON, no markdown fences):
{
  "iocs": [{"type": "SHA256|MD5|IPv4|Domain|...", "value": "...", "context": "...", "confidence": "High|Medium|Low"}],
  "mitre_ttps": ["T1566.001 — Spearphishing Attachment", ...],
  "cve_ids": ["CVE-2025-12345", ...],
  "affected_products": ["Cisco ASA 9.x", ...],
  "affected_sectors": ["Healthcare", "Financial Services", ...],
  "source_reliability_grade": "A|B|C|D|E",
  "cross_ref_score": 0.6,
  "severity": "Critical|High|Medium|Low|Informational",
  "cvss_v4_score": 9.1,
  "cvss_v4_vector": "CVSS:4.0/AV:N/AC:L/... or null",
  "validation_notes": "Brief assessment of intelligence quality"
}
"""


def build_validator_prompt(harvest: HarvestPayload) -> str:
    """Construct the user message for the Validator agent."""
    return (
        f"PRELIMINARY CATEGORY: {harvest.preliminary_category}\n"
        f"SOURCE: {harvest.source_channel}\n"
        f"LANGUAGE: {harvest.detected_language}\n"
        f"ENTITIES DETECTED: {', '.join(harvest.extracted_entities[:20])}\n"
        f"HAS CVE REFERENCES: {harvest.has_cve_reference}\n"
        f"HAS IOC INDICATORS: {harvest.has_ioc_indicators}\n\n"
        f"TRANSLATED INTELLIGENCE:\n{harvest.translated_text[:6000]}\n\n"
        f"Execute all verification directives. Output strict JSON."
    )


def parse_validator_response(
    harvest: HarvestPayload,
    llm_output: str,
) -> ValidatedIntel:
    """Parse the Validator LLM output and run the deterministic IoC gate."""
    try:
        cleaned = llm_output.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)

        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        log.warning("Validator returned invalid JSON — falling back to empty validation")
        parsed = {}

    # Run deterministic IoC hallucination gate
    raw_iocs = parsed.get("iocs", [])
    validated_ioc_dicts = validate_iocs(raw_iocs)

    verified_iocs = []
    for ioc_dict in validated_ioc_dicts:
        try:
            verified_iocs.append(VerifiedIoC(**ioc_dict))
        except Exception as exc:
            log.warning("IoC model construction failed: %s", exc)

    # Validate MITRE TTPs — only keep legitimate T-codes
    raw_ttps = parsed.get("mitre_ttps", [])
    validated_ttps = [ttp for ttp in raw_ttps if re.search(r"T\d{4}", str(ttp))]

    return ValidatedIntel(
        harvest=harvest,
        verified_iocs=verified_iocs,
        mitre_ttps=validated_ttps,
        cross_ref_score=min(1.0, max(0.0, parsed.get("cross_ref_score", 0.3))),
        source_reliability_grade=parsed.get("source_reliability_grade", "C"),
        cve_ids=parsed.get("cve_ids", []),
        affected_products=parsed.get("affected_products", []),
        affected_sectors=parsed.get("affected_sectors", []),
        cvss_v4_score=parsed.get("cvss_v4_score"),
        cvss_v4_vector=parsed.get("cvss_v4_vector"),
        severity=parsed.get("severity", "Medium"),
        validation_notes=parsed.get("validation_notes", ""),
    )


# ---------------------------------------------------------------------------
# Agent metadata
# ---------------------------------------------------------------------------

AGENT_CONFIG: dict[str, str] = {
    "role": "Intelligence Validator",
    "goal": (
        "Cross-reference, verify, and grade incoming intelligence. "
        "Extract IoCs through the deterministic hallucination gate. "
        "Map MITRE ATT&CK techniques. Assign source reliability grades."
    ),
    "backstory": (
        "A former MITRE ATT&CK framework contributor and NVD analyst with "
        "15 years in vulnerability research. Trained at the DoD Cyber Crime "
        "Center (DC3). Maintains zero tolerance for fabricated indicators — "
        "every IoC must appear verbatim in the source material."
    ),
}
