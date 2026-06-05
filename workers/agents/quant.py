"""
workers/agents/quant.py — Agent 4: Financial Blast Radius (FBR) Analyst

Role: Computes the Financial Blast Radius score and breach cost estimates
using the formula:

  FBR = (CVSS_base × sector_weight × geo_exposure) + regulatory_fine_ceiling

Sector Weights:
  Healthcare=1.8, Financial Services=1.6, Energy=1.5, Government=1.5,
  Technology=1.2, Telecommunications=1.3, Manufacturing=1.2, Other=1.0

Geographic Exposure:
  EU=1.4 (GDPR), US=1.2, UK=1.3, APAC=1.1, Other=1.0

LLM: Gemini 1.5 Flash
Token Budget: ≤1,500 output tokens
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from workers.config import GEO_EXPOSURE, SECTOR_WEIGHTS
from workers.contracts.inter_agent import (
    ComplianceReport,
    FinancialAssessment,
    ValidatedIntel,
)

log = logging.getLogger("zayron_x_quant")

# ---------------------------------------------------------------------------
# System Prompt — Financial Quantification Directive
# ---------------------------------------------------------------------------

QUANT_SYSTEM_PROMPT: str = """\
You are the Lead Financial Risk Quantifier for ZAYRON-X.
Your task is to translate technical threat intel into boardroom-ready financial risk metrics.

OPERATIONAL DIRECTIVES:

1. THE "DEFENSIBLE NUMBER" RULE:
   - You must explain the basis for every cost estimate. 
   - Reference the impact on: (1) Operational Downtime, (2) Regulatory Exposure, (3) Reputational Capital.
   - If the estimate is high, explain why (e.g., "High estimate driven by PII exfiltration risk under GDPR").

2. MITIGATION ROI:
   - Do not just say "HIGH YIELD". Explain: "ROI = (Avoided Breach Cost - Mitigation Cost) / Mitigation Cost".

3. MANDATORY ESTIMATE DIRECTIVE (NON-NEGOTIABLE):
   - Never output null, 0, or empty values for breach_cost_low, breach_cost_high, or affected_org_estimate.
   - If the raw feed does not specify financial metrics or affected organization counts, you must calculate high-probability estimates based on the threat severity, sector multiplier, and geo exposure profile. Always synthesize a defensible financial range rather than leaving fields empty.

4. OUTPUT REQUIREMENTS (STRICT JSON):
   Your output MUST be a valid JSON object. Do not include markdown fences.
   
   {
     "breach_cost_low": integer,
     "breach_cost_high": integer,
     "cost_justification": "Clear, concise logic explaining why these costs were chosen",
     "sector_multiplier": float,
     "geo_multiplier": float,
     "regulatory_fine_ceiling": integer,
     "affected_org_estimate": integer,
     "financial_exposure_summary": "One sentence summary matching our branding style",
     "mitigation_roi": "Specific ROI analysis string"
   }

