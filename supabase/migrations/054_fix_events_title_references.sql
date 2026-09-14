-- ============================================================
-- Crenelle — Fix: Remove stale references to events.title
-- Migration: 054_fix_events_title_references.sql
--
-- Context: Supabase logs show repeated Postgres error 42703:
--   "column events_1.title does not exist"
-- The events table uses `name`, not `title`. A DB object created
-- ad-hoc in the Supabase SQL editor references the wrong column.
--
-- IMPORTANT: Before running this migration, execute the diagnostic
-- query below in the Supabase SQL Editor to identify which object
-- is the actual source of the error. Then uncomment the appropriate
-- DROP statement.
-- ============================================================

-- ── 1. DIAGNOSTIC: Find objects referencing events.title ─────
-- Run this in the Supabase SQL Editor FIRST:
--
--   SELECT dependent_ns.nspname AS schema,
--          dependent_view.relname AS view_name
--   FROM   pg_depend
--   JOIN   pg_rewrite ON pg_depend.objid = pg_rewrite.oid
--   JOIN   pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid
--   JOIN   pg_class AS source_table ON pg_depend.refobjid = source_table.oid
--   JOIN   pg_attribute ON pg_depend.refobjid = pg_attribute.attrelid
--          AND pg_depend.refobjsubid = pg_attribute.attnum
--   JOIN   pg_namespace AS dependent_ns ON dependent_view.relnamespace = dependent_ns.oid
--   WHERE  source_table.relname = 'events'
--     AND  pg_attribute.attname = 'title';
--
-- If it returns a view name, drop it here:
--   DROP VIEW IF EXISTS public.<view_name_from_query>;

-- ── 2. Refresh v_event_revenue (preserving security_invoker) ─
-- This is a no-op if the view is already correct (events.name),
-- but guarantees it stays in sync with migration 051's security fix.

CREATE OR REPLACE VIEW public.v_event_revenue
  WITH (security_invoker = true)
AS
SELECT
  e.id AS event_id,
  e.name AS event_title,
  e.organizer_id,
  COALESCE(p.currency, 'NGN') AS currency,
  COUNT(p.id)::bigint AS tickets_sold,
  COALESCE(SUM(p.amount_kobo), 0)::bigint AS gmv_kobo,
  COALESCE(SUM(p.platform_fee_kobo), 0)::bigint AS platform_fee_kobo,
  COALESCE(SUM(p.organiser_amount_kobo), 0)::bigint AS organiser_amount_kobo,
  MAX(p.paid_at) AS last_payment_at
FROM public.payments p
JOIN public.events e ON e.id = p.event_id
WHERE p.status = 'paid'
GROUP BY e.id, e.name, e.organizer_id, COALESCE(p.currency, 'NGN');

COMMENT ON VIEW public.v_event_revenue IS
  'Per-event aggregated revenue breakdown. Uses events.name (not events.title).';

