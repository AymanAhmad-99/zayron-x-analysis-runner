-- Phase 4A — `ai_analyst_assessment.v3` strategic brief storage.
--
-- WHY A COLUMN IS NECESSARY
-- The strategic brief is model-authored. `intelligence_reports` only exists for
-- CVEs that went through the analyst-grade dossier pipeline, while the
-- authoritative NVD/KEV/EPSS corpus lives in `vulnerabilities`. Storing the
-- brief on `vulnerabilities` is therefore the only place the public page can
-- read it for an authoritative CVE, and it keeps model output OUT of
-- `public_advisory` (which the withheld-read allowlist serves verbatim).
--
-- Existing rows keep NULL: a NULL brief renders nothing and never implies a
-- pending, failed or fabricated assessment.
ALTER TABLE vulnerabilities ADD COLUMN strategic_brief_json TEXT;
ALTER TABLE vulnerabilities ADD COLUMN strategic_brief_version TEXT;
ALTER TABLE vulnerabilities ADD COLUMN strategic_brief_generated_at TEXT;

-- Budget/eligibility reads scan high-impact authoritative rows only.
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_strategic_eligibility
  ON vulnerabilities (provenance_state, is_exploited_in_wild, epss_score, cvss_score);