TONE: Cold, actuarial, quantitative. You are defending your budget against a skeptical CFO.
"""


def build_quant_prompt(
    validated: ValidatedIntel,
    compliance: ComplianceReport,
) -> str:
    """Construct the user message for the Quant agent."""
    return (
        f"THREAT CATEGORY: {validated.harvest.preliminary_category}\n"
        f"SEVERITY: {validated.severity}\n"
        f"CVSS v4.0 SCORE: {validated.cvss_v4_score or 'N/A'}\n"
        f"AFFECTED SECTORS: {', '.join(validated.affected_sectors) or 'Unspecified'}\n"
        f"AFFECTED PRODUCTS: {', '.join(validated.affected_products) or 'Unspecified'}\n"
        f"CVE IDS: {', '.join(validated.cve_ids) or 'None'}\n"
        f"IOC COUNT: {len(validated.verified_iocs)}\n"
        f"SOURCE RELIABILITY: {validated.source_reliability_grade}\n\n"
        f"COMPLIANCE ANALYSIS:\n"
        f"  GDPR Fine Exposure: €{compliance.gdpr_fine_exposure_eur:,.0f}\n"
        f"  NIS2 Applicable: {compliance.nis2_applicable}\n"
        f"  HIPAA Applicable: {compliance.hipaa_applicable}\n"
        f"  Compliance Risk Level: {compliance.compliance_risk_level}\n"
        f"  Notifications: {'; '.join(compliance.notification_obligations)}\n\n"
        f"INTELLIGENCE SUMMARY:\n{validated.harvest.translated_text[:3000]}\n\n"
        f"Compute financial blast radius. Output strict JSON."
    )


def compute_fbr(
    cvss_score: float | None,
    affected_sectors: list[str],
    compliance: ComplianceReport,
) -> float:
    """Compute the Financial Blast Radius score deterministically.

    FBR = (CVSS_base × sector_weight × geo_exposure) + regulatory_fine_ceiling

    This is a deterministic computation, NOT an LLM output. It provides
    a ground-truth anchor for the Quant agent's estimates.
    """
    base_cvss = cvss_score if cvss_score and cvss_score > 0 else 5.0

    # Select highest applicable sector weight
    sector_weight = 1.0
    for sector in affected_sectors:
        weight = SECTOR_WEIGHTS.get(sector, 1.0)
        sector_weight = max(sector_weight, weight)

    # Geographic exposure — default to EU if GDPR is triggered
    geo_exposure = 1.0
    if compliance.gdpr_fine_exposure_eur > 0 or compliance.nis2_applicable:
        geo_exposure = max(geo_exposure, GEO_EXPOSURE["EU"])

    # Regulatory fine ceiling (normalize to millions for score scaling)
    fine_ceiling_normalized = compliance.gdpr_fine_exposure_eur / 1_000_000

    fbr = (base_cvss * sector_weight * geo_exposure) + fine_ceiling_normalized
    return round(fbr, 2)


def parse_quant_response(
    validated: ValidatedIntel,
    compliance: ComplianceReport,
    llm_output: str,
) -> FinancialAssessment:
    """Parse the Quant LLM output and compute deterministic FBR."""
    try:
        cleaned = llm_output.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)

        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        log.warning("Quant agent returned invalid JSON — using defaults")
        parsed = {}

    # Deterministic FBR computation (does not trust LLM for this)
    fbr = compute_fbr(
        validated.cvss_v4_score,
        validated.affected_sectors,
        compliance,
    )

    # Extract sector and geo multipliers
    sector_mult = parsed.get("sector_multiplier", 1.0)
    geo_mult = parsed.get("geo_multiplier", 1.0)

    return FinancialAssessment(
        fbr_score=fbr,
        breach_cost_low=max(0, parsed.get("breach_cost_low", 0)),
        breach_cost_high=max(0, parsed.get("breach_cost_high", 0)),
        sector_multiplier=min(3.0, max(0.5, sector_mult)),
        geo_multiplier=min(3.0, max(0.5, geo_mult)),
        regulatory_fine_ceiling=compliance.gdpr_fine_exposure_eur,
        affected_org_estimate=max(0, parsed.get("affected_org_estimate", 0)),
        financial_exposure_summary=parsed.get("financial_exposure_summary", ""),
        mitigation_roi=parsed.get("mitigation_roi", ""),
    )


# ---------------------------------------------------------------------------
# Agent metadata
# ---------------------------------------------------------------------------

AGENT_CONFIG: dict[str, str] = {
    "role": "Financial Blast Radius Analyst",
    "goal": (
        "Compute precise financial impact estimates using the FBR formula. "
        "Produce breach cost ranges, sector-adjusted multipliers, and "
        "mitigation ROI assessments for executive decision-making."
    ),
    "backstory": (
        "A former Goldman Sachs cyber risk quantification specialist who "
        "built the proprietary breach cost models used by Lloyd's of London "
        "cyber insurance syndicates. 15 years translating technical "
        "vulnerabilities into boardroom-ready financial exposure metrics. "
        "Every estimate is defensible under actuarial scrutiny."
    ),
}
