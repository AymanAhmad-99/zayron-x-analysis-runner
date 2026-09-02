-- Knowledge tables already exist in production with the typed application schema.
-- Artifact-forensics fields live in the additive table below to preserve parity.
CREATE TABLE IF NOT EXISTS knowledge_artifacts (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  organization TEXT,
  publisher TEXT,
  publication_date TEXT,
  edition TEXT,
  version TEXT NOT NULL,
  license TEXT NOT NULL,
  legal_download_status TEXT NOT NULL,
  official_url TEXT NOT NULL,
  authority_tier INTEGER NOT NULL,
  r2_object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL UNIQUE,
  page_count INTEGER,
  processing_status TEXT NOT NULL,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  embedding_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
  retrieval_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
  retrieved_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_knowledge_artifacts_source ON knowledge_artifacts(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_artifacts_document ON knowledge_artifacts(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_artifacts_status ON knowledge_artifacts(processing_status);
