-- PHASE 10A — Enterprise & Intelligence Inquiry intake (homepage form).
--
-- Idempotent: every object is created with IF NOT EXISTS so this migration can be
-- applied to a database that was provisioned out-of-band without erroring.
--
-- Privacy: the submitter's raw IP is NEVER stored. `ip_hash` holds the first 32
-- hex characters of a SHA-256 digest, used only for abuse correlation.

CREATE TABLE IF NOT EXISTS enterprise_inquiries (
  id           TEXT PRIMARY KEY,
  reference_id TEXT NOT NULL UNIQUE,
  company      TEXT NOT NULL,
  email        TEXT NOT NULL,
  inquiry      TEXT NOT NULL,
  ip_hash      TEXT,
  created_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_enterprise_inquiries_created_at
  ON enterprise_inquiries (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enterprise_inquiries_email
  ON enterprise_inquiries (email);
