-- Audit-preserving reconciliation of legacy hash-keyed NVD events.
CREATE TABLE IF NOT EXISTS nvd_event_reconciliation (
  old_event_id TEXT PRIMARY KEY,
  canonical_event_id TEXT NOT NULL,
  cve_id TEXT NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('CANONICAL_EVENT','LEGACY_DUPLICATE','UPDATED_VERSION','FAILED_ATTEMPT','RETRY','UNKNOWN')),
  reason TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  reconciled_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_nvd_reconciliation_cve ON nvd_event_reconciliation(cve_id);

INSERT OR IGNORE INTO nvd_event_reconciliation
  (old_event_id, canonical_event_id, cve_id, classification, reason, content_hash, created_at, status)
SELECT event_id, 'evt_nvd_0847863c-9c8', 'CVE-2026-76038',
  CASE WHEN event_id = 'evt_nvd_0847863c-9c8' THEN 'CANONICAL_EVENT'
       WHEN status = 'RECEIVED' THEN 'FAILED_ATTEMPT'
       ELSE 'LEGACY_DUPLICATE' END,
  CASE WHEN event_id = 'evt_nvd_0847863c-9c8' THEN 'First event to produce persisted evidence and reach Trust quarantine'
       WHEN status = 'RECEIVED' THEN 'Legacy hash-keyed row stopped before evidence processing'
       ELSE 'Same CVE represented under legacy content-hash identity' END,
  content_hash, created_at, status
FROM canary_events
WHERE source_id = 'nvd-api'
  AND (dedup_key LIKE 'nvd-api:CVE-2026-76038:%' OR dedup_key = 'nvd-api:CVE-2026-76038');

UPDATE canary_events
SET dedup_key = 'nvd-api:CVE-2026-76038'
WHERE event_id = 'evt_nvd_0847863c-9c8';
