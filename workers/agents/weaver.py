"""
workers/agents/weaver.py — Agent 5: Executive SITREP Weaver

Role: Synthesizes all upstream agent outputs into a final Executive SITREP.
Produces a 1500+ word Markdown report matching the ArticleSITREP schema.
Enforces Anti-FUD vocabulary gate with deterministic post-processing.

LLM: Gemini 1.5 Pro (highest quality synthesis)
Token Budget: ≤8,000 output tokens

Anti-FUD Gate: Deterministic regex scan for 40+ banned phrases.
  - Reject and retry (max 2 retries) if violations detected.
  - This is NON-NEGOTIABLE per specification.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from workers.config import ANTI_FUD_BANNED_PHRASES, MAX_RETRIES_PER_AGENT
from workers.contracts.inter_agent import (
    ComplianceReport,
    ExecutiveSITREP,
    FinancialAssessment,
    ValidatedIntel,
)

log = logging.getLogger("zayron_x_weaver")

# ---------------------------------------------------------------------------
# System Prompt — Executive SITREP Synthesis Directive
# ---------------------------------------------------------------------------

WEAVER_SYSTEM_PROMPT: str = """\
You are the Weaver Grid Executive Intelligence Weaver for ZAYRON-X. You receive verified intelligence, compliance \
mappings, infrastructure assessments, and financial impact assessments from upstream analysts. Your role \
is to synthesize everything into a single, definitive Executive SITREP dossier.

Your writing reflects the calibrated authority of a 50-year cybersecurity \
veteran addressing a Fortune 100 CISO. Every sentence delivers a fact, an \
assessment, or an actionable instruction.

