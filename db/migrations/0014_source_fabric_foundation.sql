-- Clean source-fabric control plane. No legacy records are imported.
CREATE TABLE IF NOT EXISTS fabric_sources (
  source_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  authority TEXT NOT NULL,
  coverage TEXT NOT NULL,
  access_method TEXT NOT NULL,
  base_endpoint TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled = 0),
  health_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
  parser_version TEXT NOT NULL,
  normalizer_version TEXT NOT NULL,
  last_success_at TEXT,
  last_failure_at TEXT,
  last_cursor TEXT,
  last_artifact_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE TABLE IF NOT EXISTS source_endpoints (endpoint_id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES fabric_sources(source_id), endpoint TEXT NOT NULL, rate_limit TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled = 0));
CREATE TABLE IF NOT EXISTS source_artifacts (artifact_id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES fabric_sources(source_id), content_hash TEXT NOT NULL, content_type TEXT NOT NULL, r2_key TEXT NOT NULL UNIQUE, collected_at TEXT NOT NULL, parser_version TEXT NOT NULL, schema_version TEXT NOT NULL, retention_class TEXT NOT NULL, UNIQUE(source_id, content_hash));
CREATE TABLE IF NOT EXISTS collection_runs (run_id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES fabric_sources(source_id), status TEXT NOT NULL, cursor TEXT, records_collected INTEGER NOT NULL DEFAULT 0, latency_ms INTEGER, error_code TEXT, started_at TEXT NOT NULL, finished_at TEXT);
CREATE TABLE IF NOT EXISTS entities (entity_id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, canonical_key TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')));
CREATE TABLE IF NOT EXISTS evidence (evidence_id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES fabric_sources(source_id), artifact_id TEXT NOT NULL REFERENCES source_artifacts(artifact_id), entity_id TEXT REFERENCES entities(entity_id), evidence_type TEXT NOT NULL, observed_at TEXT, collected_at TEXT NOT NULL, content_reference TEXT NOT NULL, confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1));
CREATE TABLE IF NOT EXISTS analysis_claims (claim_id TEXT PRIMARY KEY, entity_id TEXT NOT NULL REFERENCES entities(entity_id), claim_class TEXT NOT NULL CHECK (claim_class IN ('CONFIRMED_FACT','SOURCE_DERIVED','KNOWLEDGE_DERIVED','ANALYTIC_INFERENCE','RECOMMENDATION','UNKNOWN')), statement TEXT NOT NULL, support_status TEXT NOT NULL DEFAULT 'UNSUPPORTED');
CREATE TABLE IF NOT EXISTS knowledge_refs (ref_id TEXT PRIMARY KEY, claim_id TEXT NOT NULL REFERENCES analysis_claims(claim_id), source_id TEXT REFERENCES fabric_sources(source_id), relevance TEXT NOT NULL, analytical_effect TEXT);
CREATE TABLE IF NOT EXISTS relations (relation_id TEXT PRIMARY KEY, subject_id TEXT NOT NULL REFERENCES entities(entity_id), predicate TEXT NOT NULL, object_id TEXT NOT NULL REFERENCES entities(entity_id), evidence_id TEXT REFERENCES evidence(evidence_id), UNIQUE(subject_id, predicate, object_id));
CREATE TABLE IF NOT EXISTS publication_candidates (candidate_id TEXT PRIMARY KEY, entity_id TEXT NOT NULL REFERENCES entities(entity_id), status TEXT NOT NULL DEFAULT 'QUARANTINED', evidence_count INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS publications (publication_id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL REFERENCES publication_candidates(candidate_id), status TEXT NOT NULL DEFAULT 'DRAFT', published_at TEXT);
CREATE TABLE IF NOT EXISTS publication_revisions (revision_id TEXT PRIMARY KEY, publication_id TEXT NOT NULL REFERENCES publications(publication_id), revision_number INTEGER NOT NULL, content_r2_key TEXT NOT NULL, UNIQUE(publication_id, revision_number));
CREATE TABLE IF NOT EXISTS pipeline_runs (pipeline_run_id TEXT PRIMARY KEY, stage TEXT NOT NULL, status TEXT NOT NULL, source_id TEXT, artifact_id TEXT, started_at TEXT NOT NULL, finished_at TEXT, error_code TEXT);
CREATE INDEX IF NOT EXISTS idx_fabric_artifacts_source_time ON source_artifacts(source_id, collected_at);
CREATE INDEX IF NOT EXISTS idx_fabric_runs_source_status ON collection_runs(source_id, status);
CREATE INDEX IF NOT EXISTS idx_fabric_evidence_entity ON evidence(entity_id);
