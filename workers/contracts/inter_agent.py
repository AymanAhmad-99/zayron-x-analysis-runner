"""
workers/contracts/inter_agent.py — Typed Inter-Agent Data Contracts

Every data handoff between agents passes through these Pydantic models.
No unstructured dicts cross agent boundaries. This is the trust architecture
for the multi-agent pipeline.

Flow:
  Harvester → HarvestPayload → Validator
  Validator → ValidatedIntel  → Compliance, Quant
  Compliance → ComplianceReport → Weaver
  Quant → FinancialAssessment → Weaver
  Weaver → ExecutiveSITREP → Persistence
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Stage 1: Harvester Output
# ---------------------------------------------------------------------------

class HarvestPayload(BaseModel):
    """Output of the Harvester agent. Raw intelligence normalized and
    translated to English with preliminary classification."""

    raw_text: str = Field(..., min_length=10)
    source_channel: str = Field(default="unknown")
    detected_language: str = Field(default="en")
    translated_text: str = Field(..., min_length=10)
    preliminary_category: str = Field(default="Threat Intelligence")
    extraction_timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    extracted_entities: list[str] = Field(default_factory=list)
    has_cve_reference: bool = Field(default=False)
    has_ioc_indicators: bool = Field(default=False)
    word_count: int = Field(default=0, ge=0)

    @field_validator("preliminary_category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        VALID = {
            "Threat Intelligence", "Vulnerability Research", "OSINT",
            "Cyber Crime", "Malware Analysis", "Ransomware", "Malware",
            "APT Activity", "Nation State", "Advanced Persistent Threat",
            "Open Source Intelligence", "Tools", "Security Tools",
            "Supply Chain Security", "Cloud Security", "AI Security",
            "ICS/OT Security", "Data Breach", "Phishing",
        }
        cleaned = v.strip()
        for valid in sorted(VALID, key=len, reverse=True):
            if cleaned.lower() == valid.lower():
                return valid
        return cleaned if cleaned else "Threat Intelligence"


# ---------------------------------------------------------------------------
# Stage 2: Validator Output
# ---------------------------------------------------------------------------

class VerifiedIoC(BaseModel):
    """A single verified Indicator of Compromise."""
    type: Literal["SHA256", "MD5", "SHA1", "IPv4", "IPv6", "Domain", "URL", "Email"]
    value: str = Field(..., min_length=1)
    context: str = Field(default="")
    confidence: Literal["High", "Medium", "Low"] = Field(default="Medium")


class ValidatedIntel(BaseModel):
    """Output of the Validator agent. Cross-referenced and verified
    intelligence with graded source reliability."""

    harvest: HarvestPayload
    verified_iocs: list[VerifiedIoC] = Field(default_factory=list)
    mitre_ttps: list[str] = Field(default_factory=list)
    cross_ref_score: float = Field(default=0.0, ge=0.0, le=1.0)
    source_reliability_grade: Literal["A", "B", "C", "D", "E"] = Field(default="C")
    cve_ids: list[str] = Field(default_factory=list)
    affected_products: list[str] = Field(default_factory=list)
    affected_sectors: list[str] = Field(default_factory=list)
    cvss_v4_score: float | None = Field(default=None, ge=0.0, le=10.0)
    cvss_v4_vector: str | None = None
    severity: str = Field(default="Medium")
    validation_notes: str = Field(default="")

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        allowed = {"Critical", "High", "Medium", "Low", "Informational"}
        normalized = v.strip().capitalize()
        return normalized if normalized in allowed else "Medium"

    @field_validator("mitre_ttps")
    @classmethod
    def validate_ttps(cls, v: list[str]) -> list[str]:
        """Ensure TTP entries follow T-code format."""
        import re
        validated = []
        for ttp in v:
            if re.search(r"T\d{4}", ttp):
                validated.append(ttp)
        return validated


# ---------------------------------------------------------------------------
# Stage 3a: Compliance Output
# ---------------------------------------------------------------------------

class ComplianceReport(BaseModel):
    """Output of the Compliance agent. Maps threats to regulatory frameworks."""

    iso_27001_controls: list[str] = Field(default_factory=list)
    nist_csf_functions: list[str] = Field(default_factory=list)
    gdpr_articles: list[str] = Field(default_factory=list)
    gdpr_fine_exposure_eur: float = Field(default=0.0, ge=0.0)
    nis2_applicable: bool = Field(default=False)
    nis2_classification: str | None = None
    pci_dss_requirements: list[str] = Field(default_factory=list)
    hipaa_applicable: bool = Field(default=False)
    regulatory_summary: str = Field(default="")
    notification_obligations: list[str] = Field(default_factory=list)
    compliance_risk_level: Literal["Critical", "High", "Medium", "Low"] = Field(
        default="Medium"
    )


# ---------------------------------------------------------------------------
# Stage 3b: Quant Output
# ---------------------------------------------------------------------------

class FinancialAssessment(BaseModel):
    """Output of the Quant agent. Financial Blast Radius computation."""

    fbr_score: float = Field(default=0.0, ge=0.0)
    breach_cost_low: float = Field(default=0.0, ge=0.0)
    breach_cost_high: float = Field(default=0.0, ge=0.0)
    sector_multiplier: float = Field(default=1.0, ge=0.5, le=3.0)
    geo_multiplier: float = Field(default=1.0, ge=0.5, le=3.0)
    regulatory_fine_ceiling: float = Field(default=0.0, ge=0.0)
    affected_org_estimate: int = Field(default=0, ge=0)
    financial_exposure_summary: str = Field(default="")
    mitigation_roi: str = Field(default="")


# ---------------------------------------------------------------------------
# Stage 4: Weaver Output (Final Executive SITREP)
# ---------------------------------------------------------------------------

class ExecutiveSITREP(BaseModel):
    """Final output of the Weaver agent. Fully synthesized intelligence
    product ready for Supabase persistence and frontend rendering.

    This model is structurally compatible with shared.models.ArticleSITREP
    but enriched with crew-specific fields.
    """

    # Core article fields
    title: str = Field(..., min_length=1, max_length=500)
    executive_summary: str = Field(..., min_length=1)
    content: str = Field(..., min_length=100)
    category: str = Field(default="Threat Intelligence")
    severity: str = Field(default="Medium")

    # MITRE & Detection
    mitre_attack_ttps: list[str] = Field(default_factory=list)
    yara_rules: list[str] = Field(default_factory=list)
    sigma_rules: list[str] = Field(default_factory=list)
    snort_signatures: list[str] = Field(default_factory=list)
    iocs: list[dict[str, Any]] = Field(default_factory=list)

    # Compliance (from Compliance agent)
    iso_27001_controls: list[str] = Field(default_factory=list)
    nist_csf_functions: list[str] = Field(default_factory=list)
    gdpr_implications: str | None = None

    # Financial (from Quant agent)
    financial_exposure: str | None = None
    regulatory_risk: str | None = None
    mitigation_impact: str | None = None
    fbr_score: float = Field(default=0.0, ge=0.0)

    # Metadata
    affected_sectors: list[str] = Field(default_factory=list)
    cvss_v4_score: float | None = Field(default=None, ge=0.0, le=10.0)
    cvss_v4_vector: str | None = None
    source_reliability_grade: str = Field(default="C")
    yara_rule: str | None = None  # Top-priority YARA rule for article card
    ai_image_prompt: str | None = None
    anti_fud_passed: bool = Field(default=False)

    @field_validator("content")
    @classmethod
    def validate_content_length(cls, v: str) -> str:
        word_count = len(v.split())
        if word_count < 200:
            raise ValueError(
                f"Content too short: {word_count} words (minimum 200 for pipeline acceptance)"
            )
        return v

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        allowed = {"Critical", "High", "Medium", "Low", "Informational"}
        normalized = v.strip().capitalize()
        return normalized if normalized in allowed else "Medium"

    def to_article_sitrep_dict(self) -> dict[str, Any]:
        """Export as a dict compatible with shared.models.ArticleSITREP."""
        data = self.model_dump()
        # Map crew-specific field names to ArticleSITREP expectations
        data["financialExposure"] = data.pop("financial_exposure", None)
        data["regulatoryRisk"] = data.pop("regulatory_risk", None)
        data["mitigationImpact"] = data.pop("mitigation_impact", None)
        data["yaraRule"] = data.pop("yara_rule", None)
        return data
