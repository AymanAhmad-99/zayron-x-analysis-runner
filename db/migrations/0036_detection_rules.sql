-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 7C — VERIFIED DETECTION COVERAGE INDEX
--
-- One row per REAL upstream rule file. Nothing is synthesised: if a Sigma rule
-- or Nuclei template does not exist in the official repository, no row exists,
-- and the UI renders no "Detection & Hunting Readiness" card.
--
-- Populated by a single-request-per-repo GitHub tree sync (max once / 24h)
-- from `workers/ingest/src/detectionRules.ts`.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS detection_rules (
  id         TEXT PRIMARY KEY NOT NULL,
  -- 'nuclei' | 'sigma'
  source     TEXT NOT NULL,
  -- upstream rule/template identifier: the file stem
  rule_id    TEXT NOT NULL,
  -- 'cve' | 'family'
  kind       TEXT NOT NULL CHECK (kind IN ('cve', 'family')),
  -- UPPERCASE CVE id, or lowercase malware family keyword
  match_key  TEXT NOT NULL,
  name       TEXT NOT NULL,
  path       TEXT NOT NULL,
  severity   TEXT,
  repo       TEXT NOT NULL,
  url        TEXT NOT NULL,
  synced_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_detection_rules_source_path
  ON detection_rules (source, path);

CREATE INDEX IF NOT EXISTS idx_detection_rules_match
  ON detection_rules (kind, match_key);
