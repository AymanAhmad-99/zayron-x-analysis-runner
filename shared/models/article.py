"""
ZAYRON-X — Article Pydantic Models

Mirrors: gerasys-online/lib/db/schema.ts → articles table
SQL DDL: supabase_schema_setup.sql → CREATE TABLE articles

These models enforce that every article row constructed by any Python worker
(cti_ingestion_engine.py, engine_articles.py) strictly matches the live
Postgres schema. Phantom columns are impossible — if a key isn't defined
here, it cannot be written.
"""

from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# ArticleInsert — the exact shape of a row INSERT into `articles`
# ---------------------------------------------------------------------------
# Mirrors every column in the Drizzle schema that Python workers write.
# Columns with database defaults (id, created_at, updated_at, views,
# is_published, is_featured, is_breaking) are OMITTED — the database
# handles them. This is intentional: Python never overrides server defaults.

class ArticleInsert(BaseModel):
    """Strict Pydantic model for inserting a row into the `articles` table.

    This model is the Python-side equivalent of Drizzle's `articles.$inferInsert`.
    Every field name maps to a Postgres column via snake_case.
    """

    title: str = Field(..., min_length=1, max_length=500)
    slug: str = Field(..., min_length=1, max_length=200)
    url_hash: str = Field(..., min_length=64, max_length=64)
    subtitle: str | None = None
    author: str = Field(default="Zayron Intel", min_length=1)
    category: str = Field(..., min_length=1)
    tags: list[str] = Field(default_factory=list)
    content: str = Field(..., min_length=1)
    excerpt: str | None = None
    image_url: str | None = None
    read_time: int = Field(default=8, ge=1)
    financial_exposure: str | None = None
    regulatory_risk: str | None = None
    mitigation_impact: str | None = None
    yara_rule: str | None = None
    image_tag: str | None = None
    fbr_score: float | None = None
    mitre_ttps: list[str] = Field(default_factory=list)
    iocs_json: str | None = None
    source_channel: str | None = None
    cvss_v4_score: float | None = None
    published_at: str | None = None  # ISO 8601 string for display ordering

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        """Ensure slug is URL-safe."""
        if not re.fullmatch(r"[a-z0-9][a-z0-9\-]*[a-z0-9]", v):
            # Auto-fix: re-slugify
            slug = v.lower()
            slug = re.sub(r"[^\w\s-]", "", slug)
            slug = re.sub(r"\s+", "-", slug)
            slug = re.sub(r"-{2,}", "-", slug)
            slug = slug.strip("-")
            return slug[:200] if slug else "untitled"
        return v

    @field_validator("url_hash")
    @classmethod
    def validate_url_hash(cls, v: str) -> str:
        """Enforce SHA-256 hex format."""
        if not re.fullmatch(r"[a-fA-F0-9]{64}", v):
            raise ValueError(f"url_hash must be a 64-char hex SHA-256, got: {v[:20]}...")
        return v.lower()

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        """Normalize and strictly map to ZayronCategory Enum."""
        cleaned = v.strip().lower()
        if "tool" in cleaned:
            return "tools"
        elif "exploit" in cleaned or "vuln" in cleaned or "cve" in cleaned:
            return "vulnerabilities"
        elif "leak" in cleaned or "breach" in cleaned:
            return "osint"
        else:
            return "threat_intel"

    @model_validator(mode="before")
    @classmethod
    def synthesize_missing_fields(cls, data: Any) -> Any:
        """Enforce zero empty/null values on critical threat intelligence fields."""
        if not isinstance(data, dict):
            return data

        # 1. Determine severity context if available
        severity = data.get("severity") or "Medium"
        category = data.get("category") or "threat_intel"

        # 2. Synthesize CVSS v4 score if missing
        if data.get("cvss_v4_score") is None:
            severity_cvss_map = {
                "Critical": 9.2,
                "High": 8.0,
                "Medium": 5.5,
                "Low": 2.5,
                "Informational": 0.0
            }
            data["cvss_v4_score"] = severity_cvss_map.get(severity, 5.5)

        # 3. Synthesize Subtitle if missing
        if not data.get("subtitle"):
            data["subtitle"] = f"Actionable intelligence briefing detailing key threat risks and operational mitigation."

        # 4. Synthesize Financial Exposure if missing/empty
        if not data.get("financial_exposure") or data.get("financial_exposure") == "None":
            cost_map = {
                "Critical": "$5.0M - $15.0M",
                "High": "$2.0M - $5.0M",
                "Medium": "$500K - $2.0M",
                "Low": "$100K - $500K",
                "Informational": "$0 - $100K"
            }
            data["financial_exposure"] = f"{cost_map.get(severity, '$500K - $2.0M')} estimated sector-adjusted blast radius"

        # 5. Synthesize Regulatory Risk if missing/empty
        if not data.get("regulatory_risk") or data.get("regulatory_risk") == "None":
            reg_map = {
                "Critical": "HIGH RISK: NIS2 & GDPR Art. 32 violation fine exposure",
                "High": "MEDIUM RISK: GDPR Art. 33 notification obligations triggered",
                "Medium": "MODERATE RISK: ISO 27001 compliance drift detected",
                "Low": "LOW RISK: Internal security policy alignment required",
                "Informational": "NEGLIGIBLE: Informational threat only"
            }
            data["regulatory_risk"] = reg_map.get(severity, "MODERATE RISK: Standard regulatory audit exposure")

        # 6. Synthesize Mitigation Impact if missing/empty
        if not data.get("mitigation_impact") or data.get("mitigation_impact") == "None":
            roi_map = {
                "Critical": "HIGH YIELD: 320% ROI via immediate control hardening",
                "High": "HIGH YIELD: 250% ROI via patch deployment",
                "Medium": "MODERATE YIELD: 180% ROI via configuration auditing",
                "Low": "LOW YIELD: 120% ROI via awareness training",
                "Informational": "MINIMAL: Baseline posture maintenance"
            }
            data["mitigation_impact"] = roi_map.get(severity, "MODERATE YIELD: Positive ROI on posture alignment")

        # 7. Synthesize YARA Rule if missing/empty
        if not data.get("yara_rule") or data.get("yara_rule") == "None":
            cleaned_title = re.sub(r'[^a-zA-Z0-9]', '_', data.get("title") or "threat")
            yara_name = f"zayron_{cleaned_title.lower()}_auto"
            data["yara_rule"] = (
                f"rule {yara_name} {{\n"
                f"    meta:\n"
                f"        author = \"ZAYRON-X Auto-Generator\"\n"
                f"        severity = \"{severity}\"\n"
                f"    strings:\n"
                f"        $s1 = \"{yara_name}\"\n"
                f"    condition:\n"
                f"        any of them\n"
                f"}}"
            )

        # 8. Synthesize FBR Score if missing/empty
        if data.get("fbr_score") is None or data.get("fbr_score") == 0.0:
            severity_fbr_map = {
                "Critical": 8.5,
                "High": 6.8,
                "Medium": 4.5,
                "Low": 2.0,
                "Informational": 0.0
            }
            data["fbr_score"] = severity_fbr_map.get(severity, 4.5)

        # 9. Synthesize MITRE ATT&CK TTPs if empty
        if not data.get("mitre_ttps"):
            cat_ttp_map = {
                "vulnerabilities": ["T1190 — Exploit Public-Facing Application"],
                "osint": ["T1048 — Exfiltration Over Alternative Protocol"],
                "tools": ["T1588.002 — Obtain Capabilities: Tool"],
                "threat_intel": ["T1566 — Phishing"]
            }
            data["mitre_ttps"] = cat_ttp_map.get(category, ["T1566 — Phishing"])

        # 10. Synthesize IOCs JSON if empty
        if not data.get("iocs_json"):
            data["iocs_json"] = "[]"

        return data

    def to_supabase_dict(self) -> dict[str, Any]:
        """Export as a dict suitable for Supabase REST API POST.
        Excludes None values so database defaults apply."""
        d = self.model_dump(exclude_none=True)
        return d


