-- Phase 5A — `ai_analyst_assessment.v4` / CTI Enrichment v2.
--
-- WHY THESE COLUMNS ARE NECESSARY
-- The Phase 5A audit proved that `vulnerabilities` stored a CVSS score without
-- saying WHICH authority produced it, dropped NVD `weaknesses`, `ssvcV203`,
-- `vulnStatus` and `references` entirely, and had no place to separate public
-- PoC observation from validated PoC execution from in-the-wild exploitation.
-- Every column below is additive and nullable: existing rows keep NULL and the
-- readers treat NULL as "not established", never as a negative fact.
--
-- `published_at` already exists on this table (NVD published), so the third
-- timestamp added here is `modified_at` (source last-modified) and
-- `last_checked_at` (our own fetch), which are different facts.
ALTER TABLE vulnerabilities ADD COLUMN vuln_status TEXT;
ALTER TABLE vulnerabilities ADD COLUMN cwe_ids_json TEXT;
ALTER TABLE vulnerabilities ADD COLUMN references_json TEXT;
ALTER TABLE vulnerabilities ADD COLUMN cvss_source_provider TEXT;
ALTER TABLE vulnerabilities ADD COLUMN cvss_source_type TEXT;
ALTER TABLE vulnerabilities ADD COLUMN ssvc_json TEXT;
ALTER TABLE vulnerabilities ADD COLUMN public_poc_status TEXT;
ALTER TABLE vulnerabilities ADD COLUMN poc_validation TEXT;
ALTER TABLE vulnerabilities ADD COLUMN poc_references_json TEXT;
ALTER TABLE vulnerabilities ADD COLUMN in_the_wild_exploitation TEXT;
ALTER TABLE vulnerabilities ADD COLUMN modified_at TEXT;
ALTER TABLE vulnerabilities ADD COLUMN last_checked_at TEXT;

-- Raw per-source snapshots are written idempotently, which needs a real key.
-- `vulnerability_source_records` was empty before Phase 5A, so no existing row
-- can collide with this constraint.
CREATE UNIQUE INDEX IF NOT EXISTS idx_vuln_source_records_identity
  ON vulnerability_source_records (source_id, source_record_id);

-- Enrichment scans the authoritative corpus by provenance and freshness.
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_enrichment_freshness
  ON vulnerabilities (provenance_state, last_checked_at);
