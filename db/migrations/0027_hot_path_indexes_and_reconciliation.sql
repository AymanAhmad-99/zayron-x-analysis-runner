-- 0027 — hot-path indexes and affinity reconciliation (ZX-17, ZX-16, Bonus A)
--
-- Everything below is idempotent: running this migration twice leaves the
-- database unchanged and never fails.

-- ── 1. Case-normalise legacy CVE identifiers (ZX-17) ────────────────────
-- `GET /api/v1/vulnerabilities/:id` and the CVE cross-resolution lookups now use
-- `WHERE cve_id = ?` with an upper-cased binding so the index below is usable.
-- That is only correct once every stored identifier is upper-case.
--
-- The `NOT EXISTS` guard matters: `cve_id` is UNIQUE, so a blind UPDATE would
-- abort the whole migration if two rows differed only by case. Such a pair is a
-- data-integrity problem for an operator to resolve, not something a migration
-- may silently merge or delete.
UPDATE vulnerabilities
SET cve_id = UPPER(TRIM(cve_id))
WHERE cve_id IS NOT NULL
  AND cve_id <> UPPER(TRIM(cve_id))
  AND NOT EXISTS (
    SELECT 1
    FROM vulnerabilities AS other
    WHERE other.id <> vulnerabilities.id
      AND other.cve_id = UPPER(TRIM(vulnerabilities.cve_id))
  );

-- ── 2. Hot-path indexes (ZX-17, ZX-16) ──────────────────────────────────
-- The list route orders by `created_at DESC` and the detail/cross-resolution
-- routes match `cve_id`, both without an index before this migration.
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_created_at
  ON vulnerabilities (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vulnerabilities_cve_id
  ON vulnerabilities (cve_id);

-- ── 3. webhook_replays affinity reconciliation (Bonus A) ────────────────
-- 0024 declared `received_at` / `expires_at` as TEXT while the runtime writes
-- epoch-millisecond INTEGERs. Under TEXT affinity the stored value becomes a
-- digit string, and SQLite orders every TEXT value above every INTEGER one — so
-- `expires_at <= ?` was always false and expired replay rows could never be
-- reclaimed. The runtime now compares through `CAST(... AS INTEGER)`; this
-- section aligns legacy rows to the declared INTEGER shape as well.
CREATE TABLE IF NOT EXISTS webhook_replays (
  event_id TEXT PRIMARY KEY,
  received_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'RESERVED'
);

CREATE INDEX IF NOT EXISTS idx_webhook_replays_expires_at
  ON webhook_replays (expires_at);

-- Convert ISO-8601 text timestamps to epoch milliseconds. The GLOB guard matches
-- ONLY an ISO `YYYY-MM-DD...` value, so a second run (whose values are already
-- epoch digits) is a no-op and can never re-scale a converted timestamp.
UPDATE webhook_replays
SET received_at = CAST(ROUND(strftime('%s', received_at) * 1000) AS INTEGER)
WHERE received_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]*'
  AND strftime('%s', received_at) IS NOT NULL;

UPDATE webhook_replays
SET expires_at = CAST(ROUND(strftime('%s', expires_at) * 1000) AS INTEGER)
WHERE expires_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]*'
  AND strftime('%s', expires_at) IS NOT NULL;
