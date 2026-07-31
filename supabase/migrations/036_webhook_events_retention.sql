-- ============================================================
-- Crenelle — webhook_events Retention Policy
-- Migration: 036_webhook_events_retention.sql
-- ============================================================
--
-- The webhook_events table is append-only and grows without bound.
-- At 10,000 webhook events/day × 365 days ≈ 3.6M rows and several GB
-- of JSONB storage with no cleanup mechanism.
--
-- This migration adds a scheduled pg_cron job that:
--   - Runs daily at 03:00 UTC (off-peak)
--   - Deletes rows that are BOTH processed AND older than 90 days
--   - Preserves all unprocessed rows (processed = false) regardless of age
--   - Preserves all rows from the last 90 days (for dispute/compliance windows)
--
-- 90 days is chosen to cover:
--   - Paystack's dispute window (typically 60 days from transaction)
--   - Any compliance or audit lookups the team may need
--
-- If you need a longer retention period (e.g. 180 days for enterprise),
-- change the interval below.
-- ============================================================

-- Requires pg_cron extension (enabled by default on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant pg_cron usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- ── Schedule the retention job ────────────────────────────────

SELECT cron.schedule(
  'webhook-events-cleanup',       -- job name (unique, use to manage/cancel)
  '0 3 * * *',                    -- daily at 03:00 UTC
  $$
    DELETE FROM public.webhook_events
    WHERE
      processed   = true
      AND received_at < now() - interval '90 days';
  $$
);

COMMENT ON EXTENSION pg_cron IS
  'Used by Crenelle for scheduled maintenance jobs including webhook_events cleanup.';

-- ── Optional: view scheduled jobs ────────────────────────────
-- SELECT * FROM cron.job;
-- ── Optional: cancel the job ─────────────────────────────────
-- SELECT cron.unschedule('webhook-events-cleanup');

-- ── Add processed_at index for efficient cleanup queries ─────
-- The DELETE above filters on (processed, received_at).
-- A partial index on unprocessed rows already exists from migration 033.
-- We add a complementary index on processed rows by age for the cleanup query.
CREATE INDEX IF NOT EXISTS webhook_events_cleanup_idx
  ON public.webhook_events (received_at)
  WHERE processed = true;
