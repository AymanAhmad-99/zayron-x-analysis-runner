-- ============================================================================
-- ZAYRON-X — Swarm Assessment & Cloudflare WAF Gating Schema Extension
-- Action: Add WAF rules and 25-point breakdown columns.
-- Recreate public.threat_artifacts view to mask them for non-subscribers.
-- ============================================================================

BEGIN;

-- 1. Extend 'threat_artifacts_secure' table
ALTER TABLE public.threat_artifacts_secure ADD COLUMN IF NOT EXISTS cloudflare_waf_rules TEXT;
ALTER TABLE public.threat_artifacts_secure ADD COLUMN IF NOT EXISTS assessment_25_point JSONB;

-- 2. Extend 'articles' table
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS cloudflare_waf_rules TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS assessment_25_point JSONB;

-- 3. Drop existing view first to avoid column mismatch errors
DROP VIEW IF EXISTS public.threat_artifacts;

-- 4. Recreate public.threat_artifacts view with masked gating logic
CREATE VIEW public.threat_artifacts AS
SELECT
  id,
  title,
  severity,
  cvss_score,
  fbr_total,
  sector,
  CASE
    WHEN public.check_is_subscriber() THEN yara_rules
    ELSE '[ RESTRICTED_INTEL ]'
  END AS yara_rules,
  CASE
    WHEN public.check_is_subscriber() THEN sigma_rules
    ELSE '[ RESTRICTED_INTEL ]'
  END AS sigma_rules,
  CASE
    WHEN public.check_is_subscriber() THEN raw_iocs
    ELSE '[ RESTRICTED_INTEL ]'
  END AS raw_iocs,
  CASE
    WHEN public.check_is_subscriber() THEN unmasked_target_entities
    ELSE '[ RESTRICTED_INTEL ]'
  END AS unmasked_target_entities,
  CASE
    WHEN public.check_is_subscriber() THEN sitrep_pdf_url
    ELSE '[ RESTRICTED_INTEL ]'
  END AS sitrep_pdf_url,
  CASE
    WHEN public.check_is_subscriber() THEN cloudflare_waf_rules
    ELSE '[ RESTRICTED_INTEL ]'
  END AS cloudflare_waf_rules,
  CASE
    WHEN public.check_is_subscriber() THEN assessment_25_point
    ELSE '{"status": "restricted"}'::jsonb
  END AS assessment_25_point,
  created_at,
  updated_at
FROM public.threat_artifacts_secure;

-- 5. Re-grant select access on the view
GRANT SELECT ON public.threat_artifacts TO anon, authenticated, service_role;

COMMIT;
