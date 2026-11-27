-- PHASE 10B-1 — multilingual global OSINT wire.
--
-- Strictly idempotent DDL: CREATE ... IF NOT EXISTS only, plus INSERT OR IGNORE
-- seeds. No ALTER TABLE, no drops, no data mutation of any existing table.
--
-- PROVENANCE FIREWALL: nothing here can write to `news_articles`,
-- `vulnerabilities` or any AUTHORITATIVE_VERIFIED surface. Wire signals are an
-- isolated observation store with an explicit trust tier on every row.

CREATE TABLE IF NOT EXISTS osint_sources (
  id                 TEXT PRIMARY KEY,
  handle             TEXT NOT NULL UNIQUE,
  source_type        TEXT NOT NULL,
  title              TEXT NOT NULL,
  region             TEXT NOT NULL DEFAULT 'GLOBAL',
  language           TEXT NOT NULL DEFAULT 'en',
  category           TEXT NOT NULL DEFAULT 'news',
  credibility_score  REAL NOT NULL DEFAULT 50.0,
  poll_interval_mins INTEGER NOT NULL DEFAULT 30,
  last_cursor        TEXT,
  last_polled_at     TEXT,
  enabled            INTEGER NOT NULL DEFAULT 1,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_osint_sources_poll
  ON osint_sources (enabled, last_polled_at);

CREATE INDEX IF NOT EXISTS idx_osint_sources_region
  ON osint_sources (region, enabled);

CREATE TABLE IF NOT EXISTS osint_wire_signals (
  id                   TEXT PRIMARY KEY,
  source_id            TEXT NOT NULL,
  external_id          TEXT NOT NULL,
  content_fingerprint  TEXT NOT NULL,
  original_lang        TEXT NOT NULL DEFAULT 'en',
  region               TEXT NOT NULL DEFAULT 'GLOBAL',
  original_excerpt     TEXT NOT NULL,
  translated_title     TEXT NOT NULL,
  translated_summary   TEXT NOT NULL,
  trust_tier           TEXT NOT NULL DEFAULT 'EARLY_WIRE_SIGNAL',
  signal_score         INTEGER NOT NULL DEFAULT 0,
  extracted_cves       TEXT NOT NULL DEFAULT '[]',
  extracted_iocs       TEXT NOT NULL DEFAULT '[]',
  extracted_actors     TEXT NOT NULL DEFAULT '[]',
  cluster_id           TEXT,
  source_url           TEXT NOT NULL,
  published_at         TEXT NOT NULL,
  ingested_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_osint_wire_source_external
  ON osint_wire_signals (source_id, external_id);

CREATE INDEX IF NOT EXISTS idx_osint_wire_region_ingested
  ON osint_wire_signals (region, ingested_at DESC);

CREATE INDEX IF NOT EXISTS idx_osint_wire_fingerprint
  ON osint_wire_signals (content_fingerprint);

CREATE INDEX IF NOT EXISTS idx_osint_wire_cluster
  ON osint_wire_signals (cluster_id);

CREATE TABLE IF NOT EXISTS osint_clusters (
  id                 TEXT PRIMARY KEY,
  cluster_key        TEXT NOT NULL UNIQUE,
  headline           TEXT NOT NULL,
  regions_json       TEXT NOT NULL DEFAULT '[]',
  source_count       INTEGER NOT NULL DEFAULT 1,
  linked_cves_json   TEXT NOT NULL DEFAULT '[]',
  convergence_score  INTEGER NOT NULL DEFAULT 0,
  trust_tier         TEXT NOT NULL DEFAULT 'EARLY_WIRE_SIGNAL',
  promoted_news_slug TEXT,
  first_seen_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_osint_clusters_convergence
  ON osint_clusters (convergence_score DESC, last_seen_at DESC);

-- ── Starter public sources ────────────────────────────────────────────────────
-- 18 verified-public, no-credential feeds so the wire is verifiable before the
-- owner bulk-imports their own channels. Owner-imported rows never conflict:
-- handles are UNIQUE and the importer emits INSERT OR IGNORE.

INSERT OR IGNORE INTO osint_sources
  (id, handle, source_type, title, region, language, category, credibility_score, poll_interval_mins, enabled)
VALUES
  ('src_gh_poc',      'gh:nomi-sec/PoC-in-GitHub',              'github_radar',    'PoC-in-GitHub release index',        'GLOBAL', 'en', 'exploitation',  72.0, 45, 1),
  ('src_gh_nuclei',   'gh:projectdiscovery/nuclei-templates',   'github_radar',    'ProjectDiscovery nuclei templates',  'GLOBAL', 'en', 'exploitation',  78.0, 45, 1),
  ('src_gh_sigma',    'gh:SigmaHQ/sigma',                       'github_radar',    'SigmaHQ detection rules',            'GLOBAL', 'en', 'advisory',      76.0, 60, 1),
  ('src_gh_darkcti',  'gh:fastfire/deepdarkCTI',                'github_radar',    'deepdarkCTI collection',             'GLOBAL', 'en', 'threat_actor',  66.0, 60, 1),
  ('src_tg_vxug',     'tg:vxunderground',                       'telegram_public', 'vx-underground',                     'GLOBAL', 'en', 'malware',       74.0, 30, 1),
  ('src_tg_thn',      'tg:thehackernews',                       'telegram_public', 'The Hacker News',                    'GLOBAL', 'en', 'news',          70.0, 30, 1),
  ('src_tg_cybernews','tg:cybersecuritynews',                   'telegram_public', 'Cybersecurity News',                 'GLOBAL', 'en', 'news',          58.0, 60, 1),
  ('src_tg_ransom',   'tg:ransomware_live',                     'telegram_public', 'Ransomware.live',                    'GLOBAL', 'en', 'malware',       64.0, 45, 1),
  ('src_rss_xakep',   'rss:https://xakep.ru/feed/',             'regional_feed',   'Xakep.ru',                           'RU',     'ru', 'advisory',      55.0, 60, 1),
  ('src_tg_truesec',  'tg:true_secator',                        'telegram_public', 'True Secator',                       'RU',     'ru', 'exploitation',  56.0, 60, 1),
  ('src_rss_seebug',  'rss:https://paper.seebug.org/rss/',      'regional_feed',   'Seebug Paper',                       'CN',     'zh', 'exploitation',  68.0, 60, 1),
  ('src_tg_anquanke', 'tg:anquanke',                            'telegram_public', '安全客 Anquanke',                     'CN',     'zh', 'advisory',      58.0, 60, 1),
  ('src_rss_zoomit',  'rss:https://www.zoomit.ir/feed/',        'regional_feed',   'Zoomit',                             'IR',     'fa', 'news',          48.0, 90, 1),
  ('src_tg_boannews', 'tg:boannews',                            'telegram_public', 'Boannews',                           'KR',     'ko', 'news',          60.0, 60, 1),
  ('src_tg_gulfsec',  'tg:gulfcybersecurity',                   'telegram_public', 'Gulf Cybersecurity',                 'GCC',    'ar', 'news',          46.0, 90, 1),
  ('src_rss_cisa',    'rss:https://www.cisa.gov/news.xml',      'regional_feed',   'CISA News',                          'GLOBAL', 'en', 'advisory',      88.0, 60, 1),
  ('src_rss_zdi',     'rss:https://www.zerodayinitiative.com/rss/published/', 'regional_feed', 'ZDI Published Advisories', 'GLOBAL', 'en', 'exploitation', 80.0, 30, 1);
