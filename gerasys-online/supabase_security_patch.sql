-- ============================================================
-- ZAYRON-X — Database Security Patch (Privilege Escalation & Hijack Prevention)
-- ============================================================

BEGIN;

-- 1. Drop dangerous client-side UPDATE policies on the profiles table
-- Authenticated users should not update billing fields directly from the client.
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 2. Hardening SECURITY DEFINER functions with explicit search_paths
-- This prevents Search Path Injection / function hijacking.

-- Hardening check_is_subscriber()
CREATE OR REPLACE FUNCTION public.check_is_subscriber()
RETURNS BOOLEAN SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (
        clearance_level = 'SUBSCRIBER'
        OR stripe_subscription_status IN ('active', 'trialing')
      )
  );
END;
$$ LANGUAGE plpgsql;

-- Hardening handle_new_user() trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, clearance_level)
  VALUES (new.id, 'FREE')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
