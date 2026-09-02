CREATE TABLE IF NOT EXISTS evidence_ledger (
  claim_id TEXT PRIMARY KEY NOT NULL,
  event_id TEXT NOT NULL,
  claim TEXT NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('OBSERVED_FACT', 'REPORTED_CLAIM', 'INFERENCE', 'ANALYST_ASSESSMENT', 'UNKNOWN')),
  source_id TEXT,
  source_tier INTEGER,
  source_url TEXT,
  published_at TEXT,
  retrieved_at TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  supports_or_contradicts TEXT NOT NULL CHECK (supports_or_contradicts IN ('SUPPORTS', 'CONTRADICTS', 'NEUTRAL')),
  citation TEXT,
  content_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (event_id) REFERENCES intelligence_events(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_evidence_ledger_event_id ON evidence_ledger(event_id);
CREATE INDEX IF NOT EXISTS idx_evidence_ledger_source_id ON evidence_ledger(source_id);
