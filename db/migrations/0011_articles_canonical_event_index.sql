-- Index on articles.canonical_intel_event_id to optimize deduplication and event-article cross-resolution lookups
CREATE INDEX IF NOT EXISTS idx_articles_canonical_event ON articles(canonical_intel_event_id);
