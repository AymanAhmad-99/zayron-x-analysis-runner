-- Phase 4C — EXECUTIVE TELEGRAM INTELLIGENCE WIRE ledger.
--
-- WHY A LEDGER (not a flag on the entity rows)
--   1. The wire publishes TWO entity types (`vulnerabilities`, `malware_reports`)
--      that share one dedupe policy. A ledger keeps that policy in ONE place
--      instead of teaching two unrelated writers about Telegram state.
--   2. Telegram is not idempotent: a duplicate send is a live, public post. The
--      UNIQUE constraint below is the only enforcement that survives a retried
--      cron, a replayed operator request or two overlapping invocations.
--   3. FAILED and SKIPPED are recorded too, so an operator can see why a
--      high-signal record never reached the channel without reading Worker logs.
--
-- Additive only: no existing table, column or index is touched.

CREATE TABLE IF NOT EXISTS telegram_dispatches (
  id                  TEXT PRIMARY KEY,
  entity_type         TEXT NOT NULL CHECK (entity_type IN ('cve', 'malware')),
  entity_id           TEXT NOT NULL,
  channel             TEXT NOT NULL,
  telegram_message_id TEXT,
  status              TEXT NOT NULL CHECK (status IN ('SENT', 'FAILED', 'SKIPPED')),
  error_code          TEXT,
  dispatched_at       TEXT NOT NULL,
  UNIQUE (entity_type, entity_id, channel)
);

-- Daily-cap reads: "how many SENT rows today on this channel".
CREATE INDEX IF NOT EXISTS idx_telegram_dispatches_day
  ON telegram_dispatches (channel, dispatched_at);
