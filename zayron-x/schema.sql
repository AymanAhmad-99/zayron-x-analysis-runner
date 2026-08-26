PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS posts(
 id TEXT PRIMARY KEY,
 title TEXT NOT NULL,
 summary TEXT NOT NULL,
 category TEXT NOT NULL CHECK(category IN ('malware','threat-actor','analysis')),
 source TEXT NOT NULL,
 published_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category_published ON posts(category,published_at DESC);

CREATE TABLE IF NOT EXISTS threat_iocs(
 id TEXT PRIMARY KEY, indicator TEXT NOT NULL, kind TEXT NOT NULL,
 source TEXT NOT NULL, confidence INTEGER NOT NULL DEFAULT 0,
 severity TEXT, context TEXT, observed_at TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ioc_observed ON threat_iocs(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ioc_kind_indicator ON threat_iocs(kind,indicator);
CREATE TABLE IF NOT EXISTS malware_reports(
 id TEXT PRIMARY KEY, title TEXT NOT NULL, sha256 TEXT, family TEXT,
 summary TEXT NOT NULL, source TEXT NOT NULL, severity TEXT,
 report_json TEXT NOT NULL, published_at TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_malware_published ON malware_reports(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_malware_sha256 ON malware_reports(sha256);
