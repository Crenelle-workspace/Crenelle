-- ============================================================
-- Crenelle — Fix Revenue View Security
-- Migration: 051_fix_revenue_views_security_invoker.sql
--
-- Supabase Advisor flagged v_monthly_revenue and v_event_revenue
-- as SECURITY DEFINER views (the PostgreSQL default). This causes
-- the views to execute with the *creator's* privileges, bypassing
-- Row Level Security for any caller.
--
-- Fix: recreate both views with SECURITY INVOKER so they always
-- run under the querying role's privileges, keeping RLS intact.
-- ============================================================

-- ── 1. v_monthly_revenue ──────────────────────────────────────

CREATE OR REPLACE VIEW public.v_monthly_revenue
  WITH (security_invoker = true)
AS
SELECT
  date_trunc('month', paid_at) AS month,
  COALESCE(currency, 'NGN') AS currency,
  COUNT(*)::bigint AS transaction_count,
  COALESCE(SUM(amount_kobo), 0)::bigint AS gmv_kobo,
  COALESCE(SUM(platform_fee_kobo), 0)::bigint AS platform_revenue_kobo,
  COALESCE(SUM(organiser_amount_kobo), 0)::bigint AS organiser_payouts_kobo
FROM public.payments
WHERE status = 'paid'
GROUP BY date_trunc('month', paid_at), COALESCE(currency, 'NGN');

COMMENT ON VIEW public.v_monthly_revenue IS
  'Aggregated monthly revenue metrics grouped by currency and calendar month.';

-- ── 2. v_event_revenue ────────────────────────────────────────

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
  'Per-event aggregated revenue breakdown for admin leaderboard and analytics.';
