-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 7A — BANK-GRADE 48-CHARACTER API TOKEN VAULT
--
-- Forward-only. Two tables:
--
--   api_keys         — issued developer credentials. The PLAINTEXT token is
--                      never stored: only `key_hash`, the HMAC-SHA256 hex digest
--                      of the full token under the server-side API_KEY_PEPPER
--                      secret, plus the non-secret routing prefix (`zx_live_`
--                      + 8-character KeyID) used to find the row and to key the
--                      60-second edge cache of validated key metadata.
--
--   api_access_leads — Enterprise/Pro procurement intake from /pricing and
--                      /developers, replacing the dead mailto: funnel.
--
-- No plaintext token column exists anywhere in this schema, by construction.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS api_keys (
  id            TEXT PRIMARY KEY NOT NULL,
  -- `zx_live_` + 8 Base62 characters. Public, non-secret routing identifier.
  key_prefix    TEXT NOT NULL UNIQUE,
  -- HMAC-SHA256(full_token, API_KEY_PEPPER) as lowercase hex (64 chars).
  key_hash      TEXT NOT NULL,
  owner_email   TEXT NOT NULL,
  organization  TEXT,
  tier          TEXT NOT NULL DEFAULT 'free'
                CHECK (tier IN ('free', 'pro', 'enterprise')),
  scopes_json   TEXT NOT NULL,
  daily_quota   INTEGER NOT NULL DEFAULT 500,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'revoked', 'rotating')),
  last_used_at  TEXT,
  created_at    TEXT NOT NULL,
  expires_at    TEXT
);

-- One live key per email address. Revoked rows are excluded so an operator can
-- issue a replacement without first deleting history.
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_owner_email_live
  ON api_keys(owner_email COLLATE NOCASE)
  WHERE status <> 'revoked';

CREATE INDEX IF NOT EXISTS idx_api_keys_status_tier
  ON api_keys(status, tier);

CREATE TABLE IF NOT EXISTS api_access_leads (
  id              TEXT PRIMARY KEY NOT NULL,
  email           TEXT NOT NULL,
  organization    TEXT,
  use_case        TEXT,
  tier_requested  TEXT NOT NULL DEFAULT 'enterprise'
                  CHECK (tier_requested IN ('pro', 'enterprise')),
  source          TEXT NOT NULL DEFAULT 'developers',
  created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_access_leads_created
  ON api_access_leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_access_leads_email
  ON api_access_leads(email COLLATE NOCASE);
