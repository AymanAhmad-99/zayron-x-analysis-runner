-- Knowledge Objects v3: Canonical storage and FTS5 lexical retrieval layer
-- Strictly for structural Knowledge Objects. Legacy chunks are untouched and frozen.

CREATE TABLE IF NOT EXISTS knowledge_objects_v3 (
  object_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  canonical_text TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  knowledge_domain TEXT NOT NULL,
  epistemic_type TEXT NOT NULL,
  method_category TEXT NOT NULL,
  hierarchy_json TEXT,
  citation_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_ko_v3_document ON knowledge_objects_v3(document_id);
CREATE INDEX IF NOT EXISTS idx_ko_v3_domain ON knowledge_objects_v3(knowledge_domain);
CREATE INDEX IF NOT EXISTS idx_ko_v3_hash ON knowledge_objects_v3(content_hash);

-- Standalone FTS5 table indexing authoritative canonical_text (never truncated/normalized transport text)
CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_objects_v3_fts USING fts5(
  object_id UNINDEXED,
  document_id,
  canonical_text,
  knowledge_domain,
  epistemic_type,
  method_category
);
