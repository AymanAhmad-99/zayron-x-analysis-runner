-- PHASE 9C — Unified Social Distribution (X + LinkedIn) & Email Intelligence Briefings
-- Strictly idempotent DDL (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS social_dispatches (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('x', 'linkedin')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('news', 'cve', 'malware_advisory', 'ioc_pulse')),
  base_entity_id TEXT NOT NULL,
  external_post_id TEXT,
  reply_post_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('SENT', 'FAILED', 'SKIPPED_NO_CREDS')),
  error_message TEXT,
  dispatched_at TEXT NOT NULL
);

-- All-time zero-duplicate guarantee per platform for SENT dispatches.
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_sent_dedupe
  ON social_dispatches(platform, base_entity_id)
  WHERE status = 'SENT';

CREATE INDEX IF NOT EXISTS idx_social_platform_time
  ON social_dispatches(platform, dispatched_at DESC);

CREATE TABLE IF NOT EXISTS email_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  focus TEXT NOT NULL DEFAULT 'all' CHECK (focus IN ('all', 'critical_kev', 'supply_chain')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'UNSUBSCRIBED')),
  unsubscribe_token TEXT NOT NULL UNIQUE,
  subscribed_at TEXT NOT NULL,
  unsubscribed_at TEXT,
  last_sent_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_subscribers_status
  ON email_subscribers(status, frequency);
