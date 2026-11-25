-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 7B — BULK IOC ENGINE v2
--
-- Forward-only, scoped migration. Applied with a dedicated wrangler config
-- (the shared `d1_migrations` ledger stops at 0025 because 0026–0034 were
-- applied out-of-band), exactly like 0034.
--
-- WHAT THIS DOES
--   1. Gives `iocs` the operational columns a bulk feed engine needs:
--      lifecycle status, source provenance, decay expiry, family/ASN/country
--      enrichment and a numeric 0–100 confidence.
--   2. Collapses the historical duplicate (type, normalized_value) pairs and
--      enforces uniqueness so every ingest is an upsert, never a new row.
--   3. Adds `radar_pulses` — one Cloudflare Radar snapshot per UTC day.
--
-- DELIBERATE DATA FIXES
--   * `iocs.confidence` was a 0..1 real (legacy default 0.8). The v2 engine
--     speaks 0..100 everywhere (EDL gate is `>= 85`), so legacy rows are
--     scaled in place; the legacy default can only apply to rows that omit the
--     column, and every v2 writer always supplies it.
--   * legacy type `ipv4` becomes canonical `ip` so `/iocs/edl/ip.txt` is a
--     complete view of the address indicators rather than half of them.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. canonical type ────────────────────────────────────────────────────────
UPDATE iocs SET type = 'ip' WHERE type = 'ipv4';

-- ── 2. numeric 0..100 confidence ────────────────────────────────────────────
UPDATE iocs SET confidence = confidence * 100 WHERE confidence <= 1;

-- ── 3. operational columns ──────────────────────────────────────────────────
ALTER TABLE iocs ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE iocs ADD COLUMN seen_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE iocs ADD COLUMN sources_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE iocs ADD COLUMN family TEXT;
ALTER TABLE iocs ADD COLUMN asn TEXT;
ALTER TABLE iocs ADD COLUMN asn_name TEXT;
ALTER TABLE iocs ADD COLUMN country TEXT;
ALTER TABLE iocs ADD COLUMN expires_at TEXT;
ALTER TABLE iocs ADD COLUMN radar_enriched_at TEXT;

-- ── 4. collapse historical duplicates, then enforce identity ────────────────
DELETE FROM iocs
 WHERE rowid NOT IN (
   SELECT MIN(rowid) FROM iocs GROUP BY type, normalized_value
 );

CREATE UNIQUE INDEX IF NOT EXISTS idx_iocs_type_normalized_unique
  ON iocs (type, normalized_value);

-- Hot paths: the EDL read (status + confidence), the stats rollup (status,
-- type) and the Radar enrichment pick (confidence, enrichment marker).
CREATE INDEX IF NOT EXISTS idx_iocs_status_confidence
  ON iocs (status, confidence);

CREATE INDEX IF NOT EXISTS idx_iocs_radar_pending
  ON iocs (type, radar_enriched_at, confidence);

CREATE INDEX IF NOT EXISTS idx_iocs_family
  ON iocs (family, status);

-- ── 5. Cloudflare Radar daily snapshots ────────────────────────────────────
CREATE TABLE IF NOT EXISTS radar_pulses (
  id           TEXT PRIMARY KEY NOT NULL,
  pulse_date   TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_radar_pulses_date
  ON radar_pulses (pulse_date);
