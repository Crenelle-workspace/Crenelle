-- ============================================================
-- Crenelle — Admin Revenue & Tax Analytics
-- Migration: 050_revenue_admin_views.sql
-- ============================================================

-- ── 1. platform_tax_settings ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.platform_tax_settings (
  id          uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  key         text          NOT NULL UNIQUE,
  value       numeric(10,4) NOT NULL,
  description text,
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_tax_settings IS
  'Platform tax configuration settings (VAT %, WHT %, WHT threshold). Admin managed.';

-- Seed default tax settings (NGN tax rules)
INSERT INTO public.platform_tax_settings (key, value, description)
VALUES
  ('vat_percent', 7.5, 'Nigerian Value Added Tax (VAT) percentage applied to platform fee revenue'),
  ('wht_percent', 5.0, 'Withholding Tax (WHT) percentage applicable to organizer disbursements'),
  ('wht_threshold_kobo', 1000000, 'WHT monthly threshold per organizer in kobo (₦10,000)')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();

ALTER TABLE public.platform_tax_settings ENABLE ROW LEVEL SECURITY;

-- Service role / Admin access only
CREATE POLICY "Admin read platform_tax_settings"
  ON public.platform_tax_settings FOR SELECT
  TO service_role
  USING (true);

-- Auto-update updated_at on row changes (mirrors pattern in migrations 032, 035)
CREATE TRIGGER platform_tax_settings_updated_at
  BEFORE UPDATE ON public.platform_tax_settings
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ── 2. v_monthly_revenue ──────────────────────────────────────

CREATE OR REPLACE VIEW public.v_monthly_revenue AS
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

-- ── 3. v_event_revenue ────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_event_revenue AS
SELECT
  e.id AS event_id,
  e.title AS event_title,
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
GROUP BY e.id, e.title, e.organizer_id, COALESCE(p.currency, 'NGN');

COMMENT ON VIEW public.v_event_revenue IS
  'Per-event aggregated revenue breakdown for admin leaderboard and analytics.';

-- ── 4. Indexes for Revenue Queries ────────────────────────────

CREATE INDEX IF NOT EXISTS payments_status_paid_at_currency_idx
  ON public.payments (status, paid_at DESC, currency);

CREATE INDEX IF NOT EXISTS payments_event_id_status_idx
  ON public.payments (event_id, status);
