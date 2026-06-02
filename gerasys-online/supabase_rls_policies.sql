-- ═══════════════════════════════════════════════════════════════
-- ZAYRON-X — Row Level Security Policies
-- Date:      2026-06-02
-- Engineer:  DeepTrace-2027 Supabase DBA Squad
-- ═══════════════════════════════════════════════════════════════
--
-- These policies enforce the following access model:
--
--   ROLE          | PERMISSIONS
--   ──────────────┼──────────────────────────────────────────────
--   anon          | Read published content; subscribe; read CVEs
--   authenticated | Same as anon + read own profile
--   subscriber    | Read premium threat_artifacts
--   admin         | Full CRUD on all tables
--   service_role  | Bypasses RLS entirely (trusted server-side)
--
-- Apply via Supabase SQL Editor or psql.
-- All policies use IF NOT EXISTS / DROP IF EXISTS for idempotency.
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. ARTICLES
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published articles" ON articles;
CREATE POLICY "Public can read published articles" ON articles
  FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS "Admin can insert articles" ON articles;
CREATE POLICY "Admin can insert articles" ON articles
  FOR INSERT
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admin can update articles" ON articles;
CREATE POLICY "Admin can update articles" ON articles
  FOR UPDATE
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admin can delete articles" ON articles;
CREATE POLICY "Admin can delete articles" ON articles
  FOR DELETE
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- ═══════════════════════════════════════════════════════════════
-- 2. CVEs
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE cves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read CVEs" ON cves;
CREATE POLICY "Public can read CVEs" ON cves
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin can insert CVEs" ON cves;
CREATE POLICY "Admin can insert CVEs" ON cves
  FOR INSERT
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admin can update CVEs" ON cves;
CREATE POLICY "Admin can update CVEs" ON cves
  FOR UPDATE
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admin can delete CVEs" ON cves;
CREATE POLICY "Admin can delete CVEs" ON cves
  FOR DELETE
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- ═══════════════════════════════════════════════════════════════
-- 3. PROFILES
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;
CREATE POLICY "Admin can read all profiles" ON profiles
  FOR SELECT
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Service role manages profiles" ON profiles;
CREATE POLICY "Service role manages profiles" ON profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 4. SUBSCRIBERS
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can subscribe" ON subscribers;
CREATE POLICY "Anyone can subscribe" ON subscribers
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can read subscribers" ON subscribers;
CREATE POLICY "Admin can read subscribers" ON subscribers
  FOR SELECT
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admin can delete subscribers" ON subscribers;
CREATE POLICY "Admin can delete subscribers" ON subscribers
  FOR DELETE
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- ═══════════════════════════════════════════════════════════════
-- 5. RAW_FEEDS
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE raw_feeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read raw feeds" ON raw_feeds;
CREATE POLICY "Admin can read raw feeds" ON raw_feeds
  FOR SELECT
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admin can insert raw feeds" ON raw_feeds;
CREATE POLICY "Admin can insert raw feeds" ON raw_feeds
  FOR INSERT
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admin can update raw feeds" ON raw_feeds;
CREATE POLICY "Admin can update raw feeds" ON raw_feeds
  FOR UPDATE
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admin can delete raw feeds" ON raw_feeds;
CREATE POLICY "Admin can delete raw feeds" ON raw_feeds
  FOR DELETE
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- ═══════════════════════════════════════════════════════════════
-- 6. ANALYSTS
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE analysts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read analysts" ON analysts;
CREATE POLICY "Public can read analysts" ON analysts
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin can manage analysts" ON analysts;
CREATE POLICY "Admin can manage analysts" ON analysts
  FOR ALL
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- ═══════════════════════════════════════════════════════════════
-- 7. THREAT_ARTIFACTS
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE threat_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Subscribers can read threat artifacts" ON threat_artifacts;
CREATE POLICY "Subscribers can read threat artifacts" ON threat_artifacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.clearance_level IN ('SUBSCRIBER', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "Admin can manage threat artifacts" ON threat_artifacts;
CREATE POLICY "Admin can manage threat artifacts" ON threat_artifacts
  FOR ALL
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- ═══════════════════════════════════════════════════════════════
-- 8. TOOLS
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read tools" ON tools;
CREATE POLICY "Public can read tools" ON tools
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin can manage tools" ON tools;
CREATE POLICY "Admin can manage tools" ON tools
  FOR ALL
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- ═══════════════════════════════════════════════════════════════
-- 9. PROGRAMMING_LANGS
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE programming_langs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read programming languages" ON programming_langs;
CREATE POLICY "Public can read programming languages" ON programming_langs
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin can manage programming languages" ON programming_langs;
CREATE POLICY "Admin can manage programming languages" ON programming_langs
  FOR ALL
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- ═══════════════════════════════════════════════════════════════
-- 10. TRENDING
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE trending ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read trending" ON trending;
CREATE POLICY "Public can read trending" ON trending
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin can manage trending" ON trending;
CREATE POLICY "Admin can manage trending" ON trending
  FOR ALL
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (run after applying policies)
-- ═══════════════════════════════════════════════════════════════
-- SELECT tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