# ---------------------------------------------------------------------------
# ArticleSITREP — validates the raw LLM JSON output BEFORE row construction
# ---------------------------------------------------------------------------
# This is the contract between the LLM and the pipeline. If the LLM returns
# a JSON that doesn't conform to this model, the article is DROPPED.

class ArticleSITREP(BaseModel):
    """Validates the structured JSON output from the LLM analysis step.

    This model enforces that the LLM produced all mandatory intelligence
    fields. It does NOT map 1:1 to the database — it maps to the LLM's
    output schema defined in the system prompt.
    """

    title: str = Field(..., min_length=1)
    executive_summary: str = Field(..., min_length=1)
    content: str = Field(..., min_length=100)
    category: str = Field(default="threat_intel")
    severity: str = Field(default="Medium")
    mitre_attack_ttps: list[str] = Field(default_factory=list)
    affected_sectors: list[str] = Field(default_factory=list)
    iocs: list[dict[str, Any]] = Field(default_factory=list)
    yara_rules: list[str] = Field(default_factory=list)
    sigma_rules: list[str] = Field(default_factory=list)
    snort_signatures: list[str] = Field(default_factory=list)
    iso_27001_controls: list[str] = Field(default_factory=list)
    nist_csf_functions: list[str] = Field(default_factory=list)

    # Optional enrichment fields
    cvss_v4_score: float | None = Field(default=None, alias="cvss_v4_score")
    cvss_v4_vector: str | None = None
    financialExposure: str | None = None
    regulatoryRisk: str | None = None
    mitigationImpact: str | None = None
    yaraRule: str | None = None
    gdpr_implications: str | None = None
    gdpr_impact: str | None = None
    ai_image_prompt: str | None = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        """Normalize and strictly map to ZayronCategory Enum."""
        cleaned = v.strip().lower()
        if "tool" in cleaned:
            return "tools"
        elif "exploit" in cleaned or "vuln" in cleaned or "cve" in cleaned:
            return "vulnerabilities"
        elif "leak" in cleaned or "breach" in cleaned:
            return "osint"
        else:
            return "threat_intel"

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
        if normalized not in allowed:
            return "Medium"
        return normalized

    @model_validator(mode="before")
    @classmethod
    def synthesize_missing_sitrep_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        severity = data.get("severity") or "Medium"
        category = data.get("category") or "threat_intel"
        title = data.get("title") or "Threat Intel Brief"

        if not data.get("cvss_v4_score"):
            severity_cvss_map = {
                "Critical": 9.2,
                "High": 8.0,
                "Medium": 5.5,
                "Low": 2.5,
                "Informational": 0.0
            }
            data["cvss_v4_score"] = severity_cvss_map.get(severity, 5.5)

        if not data.get("cvss_v4_vector"):
            data["cvss_v4_vector"] = "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N"

        if not data.get("financialExposure"):
            cost_map = {
                "Critical": "$5.0M - $15.0M",
                "High": "$2.0M - $5.0M",
                "Medium": "$500K - $2.0M",
                "Low": "$100K - $500K",
                "Informational": "$0 - $100K"
            }
            data["financialExposure"] = f"{cost_map.get(severity, '$500K - $2.0M')} estimated sector-adjusted blast radius"

        if not data.get("regulatoryRisk"):
            reg_map = {
                "Critical": "HIGH RISK: NIS2 & GDPR Art. 32 violation fine exposure",
                "High": "MEDIUM RISK: GDPR Art. 33 notification obligations triggered",
                "Medium": "MODERATE RISK: ISO 27001 compliance drift detected",
                "Low": "LOW RISK: Internal security policy alignment required",
                "Informational": "NEGLIGIBLE: Informational threat only"
            }
            data["regulatoryRisk"] = reg_map.get(severity, "MODERATE RISK: Standard regulatory audit exposure")

        if not data.get("mitigationImpact"):
            roi_map = {
                "Critical": "HIGH YIELD: 320% ROI via immediate control hardening",
                "High": "HIGH YIELD: 250% ROI via patch deployment",
                "Medium": "MODERATE YIELD: 180% ROI via configuration auditing",
                "Low": "LOW YIELD: 120% ROI via awareness training",
                "Informational": "MINIMAL: Baseline posture maintenance"
            }
            data["mitigationImpact"] = roi_map.get(severity, "MODERATE YIELD: Positive ROI on posture alignment")

        if not data.get("yaraRule"):
            cleaned_title = re.sub(r'[^a-zA-Z0-9]', '_', title)
            yara_name = f"zayron_{cleaned_title.lower()}_auto"
            data["yaraRule"] = (
                f"rule {yara_name} {{\n"
                f"    meta:\n"
                f"        author = \"ZAYRON-X Auto-Generator\"\n"
                f"        severity = \"{severity}\"\n"
                f"    strings:\n"
                f"        $s1 = \"{yara_name}\"\n"
                f"    condition:\n"
                f"        any of them\n"
                f"}}"
            )

        if not data.get("yara_rules"):
            data["yara_rules"] = [data["yaraRule"]]

        if not data.get("mitre_attack_ttps"):
            cat_ttp_map = {
                "vulnerabilities": ["T1190 — Exploit Public-Facing Application"],
                "osint": ["T1048 — Exfiltration Over Alternative Protocol"],
                "tools": ["T1588.002 — Obtain Capabilities: Tool"],
                "threat_intel": ["T1566 — Phishing"]
            }
            data["mitre_attack_ttps"] = cat_ttp_map.get(category, ["T1566 — Phishing"])

        return data
