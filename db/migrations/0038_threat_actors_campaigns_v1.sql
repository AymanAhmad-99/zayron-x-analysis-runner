-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 8C — CONNECTED THREAT GRAPH v1
--
-- Two canonical tables sourced from the MITRE ATT&CK Enterprise STIX bundle by
-- `tools/seed-mitre-threat-graph.mjs`. The bundle itself (51 MB) is NEVER bundled
-- into a Worker: the extractor runs locally and seeds bounded, citation-cleaned
-- rows through `wrangler d1 execute --remote`.
--
-- Every column is a stored fact from MITRE. Live correlation (C2 counts, KEV,
-- PoC) is computed at read time from `iocs` / `vulnerabilities` / `cve_pocs`, so
-- nothing here is ever rewritten to claim activity that was not observed.
--
-- Additive only. No existing table, column or index is dropped or narrowed, and
-- this file deliberately contains no semicolon outside a statement terminator
-- (wrangler splits a --file batch on every semicolon, comments included).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS threat_actors (
  -- MITRE external id (G0016) is the canonical key, and a slug-safe id is used
  -- only for the handful of objects without one.
  id                    TEXT PRIMARY KEY NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  aliases_json          TEXT NOT NULL DEFAULT '[]',
  mitre_id              TEXT,
  mitre_url             TEXT,
  -- 'Espionage / State-Nexus' | 'Financial / Ransomware' |
  -- 'Destructive / Hacktivism' | 'Unattributed / Mixed'
  motivation            TEXT NOT NULL DEFAULT 'Unattributed / Mixed',
  target_sectors_json   TEXT NOT NULL DEFAULT '[]',
  target_regions_json   TEXT NOT NULL DEFAULT '[]',
  summary               TEXT NOT NULL DEFAULT '',
  techniques_json       TEXT NOT NULL DEFAULT '[]',
  software_json         TEXT NOT NULL DEFAULT '[]',
  cves_json             TEXT NOT NULL DEFAULT '[]',
  first_seen            TEXT,
  last_seen             TEXT,
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_threat_actors_slug ON threat_actors (slug);
CREATE INDEX IF NOT EXISTS idx_threat_actors_name ON threat_actors (name);
CREATE INDEX IF NOT EXISTS idx_threat_actors_mitre ON threat_actors (mitre_id);

-- NOTE ON THE NAME. Production already carries a legacy `campaigns` table
-- (id, name, slug, actor_id, target_sectors, target_regions, description,
-- start_date, end_date, created_at, updated_at) written by the ingest pipeline
-- and read by the legacy v1 handlers. Replacing its shape would break those
-- readers, so the canonical MITRE catalog lives in `threat_campaigns` and the
-- threat-graph reads never touch the legacy table.
CREATE TABLE IF NOT EXISTS threat_campaigns (
  id                    TEXT PRIMARY KEY NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  mitre_id              TEXT,
  mitre_url             TEXT,
  summary               TEXT NOT NULL DEFAULT '',
  actor_slugs_json      TEXT NOT NULL DEFAULT '[]',
  techniques_json       TEXT NOT NULL DEFAULT '[]',
  software_json         TEXT NOT NULL DEFAULT '[]',
  cves_json             TEXT NOT NULL DEFAULT '[]',
  target_sectors_json   TEXT NOT NULL DEFAULT '[]',
  target_regions_json   TEXT NOT NULL DEFAULT '[]',
  first_seen            TEXT,
  last_seen             TEXT,
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_threat_campaigns_slug ON threat_campaigns (slug);
CREATE INDEX IF NOT EXISTS idx_threat_campaigns_name ON threat_campaigns (name);
CREATE INDEX IF NOT EXISTS idx_threat_campaigns_mitre ON threat_campaigns (mitre_id);

-- ── CISA KEV ingestion facts ───────────────────────────────────────────────
-- The KEV backfill stores the catalog's own fields. `is_exploited_in_wild` stays
-- the single KEV-membership flag every existing read already uses. These two
-- columns keep the catalog's date and ransomware statement without overloading
-- `severity` or the NVD description.
ALTER TABLE vulnerabilities ADD COLUMN kev_date_added TEXT;
ALTER TABLE vulnerabilities ADD COLUMN known_ransomware_campaign_use TEXT;
