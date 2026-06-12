-- ============================================================
-- ZAYRON-X — V2.0 Commercial Tier & MFA Security Migration
-- ============================================================

BEGIN;

-- 1. Extend profiles table with commercial tier_id
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tier_id TEXT DEFAULT 'FREE';

-- Create index for tier_id to optimize clearance checks
CREATE INDEX IF NOT EXISTS idx_profiles_tier_id ON public.profiles(tier_id);

-- 2. Upgrade subscriber check to support new commercial tiers
CREATE OR REPLACE FUNCTION public.check_is_subscriber()
RETURNS BOOLEAN SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (
        clearance_level IN ('SUBSCRIBER', 'ADMIN')
        OR stripe_subscription_status IN ('active', 'trialing')
        OR tier_id IN ('TACTICAL_OBSERVER', 'SOVEREIGN_COMMAND')
      )
  );
END;
$$ LANGUAGE plpgsql;

-- 3. MFA verification helper function
CREATE OR REPLACE FUNCTION public.check_is_mfa_authenticated()
RETURNS BOOLEAN SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Verify if JWT contains 'mfa' or 'totp' authentication method claims
  RETURN COALESCE(
    EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(COALESCE(auth.jwt() -> 'amr', '[]'::jsonb)) AS val
      WHERE val IN ('mfa', 'totp')
    ),
    FALSE
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Harden raw_feeds Row Level Security policies with MFA verification
ALTER TABLE public.raw_feeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read raw feeds" ON public.raw_feeds;
CREATE POLICY "Admin can read raw feeds" ON public.raw_feeds
  FOR SELECT
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    AND public.check_is_mfa_authenticated()
  );

DROP POLICY IF EXISTS "Admin can insert raw feeds" ON public.raw_feeds;
CREATE POLICY "Admin can insert raw feeds" ON public.raw_feeds
  FOR INSERT
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    AND public.check_is_mfa_authenticated()
  );

DROP POLICY IF EXISTS "Admin can update raw feeds" ON public.raw_feeds;
CREATE POLICY "Admin can update raw feeds" ON public.raw_feeds
  FOR UPDATE
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    AND public.check_is_mfa_authenticated()
  );

DROP POLICY IF EXISTS "Admin can delete raw feeds" ON public.raw_feeds;
CREATE POLICY "Admin can delete raw feeds" ON public.raw_feeds
  FOR DELETE
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    AND public.check_is_mfa_authenticated()
  );

-- 5. Upgrade handle_new_user() trigger function to support tier_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, clearance_level, tier_id)
  VALUES (new.id, 'FREE', 'FREE')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
