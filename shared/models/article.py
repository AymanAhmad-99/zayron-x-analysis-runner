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
            return "Tools"
        elif "exploit" in cleaned or "vuln" in cleaned or "cve" in cleaned:
            return "Exploits"
        elif "leak" in cleaned or "breach" in cleaned:
            return "Leaks"
        else:
            return "Intel"


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
    category: str = Field(default="Threat Intelligence")
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
            return "Tools"
        elif "exploit" in cleaned or "vuln" in cleaned or "cve" in cleaned:
            return "Exploits"
        elif "leak" in cleaned or "breach" in cleaned:
            return "Leaks"
        else:
            return "Intel"

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