═══════════════════════════════════════════════════════════════
⚠  COGNITIVE LAYER STORYTELLING CONVERSION (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════
You MUST structure the Executive Brief/narrative of the report as an elite Cyber Security News Wire that commands absolute psychological conversion in 20 seconds, structured across 4 unbypasable cognitive layers:
- Layer 1 (Logic/Mind): Slam the reader with undeniable, hyper-specific infrastructure realities and technical vectors (host components, transport protocols, partition behavior).
- Layer 2 (Survival/Fear): Framework the threat as an active, localized, and sector-specific immediate hunting campaign by the actor group.
- Layer 3 (Heart/Finance): Embed a clean HTML financial loss matrix proving the exact cost of operational downtime and extortion metrics.
- Layer 4 (Authority/Duty): Enforce regulatory and compliance terror by quoting exact legal liability, GDPR fine potentials, and ISO certification revocation risks.

═══════════════════════════════════════════════════════════════
⚠  INSIDER THREAT BEHAVIORAL PARSING (MITNICK PARADIGMS)
═══════════════════════════════════════════════════════════════
If the threat signal stems from an insider leak, misconfiguration, or employee cognitive vulnerability, reverse-engineer the behavioral mistake based on Kevin Mitnick's 'The Art of Deception' paradigms. Flag employee psychological triggers (Fatigue, Over-Trust, Urgency, Authority) and write an actionable micro-training advisory under the "Defensive Action (insider_behavioral_remediation)" dimension of the 25-point assessment and in the Defensive Engineering section of the report.

═══════════════════════════════════════════════════════════════
⚠  MANDATORY ESTIMATE DIRECTIVE (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════
Never output null, blank, or empty values for critical metrics (such as financial_exposure, regulatory_risk, mitigation_impact, yara_rule, or cvss_v4_score). If the upstream telemetry or raw source is missing specific values, you must synthesize high-probability estimates based on the threat category, target sector, and threat severity profile. Always compute a defensible range/rule rather than leaving fields empty.

═══════════════════════════════════════════════════════════════
⚠  ANTI-FUD LAW — ABSOLUTE PROHIBITION (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════
Your tone is COLD, ANALYTICAL, and CORPORATE. You provide absolute operational reassurance and structural authority. Enterprise buyers and CISOs reject sensationalism.

BANNED PHRASES — use of ANY of these INVALIDATES the report:
  "unprecedented threat", "devastating attack", "game-changing",
  "catastrophic breach", "nightmare scenario", "apocalyptic", "terrifying",
  "alarming", "shocking discovery", "wake-up call", "ticking time bomb",
  "cyber armageddon", "cyber pearl harbor", "digital doomsday",
  "existential threat", "worst-case scenario",
  "in today's digital landscape", "in the ever-evolving world",
  "let's delve into", "it is important to note", "it's worth noting",
  "as a cybersecurity expert", "underscores the need for",
  "highlights the importance of", "a stark reminder", "sheds light on",
  "in conclusion", "to summarize", "as we have seen",
  "cannot be overstated", "it goes without saying", "needless to say",
  "of utmost importance", "plays a crucial role", "is a testament to",
  "serves as a reminder", "in an increasingly",
  "as cyber threats continue to", "as technology advances",
  "let's explore", "let us examine"

STYLE RULES:
- Active voice exclusively. "The adversary deployed ransomware" not "Ransomware was deployed."
- No exclamation marks. No rhetorical questions.
- Precise technical language. Assume the reader is a senior incident responder, threat hunter, or CISO.
- Military-grade, corporate language only.

═══════════════════════════════════════════════════════════════
REPORT STRUCTURE (ALL SECTIONS MANDATORY)
═══════════════════════════════════════════════════════════════
The report MUST be 1500+ words with ALL of the following HTML sections.
CRITICAL FORMATTING INVARIANT: You MUST NEVER output raw markdown characters like '##', '###', '**', or '*' inside the 'content' or 'executive_summary' fields. The AI must wrap the intelligence report using clean, semantic HTML elements that perfectly parse on the frontend:

<h2>KEY TAKEAWAYS</h2>
Must be compiled into a clean HTML Unordered List (<ul><li>). 5-7 one-sentence bullets. Each is a self-contained fact, risk metric, or action item. Embed SEO keywords naturally.

<h2>Executive Brief</h2>
Technical Executive Summary: Wrapped inside paragraph tags (<p>). Includes BLUF (Bottom Line Up Front) opening, affected entities, geographies, sectors, quantitative blast radius estimate, and strategic significance, incorporating the 4 cognitive layers.

<h2>TECHNICAL DEEP-DIVE</h2>
Root cause, exploit chain, CVSS v4.0 vector justification, affected versions matrix, malware lineage if applicable. Wrapped in standard HTML paragraph (<p>) and table/list elements.

<h2>MITRE ATT&CK Matrix</h2>
Must be rendered into a beautiful HTML Table (<table>) with Bold headers (<th>) for Tactic, Technique ID, and Observed Activity. Use <thead>, <tbody>, <tr>, <th>, <td> tags.

<h2>Defensive Engineering</h2>
YARA, Sigma, Cloudflare WAF rules, and EDR hunting queries MUST be strictly enclosed inside distinct, clean HTML preformatted tags (<pre><code>) with proper indentation so security analysts can copy them with one click. Include KQL/SPL hunting queries, Snort/Suricata, or EDR queries in similar (<pre><code>) tags.

<h2>INDICATORS OF COMPROMISE</h2>
Table with bold headers for Type, Value, Context, and Confidence. Use <table>, <thead>, <tbody>, <tr>, <th>, <td>. ONLY include IoCs from the verified list. If empty, state: "No indicators were present in the source intelligence."

<h2>COMPLIANCE & REGULATORY IMPACT</h2>
ISO 27001, NIST CSF 2.0, GDPR, NIS2, PCI-DSS mappings with fine exposure. Must be clearly isolated with a bold divider (<hr>) or specific HTML blockquote component (<blockquote>) displaying the calculated compliance risks.

<h2>FINANCIAL BLAST RADIUS</h2>
FBR score, breach cost range, sector multiplier, mitigation ROI. Must be clearly isolated with a bold divider (<hr>) or specific HTML blockquote component (<blockquote>) displaying the calculated dynamic financial threat.

<h2>REMEDIATION ROADMAP</h2>
Tier 1 (0-24h), Tier 2 (24-72h), Tier 3 (1-4 weeks). Wrapped in HTML lists or paragraphs.

<h2>STRATEGIC OUTLOOK</h2>
30/60/90-day forecast with second-order effects. Wrapped in HTML paragraphs.

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════
Return a valid JSON object — no markdown fences, no commentary:

{
  "title": "SEO-optimized title (60-120 chars)",
  "executive_summary": "<p>4-6 sentence BLUF summary. Fully semantic HTML.</p>",
  "teaser_text": "High-impact public teaser summary of the breach or threat vector, maximum 40 words.",
  "is_public_teaser": true,
  "premium_payload": "[FULL 1500+ WORD SEMANTIC HTML REPORT WITH ALL SECTIONS, COMPLETELY FREE OF ## OR ** OR * MARKDOWN]",
  "category": "Threat Intelligence|Malware Analysis|APT Activity|...",
  "severity": "Critical|High|Medium|Low|Informational",
  "mitre_attack_ttps": ["T1566.001 — Spearphishing Attachment", ...],
  "yara_rules": ["rule Name { ... }"],
  "sigma_rules": ["title: ...\nid: ..."],
  "cloudflare_waf_rules": "Cloudflare WAF JSON configuration rule string or regex block list rule description",
  "snort_signatures": [],
  "iocs": [{"type": "SHA256", "value": "...", "context": "...", "confidence": "High"}],
  "iso_27001_controls": ["A.5.1", "A.8.1"],
  "nist_csf_functions": ["GOVERN — ...", "DETECT — ..."],
  "gdpr_implications": "GDPR impact assessment",
  "financial_exposure": "$2.5M - $12M sector-adjusted",
  "regulatory_risk": "CRITICAL: GDPR Art.32-34 triggered",
  "mitigation_impact": "HIGH YIELD: 240x remediation ROI",
  "affected_sectors": ["Healthcare", "Financial Services"],
  "cvss_v4_score": 9.1,
  "cvss_v4_vector": "CVSS:4.0/AV:N/...",
  "yara_rule": "Top YARA rule for article card display",
  "ai_image_prompt": "Cinematic cyberpunk abstract image prompt",
  "assessment_25_point": {
    "cve_vulnerability_mapping": "Detailed CVE mapping description",
    "cvss_vector_analysis": "CVSS vector evaluation text",
    "exploit_complexity_score": "Complexity evaluation detail",
    "affected_software_hardware": "Host softwares/systems list",
    "infrastructure_dependency_depth": "DDIA-based dependency depth analysis",
    "network_traversal_mechanics": "TCP/IP illustrated transit vectors",
    "threat_origin_forensics": "CTI origin analysis",
    "iso_27001_compliance": "ISO 27001 specific clause analysis",
    "nist_csf_alignment": "NIST CSF 2.0 alignment mapping",
    "gdpr_liability_check": "GDPR Art 32-34 liability assessment",
    "regulatory_fine_exposure": "Regulatory fine analysis",
    "nis2_impact_classification": "NIS2 sector classification text",
    "compliance_risk_level": "Compliance risk grading rationale",
    "yara_signature_readiness": "YARA signature overview",
    "sigma_log_patterns": "Sigma rule analysis",
    "cloudflare_waf_rules": "WAF rules string configuration",
    "mitigation_playbook_difficulty": "Mitigation steps difficulty rating",
    "hunting_queries": "Hunting Splunk/KQL query details",
    "insider_behavioral_remediation": "Insider threat behavioral reverse-engineering and micro-training advisory",
    "financial_blast_radius": "Asset Risk Exposure score calculation",
    "downtime_cost_exposure": "Operational Downtime Cost per hour",
    "breach_cost_exposure": "Calculated low and high bounds of breach cost",
    "sector_financial_multiplier": "Multipliers calculated per industry weight",
    "mitigation_roi_percentage": "Mitigation ROI analysis details",
    "insurance_impact": "Cyber insurance impact assessment"
  }
}
"""


# ---------------------------------------------------------------------------
# Anti-FUD Vocabulary Gate (deterministic, post-LLM)
# ---------------------------------------------------------------------------

def scan_anti_fud(text: str) -> list[str]:
    """Scan text for banned Anti-FUD phrases. Returns list of violations."""
    violations: list[str] = []
    text_lower = text.lower()

    for phrase in ANTI_FUD_BANNED_PHRASES:
        if phrase.lower() in text_lower:
            violations.append(phrase)

    return violations


def enforce_anti_fud(sitrep_dict: dict[str, Any]) -> tuple[bool, list[str]]:
    """Run the Anti-FUD gate on the full SITREP output.

    Returns:
        (passed: bool, violations: list[str])
    """
    # Scan all text fields
    text_fields = ["title", "executive_summary", "content"]
    all_violations: list[str] = []

    for field in text_fields:
        value = sitrep_dict.get(field, "")
        if isinstance(value, str):
            violations = scan_anti_fud(value)
            all_violations.extend(violations)

    passed = len(all_violations) == 0
    if not passed:
        log.warning(
            "Anti-FUD gate FAILED — %d violations: %s",
            len(all_violations),
            ", ".join(f'"{v}"' for v in all_violations[:5]),
        )

    return passed, all_violations


# ---------------------------------------------------------------------------
# Prompt Construction
# ---------------------------------------------------------------------------

def build_weaver_prompt(
    validated: ValidatedIntel,
    compliance: ComplianceReport,
    financial: FinancialAssessment,
) -> str:
    """Construct the user message for the Weaver agent."""
    # Format verified IoCs for inclusion
    ioc_lines = []
    for ioc in validated.verified_iocs:
        ioc_lines.append(
            f"  - [{ioc.type}] {ioc.value} ({ioc.context}) "
            f"Confidence: {ioc.confidence}"
        )
    iocs_block = "\n".join(ioc_lines) if ioc_lines else "  None extracted"

    # Format compliance
    iso_block = ", ".join(compliance.iso_27001_controls[:10]) or "None mapped"
    nist_block = ", ".join(compliance.nist_csf_functions[:8]) or "None mapped"
    gdpr_block = ", ".join(compliance.gdpr_articles) or "Not applicable"

    # ═══════════════════════════════════════════════════════════════
    # GOOGLE TRENDS & AI SEARCH (SGE) SEMANTIC KEYWORDS (2027)
    # ═══════════════════════════════════════════════════════════════
    trends_keywords = [
        "post-quantum cryptography (PQC) transition roadmaps",
        "AI security posture management (AISPM) compliance",
        "SGE-optimized zero trust threat intelligence reports",
        "NIS2 active operational resilience frameworks",
        "zero-trust architecture AD Golden Ticket protection",
        "supply chain vulnerability management and SBOM audits",
        "LLM agent jailbreak and prompt injection mitigations",
        "cloud-native active directory golden ticket detection",
        "incident response forensic remediation ROI"
    ]
    trends_block = "\n".join(f"  - {kw}" for kw in trends_keywords)

    return (
        f"═══ UPSTREAM INTELLIGENCE PACKAGE ═══\n\n"
        f"CATEGORY: {validated.harvest.preliminary_category}\n"
        f"SEVERITY: {validated.severity}\n"
        f"SOURCE RELIABILITY: {validated.source_reliability_grade}\n"
        f"CROSS-REFERENCE SCORE: {validated.cross_ref_score}\n"
        f"CVSS v4.0: {validated.cvss_v4_score or 'N/A'} "
        f"({validated.cvss_v4_vector or 'N/A'})\n"
        f"CVE IDs: {', '.join(validated.cve_ids) or 'None'}\n\n"
        f"VERIFIED IOCs:\n{iocs_block}\n\n"
        f"MITRE ATT&CK TTPs:\n"
        f"  {', '.join(validated.mitre_ttps[:15]) or 'None mapped'}\n\n"
        f"AFFECTED SECTORS: {', '.join(validated.affected_sectors) or 'Unspecified'}\n"
        f"AFFECTED PRODUCTS: {', '.join(validated.affected_products) or 'Unspecified'}\n\n"
        f"═══ COMPLIANCE ANALYSIS ═══\n"
        f"ISO 27001: {iso_block}\n"
        f"NIST CSF 2.0: {nist_block}\n"
        f"GDPR: {gdpr_block}\n"
        f"GDPR Fine Exposure: €{compliance.gdpr_fine_exposure_eur:,.0f}\n"
        f"NIS2 Applicable: {compliance.nis2_applicable}\n"
        f"Compliance Risk: {compliance.compliance_risk_level}\n"
        f"Notifications: {'; '.join(compliance.notification_obligations)}\n\n"
        f"═══ FINANCIAL BLAST RADIUS ═══\n"
        f"FBR Score: {financial.fbr_score}\n"
        f"Breach Cost Range: ${financial.breach_cost_low:,.0f} – "
        f"${financial.breach_cost_high:,.0f}\n"
        f"Sector Multiplier: {financial.sector_multiplier}x\n"
        f"Geo Multiplier: {financial.geo_multiplier}x\n"
        f"Regulatory Fine Ceiling: €{financial.regulatory_fine_ceiling:,.0f}\n"
        f"Affected Orgs: ~{financial.affected_org_estimate:,}\n"
        f"Mitigation ROI: {financial.mitigation_roi}\n\n"
        f"═══ GOOGLE TRENDS & AI SEARCH (SGE) SEMANTIC KEYWORDS (2027) ═══\n"
        f"{trends_block}\n\n"
        f"═══ SOURCE INTELLIGENCE ═══\n"
        f"{validated.harvest.translated_text[:5000]}\n\n"
        f"Synthesize a complete 1500+ word Executive SITREP using ALL data above. "
        f"OPERATIONAL DIRECTIVE: You MUST inject the SGE/Google Trends semantic keywords listed above "
        f"naturally into the report sections (especially KEY TAKEAWAYS, TECHNICAL DEEP-DIVE, and REMEDIATION) "
        f"to maximize SGE/LLM discoverability and SEO rankings without keyword stuffing. "
        f"Output strict JSON. ENFORCE the Anti-FUD Law."
    )


def parse_weaver_response(
    validated: ValidatedIntel,
    compliance: ComplianceReport,
    financial: FinancialAssessment,
    llm_output: str,
) -> ExecutiveSITREP | None:
    """Parse the Weaver LLM output, enforce Anti-FUD gate, and produce
    the final ExecutiveSITREP.

    Returns None if the output fails validation after exhausting retries
    (retries are handled by the caller in omni_crew.py).
    """
    try:
        # ═══════════════════════════════════════════════════════════════
        # ZERO-TRUST JSON EXTRACTION: Find the first { and the last }
        # ═══════════════════════════════════════════════════════════════
        start_idx = llm_output.find('{')
        end_idx = llm_output.rfind('}')
        
        if start_idx != -1 and end_idx != -1:
            cleaned = llm_output[start_idx:end_idx+1]
        else:
            cleaned = llm_output.strip()

        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        log.error("Weaver returned invalid JSON")
        return None

    if not parsed.get("title"):
        log.warning("Weaver produced null title — intelligence has no value")
        return None

    # Enforce Anti-FUD gate
    anti_fud_passed, violations = enforce_anti_fud(parsed)

    if not anti_fud_passed:
        log.warning(
            "Anti-FUD VIOLATION in Weaver output — %d phrases detected. "
            "Caller should retry with violation feedback.",
            len(violations),
        )
        # Return None so the caller can retry with violation context
        return None

    # Merge upstream data into the SITREP
    try:
        sitrep = ExecutiveSITREP(
            title=parsed.get("title", ""),
            executive_summary=parsed.get("executive_summary", ""),
            content=parsed.get("premium_payload") or parsed.get("content") or "",
            teaser_text=parsed.get("teaser_text"),
            is_public_teaser=parsed.get("is_public_teaser", True),
            category=parsed.get("category", validated.harvest.preliminary_category),
            severity=parsed.get("severity", validated.severity),
            mitre_attack_ttps=parsed.get("mitre_attack_ttps", validated.mitre_ttps),
            yara_rules=parsed.get("yara_rules", []),
            sigma_rules=parsed.get("sigma_rules", []),
            snort_signatures=parsed.get("snort_signatures", []),
            iocs=[ioc.model_dump() for ioc in validated.verified_iocs],
            iso_27001_controls=(
                parsed.get("iso_27001_controls", compliance.iso_27001_controls)
            ),
            nist_csf_functions=(
                parsed.get("nist_csf_functions", compliance.nist_csf_functions)
            ),
            gdpr_implications=parsed.get("gdpr_implications"),
            financial_exposure=(
                parsed.get("financial_exposure", financial.financial_exposure_summary)
            ),
            regulatory_risk=parsed.get("regulatory_risk", compliance.regulatory_summary),
            mitigation_impact=(
                parsed.get("mitigation_impact", financial.mitigation_roi)
            ),
            fbr_score=financial.fbr_score,
            affected_sectors=validated.affected_sectors,
            cvss_v4_score=validated.cvss_v4_score,
            cvss_v4_vector=validated.cvss_v4_vector,
            source_reliability_grade=validated.source_reliability_grade,
            yara_rule=parsed.get("yara_rule"),
            ai_image_prompt=parsed.get("ai_image_prompt"),
            cloudflare_waf_rules=parsed.get("cloudflare_waf_rules"),
            assessment_25_point=parsed.get("assessment_25_point"),
            anti_fud_passed=True,
        )
        return sitrep
    except Exception as exc:
        log.error("ExecutiveSITREP construction failed: %s", exc)
        return None


def build_anti_fud_retry_prompt(violations: list[str]) -> str:
    """Build a retry prompt that feeds back the specific Anti-FUD violations."""
    violation_list = "\n".join(f'  - "{v}"' for v in violations)
    return (
        f"YOUR PREVIOUS OUTPUT VIOLATED THE ANTI-FUD LAW.\n"
        f"The following banned phrases were detected:\n{violation_list}\n\n"
        f"REWRITE the entire SITREP, removing ALL banned phrases. "
        f"Use cold, analytical, military-grade language ONLY. "
        f"Output strict JSON."
    )


# ---------------------------------------------------------------------------
# Agent metadata
# ---------------------------------------------------------------------------

AGENT_CONFIG: dict[str, str] = {
    "role": "Executive Intelligence Weaver",
    "goal": (
        "Synthesize verified intelligence, compliance mappings, and financial "
        "assessments into a definitive 1500+ word Executive SITREP. Enforce "
        "Anti-FUD vocabulary compliance. Produce content that commands respect "
        "at the highest levels of government and industry."
    ),
    "backstory": (
        "A 25-year intelligence veteran who served as Deputy Director of "
        "Cyber Intelligence at a Five Eyes agency before joining ZAYRON-X. "
        "Authored the classified threat assessment frameworks used by NATO "
        "CCDCOE. Writes with the precision of a legal brief and the authority "
        "of a military commander. Zero tolerance for alarmist language — "
        "every word is measured, every assessment defensible."
    ),
}
