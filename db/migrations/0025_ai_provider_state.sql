-- Migration 0025 — durable AI provider switch state
--
-- PURPOSE
-- Persist the AI provider-switch decision across Worker instances and requests
-- for the remainder of the Cloudflare daily quota period, so that once the daily
-- free neuron allocation is confirmed exhausted, subsequent analysis-generation
-- requests go straight to Gemini instead of re-attempting Cloudflare per CVE.
--
-- WHY A TABLE (NOT KV / MEMORY)
-- D1 (`env.DB`) is the only durable store already provisioned to the analysis
-- Worker. An isolate-local variable is NOT durable: isolates are short-lived and
-- numerous, which is exactly why the previous in-memory approach forgot the
-- exhaustion continuously.
--
-- ONE ROW PER PROVIDER. The row is written only for a CONFIRMED daily-allocation
-- exhaustion; `quota_period` (UTC day) makes the switch self-limiting — a record
-- belonging to an earlier period is ignored, which is how the state resets when
-- the allocation resets at 00:00 UTC. An explicitly authorized administrative
-- action may also clear the row.
--
-- Idempotent: uses CREATE TABLE IF NOT EXISTS, matching the 0024 conventions.

CREATE TABLE IF NOT EXISTS ai_provider_state (
  provider TEXT PRIMARY KEY,
  availability TEXT NOT NULL,
  quota_period TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  evidence TEXT NOT NULL DEFAULT '',
  observed_at TEXT NOT NULL,
  reset_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_state_period ON ai_provider_state(quota_period);
