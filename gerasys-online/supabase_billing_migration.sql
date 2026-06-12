-- ============================================================
-- ZAYRON-X — Stripe Billing & Subscriptions Schema Migration
-- ============================================================

BEGIN;

-- 1. Extend profiles table with Stripe telemetry fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id          TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_price_id             TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status   TEXT;

-- Create indexes to optimize stripe-based lookup speeds
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id 
  ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id 
  ON public.profiles(stripe_subscription_id);

-- 2. Update SECURITY DEFINER checking function to align with Stripe status validation
CREATE OR REPLACE FUNCTION public.check_is_subscriber()
RETURNS BOOLEAN SECURITY DEFINER AS $$
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

COMMIT;
