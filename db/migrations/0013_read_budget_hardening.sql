-- Migration 0013: D1 Read-Budget Hardening & Query Optimization Indexes

-- 1. Accelerates candidate lookback in workers/ingest (WHERE first_seen_at >= ... ORDER BY first_seen_at DESC)
CREATE INDEX IF NOT EXISTS idx_intelligence_events_status_first_seen ON intelligence_events(status, first_seen_at DESC);

-- 2. Accelerates AI budget guard in workers/ingest (WHERE created_at >= date('now'))
CREATE INDEX IF NOT EXISTS idx_ai_runs_created_at ON ai_runs(created_at);

-- 3. Accelerates knowledge chunk document lookups. The canonical
-- knowledge_chunks schema has no is_active column.
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc ON knowledge_chunks(document_id);

-- 4. Accelerates article lookup by published state and slug
CREATE INDEX IF NOT EXISTS idx_articles_published_slug ON articles(is_published, slug);

-- 5. Accelerates reverse event lookups by created_at
CREATE INDEX IF NOT EXISTS idx_intelligence_events_created_at ON intelligence_events(created_at DESC);
