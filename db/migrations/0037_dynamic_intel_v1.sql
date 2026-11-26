-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 8A — DYNAMIC INTELLIGENCE v1
--
-- 1. TELEGRAM DEDUPE. The Phase 7D wire namespaced ledger rows as
--    `<entity>@<HH:MM>`, but the selection queries compared `entity_id` to the
--    bare CVE id, so a row written as `CVE-2026-65879@08:00` never matched and
--    the SAME advisory was published again at 10:40. `base_entity_id` is the
--    normalized key every dedupe decision now reads.
-- 2. PoC-in-GitHub index (keyless, quiet-hours sync only).
-- 3. EPSS velocity: the previous score and the delta, so a surge is visible.
--
-- Additive only: no existing column, table or index is dropped or narrowed.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE telegram_dispatches ADD COLUMN base_entity_id TEXT;
ALTER TABLE telegram_dispatches ADD COLUMN delivery_mode TEXT;

-- Backfill the rows written before this migration so the 7-day lock applies
-- retroactively (`CVE-…@08:00` → `CVE-…`).
UPDATE telegram_dispatches
   SET base_entity_id = CASE
     WHEN instr(entity_id, '@') > 0 THEN substr(entity_id, 1, instr(entity_id, '@') - 1)
     ELSE entity_id
   END
 WHERE COALESCE(base_entity_id, '') = '';

CREATE INDEX IF NOT EXISTS idx_telegram_dispatches_base
  ON telegram_dispatches (entity_type, base_entity_id, channel, dispatched_at);

-- ── PoC-in-GitHub (nomi-sec/PoC-in-GitHub) ─────────────────────────────────
-- One row per REAL upstream repository entry. Nothing is synthesised: if the
-- upstream JSON does not list a repository for a CVE, no row exists and the UI
-- says so explicitly.
CREATE TABLE IF NOT EXISTS cve_pocs (
  id            TEXT PRIMARY KEY,
  cve_id        TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  html_url      TEXT NOT NULL,
  stars         INTEGER NOT NULL DEFAULT 0,
  description   TEXT,
  discovered_at TEXT,
  synced_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cve_pocs_repo
  ON cve_pocs (cve_id, repo_full_name);

CREATE INDEX IF NOT EXISTS idx_cve_pocs_cve
  ON cve_pocs (cve_id, stars);

-- ── EPSS velocity ─────────────────────────────────────────────────────────
ALTER TABLE vulnerabilities ADD COLUMN previous_epss REAL;
ALTER TABLE vulnerabilities ADD COLUMN epss_delta REAL;
