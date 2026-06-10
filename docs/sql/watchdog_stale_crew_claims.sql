-- ============================================================================
-- ZAYRON-X — Stale-Claim Watchdog for raw_feeds (WARN-14 Remediation)
--
-- Problem: If zayron_crew_daemon is OOM-killed mid-inference, the raw_feeds row
-- remains in status='processing_crew' indefinitely. The optimistic-lock pattern
-- in persistence.py prevents re-claiming, so these rows are permanently orphaned.
--
-- Fix: A PostgreSQL function + pg_cron schedule that reverts any row that has
-- been in 'processing_crew' for more than 10 minutes back to 'pending'.
-- This allows the master scheduler to reclaim and reprocess on next cycle.
--
-- HOW TO RUN:
--   1. Paste + execute in Supabase SQL Editor (no extensions needed for the function).
--   2. For pg_cron scheduling: Supabase Dashboard → Database → Extensions → enable pg_cron.
--      Then run the cron schedule block at the bottom.
--
-- Alternatively, the watchdog function can be called by the Python workers
-- at the start of each main_loop() invocation (see PYTHON INTEGRATION section).
-- ============================================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- WATCHDOG FUNCTION: revert stale processing_crew rows back to pending
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.revert_stale_crew_claims(
  stale_threshold_minutes INT DEFAULT 10
)
RETURNS TABLE (reverted_id UUID, was_locked_since TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff := NOW() - (stale_threshold_minutes || ' minutes')::INTERVAL;

  RETURN QUERY
  UPDATE public.raw_feeds
  SET
    status = 'pending',
    -- Reset promoted_at to NULL so it doesn't mislead downstream monitoring
    promoted_at = NULL
  WHERE
    status = 'processing_crew'
    AND created_at < cutoff  -- Row has been locked for > threshold
  RETURNING
    id AS reverted_id,
    created_at AS was_locked_since;
END;
$$;

-- Grant execution to service_role (used by Python workers and pg_cron)
GRANT EXECUTE ON FUNCTION public.revert_stale_crew_claims(INT) TO service_role;

COMMIT;

-- ──────────────────────────────────────────────────────────────────────────
-- OPTIONAL: pg_cron Scheduled Execution (run every 10 minutes)
-- Requires pg_cron extension enabled in Supabase Dashboard.
-- ──────────────────────────────────────────────────────────────────────────
-- SELECT cron.schedule(
--   'zayron-stale-claim-watchdog',     -- Job name
--   '*/10 * * * *',                    -- Every 10 minutes
--   $$
--     SELECT public.revert_stale_crew_claims(10);
--   $$
-- );

-- ──────────────────────────────────────────────────────────────────────────
-- VERIFICATION: Manually invoke and inspect results
-- ──────────────────────────────────────────────────────────────────────────
-- SELECT * FROM public.revert_stale_crew_claims(10);
-- SELECT id, status, created_at FROM public.raw_feeds WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10;
