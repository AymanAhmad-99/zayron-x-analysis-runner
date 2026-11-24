-- V3 resumable seed chunk metadata. Additive only; no corpus rows are created.
CREATE TABLE IF NOT EXISTS v3_seed_chunks (
  chunk_id TEXT PRIMARY KEY,
  seed_revision_id TEXT NOT NULL REFERENCES v3_seed_revisions(seed_revision_id),
  corpus_revision_id TEXT NOT NULL REFERENCES v3_corpus_revisions(corpus_revision_id),
  object_set_digest TEXT NOT NULL,
  chunk_ordinal INTEGER NOT NULL CHECK (chunk_ordinal >= 0),
  object_count INTEGER NOT NULL CHECK (object_count >= 0),
  chunk_digest TEXT NOT NULL,
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('PLANNED','RUNNING','COMPLETED','FAILED')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  failed_at TEXT,
  last_error_class TEXT,
  last_error TEXT,
  UNIQUE(seed_revision_id, chunk_ordinal),
  UNIQUE(seed_revision_id, chunk_digest)
);

CREATE INDEX IF NOT EXISTS idx_v3_seed_chunks_seed_state
  ON v3_seed_chunks(seed_revision_id, lifecycle, chunk_ordinal);
