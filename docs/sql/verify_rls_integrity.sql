-- ============================================================================
-- ZAYRON-X — Database RLS Integrity Verification Suite
-- Run this query script to audit the final security posture after applying the patch.
-- ============================================================================

-- 1. Verify that RLS is enabled on ALL public tables
-- (Should return rowsecurity = true for all 13 tables)
SELECT 
  tablename, 
  rowsecurity AS "RLS Active",
  HAS_TABLE_PRIVILEGE('anon', tablename, 'SELECT') AS "Anon Select",
  HAS_TABLE_PRIVILEGE('anon', tablename, 'INSERT') AS "Anon Insert",
  HAS_TABLE_PRIVILEGE('anon', tablename, 'UPDATE') AS "Anon Update",
  HAS_TABLE_PRIVILEGE('anon', tablename, 'DELETE') AS "Anon Delete"
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. Audit all active policies and their target roles
-- (Check that write operations for 'authenticated' only succeed via check_is_admin())
SELECT 
  tablename, 
  policyname, 
  roles, 
  cmd AS command, 
  qual AS using_expression, 
  with_check AS check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, cmd;

-- 3. Check for any leak vectors where 'anon' has access to classified telemetry
-- (Should return 0 rows)
SELECT 
  tablename, 
  policyname, 
  roles, 
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('raw_feeds', 'radar_targets', 'threat_artifacts_secure', 'knowledge_base_registry')
  AND 'anon' = ANY(roles);

-- 4. Check for any unauthorized write policies for standard authenticated users
-- (Should return 0 rows; all authenticated write policies must verify check_is_admin() or auth.uid() owner)
SELECT 
  tablename, 
  policyname, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND 'authenticated' = ANY(roles)
  AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
  AND tablename NOT IN ('profiles') -- profiles uses auth.uid() owner check
  AND NOT (
    coalesce(qual, '') LIKE '%check_is_admin%' 
    OR coalesce(with_check, '') LIKE '%check_is_admin%'
  );
