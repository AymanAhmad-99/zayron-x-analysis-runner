-- Task 66: Add structured report columns to intelligence_reports
-- These columns are already parsed by the GET /api/v1/intelligence/:id route
-- (lines 2310-2312 in workers/api/src/index.ts) but may not exist in the deployed schema.

ALTER TABLE intelligence_reports ADD COLUMN structured_report_json TEXT;
ALTER TABLE intelligence_reports ADD COLUMN knowledge_trace_json TEXT;
ALTER TABLE intelligence_reports ADD COLUMN epistemic_breakdown_json TEXT;
