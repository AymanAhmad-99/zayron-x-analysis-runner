-- ============================================================================
-- ZAYRON-X — Zero-Trust RLS Remediation Patch v3.0
-- Engineer:  Supabase Security & Database Architecture Team
-- Enforced Principles:
--   1. anon role: Read-only access to published/public tables only.
--   2. authenticated role (Standard): Read-only access to public tables, select own profile.
--   3. authenticated role (Admin): Full CRUD on all tables verified by check_is_admin().
--   4. service_role: Full CRUD on all tables (backend services/workers).
-- ============================================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 1: Revoke broad permissions and clean up default privileges
-- ──────────────────────────────────────────────────────────────────────────
-- Revoke global modification privileges from default user roles
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 2: Create / Rebuild Secure Helper Functions
-- ──────────────────────────────────────────────────────────────────────────
-- Admin check helper function (runs as SECURITY DEFINER to bypass RLS checks on profiles)
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND clearance_level::text = 'ADMIN'
  );
END;
$$;

-- Subscriber check helper function (runs as SECURITY DEFINER to check profiles)
CREATE OR REPLACE FUNCTION public.check_is_subscriber()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND clearance_level::text IN ('SUBSCRIBER', 'ADMIN')
  );
END;
$$;

-- Grant execution privileges on security functions
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_is_subscriber() TO anon, authenticated, service_role;

-- Trigger function to prevent standard users from escalating their own clearance level
CREATE OR REPLACE FUNCTION public.protect_clearance_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.clearance_level IS DISTINCT FROM OLD.clearance_level 
     AND NOT public.check_is_admin() 
     AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can modify security clearance levels.';
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.protect_clearance_level() TO authenticated, service_role;

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 3: Clear all existing RLS Policies for Idempotence
-- ──────────────────────────────────────────────────────────────────────────
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 4: Enable RLS on all 13 Tables
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.analysts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cves                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programming_langs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_feeds                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_artifacts_secure  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radar_targets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_embeddings     ENABLE ROW LEVEL SECURITY;

-- Conditional check for knowledge_base_registry in case it is created later
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'knowledge_base_registry'
  ) THEN
    ALTER TABLE public.knowledge_base_registry ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 5: Define Zero-Trust Row Level Security Policies
-- ──────────────────────────────────────────────────────────────────────────

-- 1. profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_all"  ON public.profiles FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
CREATE POLICY "profiles_service_all" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Attach clearance protection trigger to profiles
DROP TRIGGER IF EXISTS profiles_clearance_protection ON public.profiles;
CREATE TRIGGER profiles_clearance_protection
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_clearance_level();

-- 2. threat_artifacts_secure (Raw Storage - strictly secret)
CREATE POLICY "threats_admin_all"  ON public.threat_artifacts_secure FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
CREATE POLICY "threats_service_all" ON public.threat_artifacts_secure FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. articles
CREATE POLICY "articles_select_public" ON public.articles FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "articles_admin_all"    ON public.articles FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
CREATE POLICY "articles_service_all"   ON public.articles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. cves
CREATE POLICY "cves_select_public" ON public.cves FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cves_admin_all"     ON public.cves FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
CREATE POLICY "cves_service_all"    ON public.cves FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. tools
CREATE POLICY "tools_select_public" ON public.tools FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "tools_admin_all"     ON public.tools FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
CREATE POLICY "tools_service_all"    ON public.tools FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. analysts
CREATE POLICY "analysts_select_public" ON public.analysts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "analysts_admin_all"     ON public.analysts FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
CREATE POLICY "analysts_service_all"    ON public.analysts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. programming_langs
CREATE POLICY "langs_select_public" ON public.programming_langs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "langs_admin_all"     ON public.programming_langs FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
CREATE POLICY "langs_service_all"    ON public.programming_langs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. trending
CREATE POLICY "trending_select_public" ON public.trending FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "trending_admin_all"     ON public.trending FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
CREATE POLICY "trending_service_all"    ON public.trending FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 9. subscribers
CREATE POLICY "subscribers_insert_anon" ON public.subscribers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "subscribers_admin_all"   ON public.subscribers FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
CREATE POLICY "subscribers_service_all"  ON public.subscribers FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 10. raw_feeds (Classified telemetry - no public access)
CREATE POLICY "raw_feeds_admin_all"  ON public.raw_feeds FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
CREATE POLICY "raw_feeds_service_all" ON public.raw_feeds FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 11. radar_targets (Classified target infrastructure - no public access)
CREATE POLICY "targets_admin_all"  ON public.radar_targets FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
CREATE POLICY "targets_service_all" ON public.radar_targets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 12. knowledge_embeddings (Publicly queryable knowledge base vectors)
CREATE POLICY "embeddings_select_public" ON public.knowledge_embeddings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "embeddings_admin_all"     ON public.knowledge_embeddings FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
CREATE POLICY "embeddings_service_all"    ON public.knowledge_embeddings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 13. knowledge_base_registry (Conditional setup if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'knowledge_base_registry'
  ) THEN
    EXECUTE 'CREATE POLICY registry_admin_all ON public.knowledge_base_registry FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin())';
    EXECUTE 'CREATE POLICY registry_service_all ON public.knowledge_base_registry FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 6: Re-grant Explicit Select Privileges for public tables
-- ──────────────────────────────────────────────────────────────────────────
GRANT SELECT ON public.articles, public.cves, public.tools, public.analysts, public.programming_langs, public.trending, public.knowledge_embeddings TO anon, authenticated;
GRANT INSERT ON public.subscribers TO anon;

COMMIT;
