-- =============================================================================
-- Migration 057: Zoho CPaaS Email Tracking & Application-Level Idempotency
-- =============================================================================

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS zoho_request_id text,
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'resend';

-- Non-partial UNIQUE INDEX so PostgreSQL ON CONFLICT (zoho_request_id)
-- matches PostgREST .upsert(..., { onConflict: 'zoho_request_id' }).
-- PostgreSQL permits multiple NULL values in a standard unique index.
CREATE UNIQUE INDEX IF NOT EXISTS email_logs_zoho_id_idx
  ON public.email_logs (zoho_request_id);

-- Idempotency guard table (24h dedup equivalent to Resend's Idempotency-Key)
CREATE TABLE IF NOT EXISTS public.email_idempotency_keys (
  key        text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_idempotency_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages email idempotency keys" ON public.email_idempotency_keys;
CREATE POLICY "Service role manages email idempotency keys"
  ON public.email_idempotency_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

