-- ============================================================
-- ZAYRON-X — Database Performance Indexing Migration
-- ============================================================

BEGIN;

-- 1. Indexing optimizations for public.raw_feeds staging table
-- Composite index for worker queue claiming (WHERE status = 'pending' ORDER BY created_at ASC)
CREATE INDEX IF NOT EXISTS idx_raw_feeds_status_created_at 
  ON public.raw_feeds (status, created_at ASC);

-- Index for filtering status
CREATE INDEX IF NOT EXISTS idx_raw_feeds_status 
  ON public.raw_feeds (status);

-- Index for created_at sorting
CREATE INDEX IF NOT EXISTS idx_raw_feeds_created_at 
  ON public.raw_feeds (created_at DESC);


-- 2. Indexing optimizations for public.articles table
-- Unique B-Tree index for route parameter matching
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_slug_unique 
  ON public.articles (slug);

-- B-Tree index for category filtering
CREATE INDEX IF NOT EXISTS idx_articles_category 
  ON public.articles (category);

-- Partial B-Tree index for published articles feed sorting
CREATE INDEX IF NOT EXISTS idx_articles_published_at_desc 
  ON public.articles (published_at DESC) 
  WHERE is_published = TRUE;

-- GIN Index for optimized Full-Text Search (FTS) queries
CREATE INDEX IF NOT EXISTS idx_articles_fts 
  ON public.articles USING GIN (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, ''))
  );


-- 3. Indexing optimizations for public.cves table
-- Composite index for severity filtering and creation date sorting
CREATE INDEX IF NOT EXISTS idx_cves_severity_created_at 
  ON public.cves (severity, created_at DESC);

-- Unique index for CVE code retrieval
CREATE UNIQUE INDEX IF NOT EXISTS idx_cves_cve_id_unique 
  ON public.cves (cve_id);


-- 4. Indexing optimizations for public.knowledge_embeddings table
-- GIN Index for knowledge-base grounded FTS lookups
CREATE INDEX IF NOT EXISTS knowledge_embeddings_content_fts_idx 
  ON public.knowledge_embeddings USING GIN (to_tsvector('english', content));

COMMIT;
