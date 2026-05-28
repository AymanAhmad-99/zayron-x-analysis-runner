# shared/models/__init__.py
"""
ZAYRON-X — Pydantic Schema Models (Single Source of Truth)

These models mirror the Drizzle ORM schema in gerasys-online/lib/db/schema.ts.
Every Python worker MUST validate data through these models before writing to
Supabase. This eliminates the "triple-maintained schema" problem.

Schema authority chain:
  1. Drizzle schema.ts  → defines TypeScript types & generates SQL migrations
  2. This file           → mirrors Drizzle exactly for Python-side enforcement
  3. supabase_schema_setup.sql → physical DDL (generated from Drizzle)

If a column is added/removed in Drizzle, it MUST be reflected here.
"""

from .article import ArticleInsert, ArticleSITREP
from .cve import CVEInsert, CVERecord
from .ioc import IoC, validate_iocs

__all__ = [
    "ArticleInsert",
    "ArticleSITREP",
    "CVEInsert",
    "CVERecord",
    "IoC",
    "validate_iocs",
]
