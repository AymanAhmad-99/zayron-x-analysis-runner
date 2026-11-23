-- V3 control-plane metadata only. This migration creates no corpus rows and
-- does not alter knowledge_objects_v3 or knowledge_objects_v3_fts.
CREATE TABLE IF NOT EXISTS v3_document_identities (
  document_identity_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  publisher TEXT,
  edition TEXT,
  source_reference TEXT NOT NULL,
  identity_status TEXT NOT NULL CHECK (identity_status IN ('CANONICAL','ALIAS','HISTORICAL','DEPRECATED','VERSIONED','UNRESOLVED')),
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('ACTIVE','PROPOSED','RETIRED')),
  created_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS v3_document_identity_relations (
  relation_id TEXT PRIMARY KEY,
  subject_identity_id TEXT NOT NULL REFERENCES v3_document_identities(document_identity_id),
  predicate TEXT NOT NULL CHECK (predicate IN ('ALIAS_OF','RENAMED_FROM','SUPERSEDES','SAME_CONTENT_UNCONFIRMED')),
  object_identity_id TEXT NOT NULL REFERENCES v3_document_identities(document_identity_id),
  evidence_digest TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(subject_identity_id, predicate, object_identity_id)
);

CREATE TABLE IF NOT EXISTS v3_corpus_revisions (
  corpus_revision_id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('PILOT','TRACK_B','STAGING','PRODUCTION','ARCHIVE')),
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('DRAFT','PILOT','STAGED','APPROVED','PRODUCTION','SUPERSEDED','RETIRED')),
  object_set_digest TEXT NOT NULL,
  object_count INTEGER NOT NULL CHECK (object_count >= 0),
  parser_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  validation_state TEXT NOT NULL CHECK (validation_state IN ('UNKNOWN','PENDING','PASSED','FAILED')),
  approval_state TEXT NOT NULL CHECK (approval_state IN ('NOT_REQUESTED','PENDING','APPROVED','REJECTED')),
  created_at TEXT NOT NULL,
  approved_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS v3_corpus_documents (
  corpus_revision_id TEXT NOT NULL REFERENCES v3_corpus_revisions(corpus_revision_id),
  document_identity_id TEXT NOT NULL REFERENCES v3_document_identities(document_identity_id),
  source_digest TEXT NOT NULL,
  ingestion_revision_id TEXT,
  PRIMARY KEY (corpus_revision_id, document_identity_id)
);

CREATE TABLE IF NOT EXISTS v3_ingestion_revisions (
  ingestion_revision_id TEXT PRIMARY KEY,
  source_identity TEXT NOT NULL,
  source_digest TEXT NOT NULL,
  parser_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  run_identity TEXT NOT NULL,
  execution_identity TEXT NOT NULL,
  object_set_digest TEXT NOT NULL,
  object_count INTEGER NOT NULL CHECK (object_count >= 0),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('RUNNING','SUCCEEDED','FAILED'))
);

CREATE TABLE IF NOT EXISTS v3_seed_revisions (
  seed_revision_id TEXT PRIMARY KEY,
  corpus_revision_id TEXT NOT NULL REFERENCES v3_corpus_revisions(corpus_revision_id),
  object_set_digest TEXT NOT NULL,
  payload_digest TEXT NOT NULL,
  target_environment TEXT NOT NULL CHECK (target_environment IN ('LOCAL','PREVIEW','STAGING','PRODUCTION')),
  target_d1_database_id TEXT NOT NULL,
  operator_identity TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  approval_state TEXT NOT NULL CHECK (approval_state IN ('PENDING','APPROVED','REJECTED')),
  execution_state TEXT NOT NULL CHECK (execution_state IN ('NOT_STARTED','RUNNING','SUCCEEDED','FAILED','QUARANTINED')),
  created_at TEXT NOT NULL,
  executed_at TEXT
);

CREATE TABLE IF NOT EXISTS v3_deployment_revisions (
  deployment_revision_id TEXT PRIMARY KEY,
  git_commit TEXT,
  build_digest TEXT,
  worker_version TEXT,
  environment TEXT NOT NULL CHECK (environment IN ('LOCAL','PREVIEW','STAGING','PRODUCTION')),
  corpus_revision_id TEXT REFERENCES v3_corpus_revisions(corpus_revision_id),
  actor_identity TEXT NOT NULL,
  created_at TEXT NOT NULL,
  provenance_state TEXT NOT NULL CHECK (provenance_state IN ('COMPLETE','PARTIAL','UNKNOWN'))
);

CREATE TABLE IF NOT EXISTS v3_production_dataset_states (
  dataset_state_id TEXT PRIMARY KEY,
  d1_database_id TEXT NOT NULL,
  binding TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('STAGING','PRODUCTION')),
  deployment_revision_id TEXT NOT NULL REFERENCES v3_deployment_revisions(deployment_revision_id),
  corpus_revision_id TEXT NOT NULL REFERENCES v3_corpus_revisions(corpus_revision_id),
  seed_revision_id TEXT NOT NULL REFERENCES v3_seed_revisions(seed_revision_id),
  object_set_digest TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count >= 0),
  distinct_document_count INTEGER NOT NULL CHECK (distinct_document_count >= 0),
  duplicate_count INTEGER NOT NULL CHECK (duplicate_count >= 0),
  verification_timestamp TEXT NOT NULL,
  verification_result TEXT NOT NULL CHECK (verification_result IN ('PENDING','PASSED','FAILED','QUARANTINED')),
  verification_evidence_digest TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_v3_seed_target_idempotency
  ON v3_seed_revisions(target_environment, target_d1_database_id, idempotency_key);
