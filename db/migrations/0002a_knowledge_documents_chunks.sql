-- Restore the schema objects required by the existing knowledge provenance migration.
-- These tables are defined by packages/intelligence/db/schema.ts and were previously
-- assumed to exist outside the repository migration chain.
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  publication_date TEXT,
  version TEXT,
  license TEXT,
  source_url TEXT,
  document_type TEXT NOT NULL,
  topic TEXT,
  authority_tier INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kdocs_hash ON knowledge_documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_kdocs_authority ON knowledge_documents(authority_tier);
CREATE INDEX IF NOT EXISTS idx_kdocs_type ON knowledge_documents(document_type);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  section TEXT,
  page INTEGER,
  text TEXT NOT NULL,
  embedding_id TEXT,
  authority_tier INTEGER NOT NULL,
  token_count INTEGER,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_kchunks_doc_id ON knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_kchunks_embedding_id ON knowledge_chunks(embedding_id);
CREATE INDEX IF NOT EXISTS idx_kchunks_authority ON knowledge_chunks(authority_tier);

-- The initial application migration already owns the table name `evidence` but
-- has a different legacy shape. Add only the source-fabric columns required by
-- later additive migrations; existing legacy rows are preserved unchanged.
ALTER TABLE evidence ADD COLUMN evidence_id TEXT;
ALTER TABLE evidence ADD COLUMN artifact_id TEXT;
ALTER TABLE evidence ADD COLUMN entity_id TEXT;
ALTER TABLE evidence ADD COLUMN evidence_type TEXT;
ALTER TABLE evidence ADD COLUMN observed_at TEXT;
ALTER TABLE evidence ADD COLUMN collected_at TEXT;
ALTER TABLE evidence ADD COLUMN content_reference TEXT;
ALTER TABLE evidence ADD COLUMN confidence REAL;
