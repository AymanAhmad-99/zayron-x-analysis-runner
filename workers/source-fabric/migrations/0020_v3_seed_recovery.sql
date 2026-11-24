-- Additive recovery metadata for resumable chunk ownership and payload provenance.
ALTER TABLE v3_seed_chunks ADD COLUMN payload_key TEXT;
ALTER TABLE v3_seed_chunks ADD COLUMN payload_bytes INTEGER;
ALTER TABLE v3_seed_chunks ADD COLUMN claim_owner TEXT;
ALTER TABLE v3_seed_chunks ADD COLUMN lease_expires_at TEXT;
CREATE INDEX IF NOT EXISTS idx_v3_seed_chunks_lease ON v3_seed_chunks(lifecycle, lease_expires_at);
