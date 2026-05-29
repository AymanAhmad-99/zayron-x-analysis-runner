-- ============================================================================
-- ZAYRON-X — Database/UI Synchronization & Obsolete Purge Migration
-- Project Reference: xdfndojvqazffcjngglr
-- Action: Synchronize Postgres with Drizzle schema.ts (gerasys-online)
-- Rules: Drop unused columns (security_score), add missing frontend columns.
-- ============================================================================

BEGIN;

-- ──────────────────────────────────────────────
-- 1. SYNCHRONIZE 'articles' TABLE
-- ──────────────────────────────────────────────
-- A. Purge columns not represented in drizzle schema.ts (security_score)
ALTER TABLE public.articles DROP COLUMN IF EXISTS security_score;

-- B. Append missing columns critical to CTI SITREP display panels
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS financial_exposure TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS regulatory_risk TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS mitigation_impact TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS yara_rule TEXT;

-- C. Optimize indexes for UI search queries on newly appended fields
CREATE INDEX IF NOT EXISTS idx_articles_yara ON public.articles (yara_rule) WHERE yara_rule IS NOT NULL;

-- ──────────────────────────────────────────────
-- 2. SYNCHRONIZE 'analysts' TABLE
-- ──────────────────────────────────────────────
-- Append missing 'nationality' column to sync metadata panels
ALTER TABLE public.analysts ADD COLUMN IF NOT EXISTS nationality TEXT;

-- ──────────────────────────────────────────────
-- 3. SANITY CHECK & COMPLIANCE VERIFICATION
-- ──────────────────────────────────────────────
-- Force updated_at timestamp trigger refresh
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS articles_updated_at ON public.articles;
CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
