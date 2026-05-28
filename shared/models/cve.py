"""
ZAYRON-X — CVE Pydantic Models

Mirrors: gerasys-online/lib/db/schema.ts → cves table
SQL DDL: supabase_schema_setup.sql → CREATE TABLE cves

Enforces strict typing on CVE records before they are written to Supabase.
The CVERecord model validates NVD API output, and CVEInsert is the exact
shape of the database row.
"""

from __future__ import annotations

import re
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class CVEInsert(BaseModel):
    """Strict model for inserting into the `cves` table.

    Maps 1:1 to the Drizzle cves schema. Database-managed columns
    (id, created_at) are omitted.
    """

    cve_id: str = Field(..., min_length=7)  # CVE-YYYY-NNNNN
    title: str | None = None
    description: str | None = None
    severity: str = Field(..., min_length=1)
    cvss_score: float = Field(default=0.0, ge=0.0, le=10.0)
    cvss_vector: str | None = None
    affected_product: str | None = None
    vendor: str | None = None
    status: str = Field(default="Active")
    published_date: str | None = None  # ISO 8601

    @field_validator("cve_id")
    @classmethod
    def validate_cve_id_format(cls, v: str) -> str:
        """Enforce CVE-YYYY-NNNNN format."""
        if not re.fullmatch(r"CVE-\d{4}-\d{4,}", v):
            raise ValueError(
                f"Invalid CVE ID format: '{v}'. Expected CVE-YYYY-NNNNN."
            )
        return v.upper()

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        allowed = {"Critical", "High", "Medium", "Low", "Unknown"}
        normalized = v.strip().capitalize()
        if normalized not in allowed:
            return "Unknown"
        return normalized

    @field_validator("cvss_score")
    @classmethod
    def validate_cvss_range(cls, v: float) -> float:
        if v < 0.0 or v > 10.0:
            raise ValueError(f"CVSS score must be 0.0–10.0, got: {v}")
        return round(v, 1)

    def to_supabase_dict(self) -> dict[str, Any]:
        """Export as a dict suitable for Supabase REST API POST."""
        return self.model_dump(exclude_none=True)


class CVERecord(BaseModel):
    """Validates a raw NVD vulnerability object after parsing.

    Used in cve_worker.py to validate the output of parse_cve()
    before it reaches upsert_cves().
    """

    cve_id: str
    title: str | None = None
    description: str | None = None
    severity: str
    cvss_score: float = 0.0
    cvss_vector: str = ""
    affected_product: str = "Unknown"
    vendor: str = "Unknown"
    status: str = "Active"
    published_date: str | None = None

    model_config = {"extra": "ignore"}

    @field_validator("cve_id")
    @classmethod
    def validate_cve_id(cls, v: str) -> str:
        if not re.fullmatch(r"CVE-\d{4}-\d{4,}", v):
            raise ValueError(f"Invalid CVE ID: {v}")
        return v.upper()

    def to_insert(self) -> CVEInsert:
        """Convert to a strict CVEInsert for database writing."""
        return CVEInsert(**self.model_dump())
