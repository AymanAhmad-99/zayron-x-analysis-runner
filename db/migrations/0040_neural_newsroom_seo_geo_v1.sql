-- PHASE 9B — graph-enriched neural newsroom, SEO/GEO v1.
--
-- Strictly idempotent DDL: 0035–0039 were applied out-of-band, so the
-- `d1_migrations` ledger is behind production and this file must be safe to run
-- more than once. No ALTER TABLE, no dropped objects, no data mutation.

CREATE TABLE IF NOT EXISTS news_articles (
  id                     TEXT PRIMARY KEY,
  slug                   TEXT NOT NULL UNIQUE,
  fingerprint            TEXT NOT NULL UNIQUE,
  title                  TEXT NOT NULL,
  verdict                TEXT NOT NULL,
  summary                TEXT NOT NULL,
  body_sections_json     TEXT NOT NULL,
  category               TEXT NOT NULL,
  severity               TEXT NOT NULL,
  source_name            TEXT NOT NULL,
  source_url             TEXT NOT NULL,
  published_at           TEXT NOT NULL,
  ingested_at            TEXT NOT NULL,
  graph_enrichment_json  TEXT NOT NULL,
  faq_json               TEXT NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'PUBLISHED'
);

CREATE INDEX IF NOT EXISTS idx_news_articles_published
  ON news_articles (status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_news_articles_category
  ON news_articles (category, published_at DESC);

CREATE TABLE IF NOT EXISTS entity_mentions (
  news_id      TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_slug  TEXT NOT NULL,
  entity_label TEXT NOT NULL,
  in_catalog   INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (news_id, entity_type, entity_slug)
);

-- Reverse neural lookup: one indexed read answers
-- "which briefings mention this actor / family / technique / CVE?".
CREATE INDEX IF NOT EXISTS idx_entity_mentions_reverse
  ON entity_mentions (entity_type, entity_slug, news_id);
