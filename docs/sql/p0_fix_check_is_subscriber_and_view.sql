-- ============================================================================
-- ZAYRON-X — P0 CRITICAL SQL MIGRATION: check_is_subscriber Fix + View Rebuild
-- Audit Reference: FATAL-02, FATAL-03 from system_depth_audit_55.md
--
-- Problem: check_is_subscriber() compares clearance_level (possibly INTEGER or
-- ENUM) against TEXT literal 'SUBSCRIBER', causing PostgreSQL error 22P02
-- (invalid input syntax for type integer). This kills the threat_artifacts view,
-- returning 0 rows to all consumers.
--
-- Fix:
--   1. Explicit ::text cast on clearance_level before string comparison.
--   2. Drop + recreate public.threat_artifacts view to flush execution plan cache.
--   3. Re-grant SELECT to anon, authenticated, service_role.
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New Query → paste + execute.
--   Expected result: Function re-created, view re-created, no errors.
-- ============================================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 1: Repair check_is_subscriber() — add ::text cast (FATAL-02)
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_is_subscriber()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ::text cast makes this work regardless of whether clearance_level is
  -- TEXT, VARCHAR, CHAR, an ENUM type, or an INTEGER enum variant.
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND clearance_level::text = 'SUBSCRIBER'
  );
END;
$$;

-- Grant execute rights so the view can invoke it under all roles.
GRANT EXECUTE ON FUNCTION public.check_is_subscriber() TO anon, authenticated, service_role;

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 2: Drop and fully rebuild public.threat_artifacts view (FATAL-03)
-- Dropping ensures no stale column references or cached execution plan.
-- ──────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.threat_artifacts;

CREATE VIEW public.threat_artifacts AS
SELECT
  id,
  title,
  severity,
  cvss_score,
  fbr_total,
  sector,
  is_public_teaser,
  teaser_text,
  created_at,
  updated_at,
  -- Premium fields gated by subscriber check:
  CASE
    WHEN public.check_is_subscriber() THEN yara_rules
    ELSE '[ RESTRICTED_INTEL — SUBSCRIBE FOR ACCESS ]'
  END AS yara_rules,
  CASE
    WHEN public.check_is_subscriber() THEN sigma_rules
    ELSE '[ RESTRICTED_INTEL — SUBSCRIBE FOR ACCESS ]'
  END AS sigma_rules,
  CASE
    WHEN public.check_is_subscriber() THEN raw_iocs
    ELSE '[ RESTRICTED_INTEL — SUBSCRIBE FOR ACCESS ]'
  END AS raw_iocs,
  CASE
    WHEN public.check_is_subscriber() THEN unmasked_target_entities
    ELSE '[ RESTRICTED_INTEL — SUBSCRIBE FOR ACCESS ]'
  END AS unmasked_target_entities,
  CASE
    WHEN public.check_is_subscriber() THEN sitrep_pdf_url
    ELSE NULL
  END AS sitrep_pdf_url,
  CASE
    WHEN public.check_is_subscriber() THEN cloudflare_waf_rules
    ELSE '[ RESTRICTED_INTEL — SUBSCRIBE FOR ACCESS ]'
  END AS cloudflare_waf_rules,
  CASE
    WHEN public.check_is_subscriber() THEN assessment_25_point
    ELSE '{"status": "restricted", "message": "Subscribe for full 25-point swarm assessment"}'::jsonb
  END AS assessment_25_point
FROM public.threat_artifacts_secure;

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 3: Re-grant SELECT on the view to all relevant roles.
-- ──────────────────────────────────────────────────────────────────────────
GRANT SELECT ON public.threat_artifacts TO anon, authenticated, service_role;

-- ──────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES (run after COMMIT to validate fix)
-- ──────────────────────────────────────────────────────────────────────────
-- SELECT public.check_is_subscriber();           -- Should return false (anon)
-- SELECT COUNT(*) FROM public.threat_artifacts;  -- Should return 24 rows
-- SELECT id, title, severity FROM public.threat_artifacts LIMIT 5;

COMMIT;
