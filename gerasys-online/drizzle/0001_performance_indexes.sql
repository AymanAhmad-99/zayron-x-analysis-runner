-- ═══════════════════════════════════════════════════════════════
-- ZAYRON-X — Performance Indexes & Schema Fixes
-- Migration: 0001_performance_indexes
-- Date:      2026-06-02
-- Engineer:  DeepTrace-2027 Supabase DBA Squad
-- ═══════════════════════════════════════════════════════════════
--
-- INDEX STRATEGY SUMMARY
-- ──────────────────────
-- 1. idx_articles_fts             — GIN index for full-text search (to_tsvector).
--                                    Reduces searchArticles() queries from
--                                    200-1000ms (seq scan) to <50ms (index scan).
-- 2. idx_articles_category_pub    — Composite index for category listing pages.
--                                    Covers getArticlesByCategory() and the
--                                    homepage query that filters on
--                                    is_published + category + published_at.
-- 3. idx_cves_pub_date_severity   — Covers getCVEs() (ORDER BY published_date)
--                                    and getCVEsBySeverity() (WHERE severity).
-- 4. idx_cves_cve_id              — Fast lookup for getCVEByCveId().
--                                    (UNIQUE constraint already creates a btree
--                                    index — this is an explicit backup.)
-- 5. mat_tags + idx_mat_tags_tag   — Materialized view for tag aggregation.
--                                    Replaces expensive unnest() + GROUP BY on
--                                    every getAllTags() call. Refresh periodically.
-- 6. idx_articles_url_hash        — UNIQUE index for deduplication on ingestion.
--                                    Prevents duplicate articles from the same URL.
-- 7. idx_articles_author          — Speeds up queries filtering/grouping by author.
-- 8. idx_articles_published_at    — Speeds up ORDER BY published_at DESC (all listings).
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. Full-Text Search GIN index on articles
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_articles_fts
  ON articles
  USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'')));

-- ─────────────────────────────────────────────
-- 2. Composite index for category listing pages
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_articles_category_pub
  ON articles (category, is_published, published_at DESC);

-- ─────────────────────────────────────────────
-- 3. Date + severity index for CVE feed
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cves_pub_date_severity
  ON cves (published_date DESC, severity);

-- ─────────────────────────────────────────────
-- 4. Explicit lookup index for single CVE
--    (UNIQUE on cve_id already creates a btree index;
--     this is an explicit fallback in case the constraint
--     was applied differently in the original migration.)
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cves_cve_id
  ON cves (cve_id);

-- ─────────────────────────────────────────────
-- 5. Tags aggregation — Materialized View
--    Replaces runtime unnest(tags) GROUP BY on every
--    getAllTags() call.  Refresh with:
--      REFRESH MATERIALIZED VIEW CONCURRENTLY mat_tags;
-- ─────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS mat_tags AS
SELECT
  unnest(tags) AS tag,
  COUNT(*)::int AS count
FROM articles
WHERE is_published = true
GROUP BY unnest(tags)
ORDER BY count DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mat_tags_tag
  ON mat_tags (tag);

-- ─────────────────────────────────────────────
-- 6. URL deduplication — UNIQUE index
--    Already constrained UNIQUE in the original
--    migration; this ensures it exists.
-- ─────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_url_hash
  ON articles (url_hash);

-- ─────────────────────────────────────────────
-- 7. Author index for analyst queries
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_articles_author
  ON articles (author);

-- ─────────────────────────────────────────────
-- 8. Published date index for listings
--    All article listing queries ORDER BY
--    published_at DESC — a B-tree index avoids
--    full sequential scans.
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_articles_published_at
  ON articles (published_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- SCHEMA FIX: ALTER category column from ENUM to TEXT
-- The original migration 0000 defined category as a custom
-- ENUM type, but the TypeScript schema (lib/db/schema.ts line 18)
-- defines it as text().  This ALTER reconciles the mismatch.
-- ═══════════════════════════════════════════════════════════════

-- Drop the default cast if it exists, then alter the column type.
-- Conditionally drop the ENUM type only if it exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'category'
  ) THEN
    ALTER TABLE articles ALTER COLUMN category TYPE text USING category::text;
    ALTER TABLE raw_feeds ALTER COLUMN category TYPE text USING category::text;
    DROP TYPE IF EXISTS "public"."category" CASCADE;
  END IF;
END
$$;
