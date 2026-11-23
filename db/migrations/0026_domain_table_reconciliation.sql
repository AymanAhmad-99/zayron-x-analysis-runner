-- Migration 0026 — domain table reconciliation (ZX-10)
--
-- PURPOSE
-- Several tables written/read by ACTIVE consumers were never created by a
-- migration: the knowledge corpus workflow (KnowledgeCorpusWorkflow) and the
-- zero-defect publication audit log. Every statement here is idempotent, so the
-- migration is safe on Preview, production, and a freshly created local D1.
--
-- COLUMN CONTRACT
-- Column names and types are derived from the exact queries in code, not from
-- an intended design:
--   workers/api/src/index.ts  (KnowledgeCorpusWorkflow: knowledge_jobs,
--                              knowledge_processing_batches)
--   workers/api/src/index.ts  GET /api/v1/admin/audit-logs
--   packages/intelligence/src/publishing/publisher.ts
--                              persistZeroDefectAuditLog
--
-- SCOPE
-- Intentionally EXCLUDES the `vulnerabilities` performance indexes (ZX-17).
-- Intentionally does NOT recreate tables that already have a migration:
-- `evidence` (0000), `evidence_ledger` (0001), `malware_reports` and
-- `api_rate_limits` (0024), `ai_provider_state` (0025).

-- ── 1. Knowledge corpus job ledger ────────────────────────────────────────
-- Written by `create-knowledge-job` / `complete-knowledge-job`, read by the
-- checkpoint probe (status = 'COMPLETED').
CREATE TABLE IF NOT EXISTS knowledge_jobs (
  knowledge_job_id TEXT PRIMARY KEY NOT NULL,
  corpus_version TEXT NOT NULL,
  processing_version TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  total_chunks INTEGER NOT NULL DEFAULT 0,
  processed_chunks INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'RUNNING',
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_knowledge_jobs_status
  ON knowledge_jobs (status, updated_at);

-- ── 2. Knowledge corpus batch ledger ─────────────────────────────────────
-- Written by the per-batch step, aggregated by the job progress update and the
-- resume checkpoint (MAX(end_index) WHERE status = 'COMPLETED').
CREATE TABLE IF NOT EXISTS knowledge_processing_batches (
  batch_id TEXT PRIMARY KEY NOT NULL,
  knowledge_job_id TEXT NOT NULL,
  artifact_id TEXT,
  start_index INTEGER NOT NULL,
  end_index INTEGER NOT NULL,
  rows_expected INTEGER NOT NULL DEFAULT 0,
  rows_processed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PROCESSING',
  attempt INTEGER NOT NULL DEFAULT 1,
  started_at TEXT,
  completed_at TEXT,
  duration_ms INTEGER,
  FOREIGN KEY (knowledge_job_id) REFERENCES knowledge_jobs(knowledge_job_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_knowledge_batches_job
  ON knowledge_processing_batches (knowledge_job_id, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_batches_resume
  ON knowledge_processing_batches (knowledge_job_id, end_index);

-- ── 3. Zero-defect publication audit log ─────────────────────────────────
-- Inserted once per published canonical report; read by
-- GET /api/v1/admin/audit-logs with `ORDER BY id DESC`, so `id` must be the
-- monotonically increasing integer primary key.
CREATE TABLE IF NOT EXISTS zero_defect_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  citation_gate_passed INTEGER NOT NULL DEFAULT 0,
  unsupported_claims_check_passed INTEGER NOT NULL DEFAULT 0,
  relevance_sanity_passed INTEGER NOT NULL DEFAULT 0,
  non_generic_check_passed INTEGER NOT NULL DEFAULT 0,
  overall_status TEXT NOT NULL,
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_zero_defect_audit_report
  ON zero_defect_audit_log (report_id);
