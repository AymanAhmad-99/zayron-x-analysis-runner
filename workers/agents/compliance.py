"""
workers/agents/compliance.py — Agent 3: Regulatory Compliance Mapper

Role: Maps validated threat intelligence to regulatory frameworks:
  - ISO 27001:2022 Annex A controls
  - NIST CSF 2.0 functions (GOVERN, IDENTIFY, PROTECT, DETECT, RESPOND, RECOVER)
  - GDPR Articles 32-34 notification obligations & fine exposure
  - NIS2 Directive applicability
  - PCI-DSS v4.0 requirements
  - HIPAA relevance

LLM: Gemini 1.5 Pro (complex regulatory reasoning)
Token Budget: ≤3,000 output tokens
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from workers.contracts.inter_agent import ComplianceReport, ValidatedIntel

log = logging.getLogger("zayron_x_compliance")

# ---------------------------------------------------------------------------
# System Prompt — Regulatory Mapping Directive
# ---------------------------------------------------------------------------

COMPLIANCE_SYSTEM_PROMPT: str = """\
You are the Compliance Auditor for ZAYRON-X. You receive validated threat intelligence and map it to applicable regulatory frameworks with precise control references.

OPERATIONAL DIRECTIVES:

1. ANCHOR technical reasoning strictly to ISO/IEC 27001:2022, NIST CSF 2.0, and GDPR legal liability frameworks.
2. TREAT commercial external LLM tokens strictly as an Ephemeral Linguistic Parser (only for normalization and schema validation). Do NOT introduce external speculation.
3. ISO 27001:2022 ANNEX A — Identify ALL applicable controls using the exact clause numbering (e.g., A.5.1, A.8.1, A.12.2). Map controls to the specific threat characteristics described in the intelligence.
4. NIST CSF 2.0 — Map to the six functions: GOVERN, IDENTIFY, PROTECT, DETECT, RESPOND, RECOVER. For each applicable function, specify the relevant category and subcategory (e.g., DETECT — DE.CM-01: Networks and network services are monitored).
5. GDPR (Articles 32-34):
   - Article 32: Assess whether the threat triggers "appropriate technical and organisational measures" obligations.
   - Article 33: Assess 72-hour supervisory authority notification obligation.
   - Article 34: Assess whether data subjects must be notified.
   - FINE EXPOSURE: Calculate potential fine under Article 83 (up to €20M or 4% of annual global turnover, whichever is higher). Provide a realistic estimate range based on the threat's data exposure potential.
6. NIS2 DIRECTIVE — Assess applicability for essential and important entities. Classify the affected sector under NIS2 taxonomy.
7. PCI-DSS v4.0 — If payment card data or payment systems are potentially affected, map to specific PCI-DSS requirements.
8. HIPAA — If protected health information (PHI) is at risk, flag applicability.
9. NOTIFICATION OBLIGATIONS — List all mandatory notification timelines (GDPR 72h, NIS2 24h initial / 72h full, HIPAA 60 days, etc.).
10. NO PLACEHOLDERS: Under no circumstances output placeholders like 'Unknown' or '-' or null. If data is missing, calculate relative proximity values using our ground-truth library (infer from standard regulatory profiles).

OUTPUT FORMAT (strict JSON, no markdown fences):
{
  "iso_27001_controls": ["A.5.1 — Policies for information security", "A.8.1 — User endpoint devices", ...],
  "nist_csf_functions": ["GOVERN — GV.OC-01: Organizational context", "DETECT — DE.CM-01: Network monitoring", ...],
  "gdpr_articles": ["Article 32 — Security of processing", "Article 33 — Notification to supervisory authority", ...],
  "gdpr_fine_exposure_eur": 10000000,
  "nis2_applicable": true,
  "nis2_classification": "Essential entity — Energy sector",
  "pci_dss_requirements": ["Req 6.3.3 — Patching critical vulnerabilities", ...],
  "hipaa_applicable": false,
  "notification_obligations": ["GDPR Art.33: 72h to supervisory authority", "NIS2: 24h early warning, 72h full notification"],
  "compliance_risk_level": "Critical|High|Medium|Low",
  "regulatory_summary": "Concise 2-3 sentence regulatory impact assessment"
}
"""


def build_compliance_prompt(validated: ValidatedIntel) -> str:
    """Construct the user message for the Compliance agent."""
    ioc_summary = f"{len(validated.verified_iocs)} verified IoCs"
    ttp_summary = ", ".join(validated.mitre_ttps[:10]) or "None mapped"

    return (
        f"THREAT CATEGORY: {validated.harvest.preliminary_category}\n"
        f"SEVERITY: {validated.severity}\n"
        f"CVSS v4.0: {validated.cvss_v4_score or 'N/A'}\n"
        f"AFFECTED SECTORS: {', '.join(validated.affected_sectors) or 'Unspecified'}\n"
        f"CVE IDs: {', '.join(validated.cve_ids) or 'None'}\n"
        f"MITRE TTPs: {ttp_summary}\n"
        f"IOC COUNT: {ioc_summary}\n"
        f"SOURCE RELIABILITY: {validated.source_reliability_grade}\n\n"
        f"INTELLIGENCE SUMMARY:\n{validated.harvest.translated_text[:4000]}\n\n"
        f"Map this threat to ALL applicable regulatory frameworks. Output strict JSON."
    )


def parse_compliance_response(llm_output: str) -> ComplianceReport:
    """Parse the Compliance LLM output into a typed ComplianceReport."""
    try:
        cleaned = llm_output.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)

        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        log.warning("Compliance agent returned invalid JSON — using defaults")
        parsed = {}

    return ComplianceReport(
        iso_27001_controls=parsed.get("iso_27001_controls", []),
        nist_csf_functions=parsed.get("nist_csf_functions", []),
        gdpr_articles=parsed.get("gdpr_articles", []),
        gdpr_fine_exposure_eur=max(0.0, parsed.get("gdpr_fine_exposure_eur", 0.0)),
        nis2_applicable=parsed.get("nis2_applicable", False),
        nis2_classification=parsed.get("nis2_classification"),
        pci_dss_requirements=parsed.get("pci_dss_requirements", []),
        hipaa_applicable=parsed.get("hipaa_applicable", False),
        notification_obligations=parsed.get("notification_obligations", []),
        compliance_risk_level=parsed.get("compliance_risk_level", "Medium"),
        regulatory_summary=parsed.get("regulatory_summary", ""),
    )


# ---------------------------------------------------------------------------
# Agent metadata
# ---------------------------------------------------------------------------

AGENT_CONFIG: dict[str, str] = {
    "role": "Regulatory Compliance Director",
    "goal": (
        "Map validated threat intelligence to ISO 27001, NIST CSF 2.0, "
        "GDPR, NIS2, PCI-DSS, and HIPAA frameworks. Compute fine exposure "
        "and notification obligations."
    ),
    "backstory": (
        "A 30-year Chief Compliance Officer across Fortune 100 financial "
        "institutions and healthcare conglomerates. Holds CISA, CISM, CRISC, "
        "and CDPSE certifications. Drafted the compliance playbooks used by "
        "three of the five largest banks in the EU. Operates with surgical "
        "precision — every control reference is exact, every fine calculation "
        "defensible in court."
    ),
}
