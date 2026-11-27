-- PHASE 9C-MAIL-PRO — Inbound Mail Desk (intel@ / security@) event ledger.
-- Strictly idempotent DDL: CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
-- Never touches LEGACY_FREEZE or any existing cron slot.

CREATE TABLE IF NOT EXISTS inbound_mail_events (
  id TEXT PRIMARY KEY,
  -- Which institutional desk received the message.
  desk TEXT NOT NULL CHECK (desk IN ('intel', 'security')),
  -- SHA-256 of the normalized sender: the raw address is never stored here.
  sender_hash TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('AUTO_REPLIED', 'SUPPRESSED', 'FORWARDED')),
  reason TEXT,
  received_at TEXT NOT NULL
);

-- The 24-hour per-sender-per-desk cooldown lookup. Partial index: only
-- AUTO_REPLIED rows can ever start a cooldown, so the probe stays tiny.
CREATE INDEX IF NOT EXISTS idx_inbound_mail_cooldown
  ON inbound_mail_events(desk, sender_hash, received_at DESC)
  WHERE action = 'AUTO_REPLIED';

CREATE INDEX IF NOT EXISTS idx_inbound_mail_received
  ON inbound_mail_events(received_at DESC);
