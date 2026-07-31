-- ============================================================
-- Crenelle — Webhook Audit Table & Dispute Support
-- Migration: 033_webhook_audit_and_disputes.sql
-- ============================================================
--
-- Adds:
--   1. webhook_events  — raw payload store for every inbound Paystack webhook
--                        (enables replay, debugging, and audit compliance)
--   2. 'disputed' status to payments.status CHECK constraint
--
-- From the v2 Production Readiness Checklist:
--   ✓ "webhook_events audit table stores every raw payload for replay and debugging"
--   ✓ "ticket_orders.status models PENDING, SUCCESS, REFUNDED, and DISPUTED — not just SUCCESS"
--   ✓ "refund.processed and charge.dispute.create webhooks are handled"
-- ============================================================

-- ── 1. webhook_events ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id                  uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Source
  source              text          NOT NULL DEFAULT 'paystack',   -- future-proof for other providers
  -- Raw payload (stored as received, before any processing)
  event_type          text,                                        -- e.g. 'charge.success'
  paystack_reference  text,                                        -- extracted for fast lookup
  raw_payload         jsonb         NOT NULL,
  -- Signature verification result
  signature_valid     boolean       NOT NULL DEFAULT false,
  -- Processing outcome
  processed           boolean       NOT NULL DEFAULT false,
  processing_error    text,                                        -- null if processed successfully
  -- HTTP metadata
  idempotency_key     text,                                        -- Paystack-Idempotency-Key header if present
  -- Timestamps
  received_at         timestamptz   NOT NULL DEFAULT now(),
  processed_at        timestamptz
);

COMMENT ON TABLE public.webhook_events IS
  'Append-only audit log of every inbound Paystack webhook payload. Never delete rows — used for replay and compliance.';

COMMENT ON COLUMN public.webhook_events.raw_payload IS
  'The full JSON body as received from Paystack, stored before any processing. Used for replay and debugging.';

COMMENT ON COLUMN public.webhook_events.signature_valid IS
  'Whether the HMAC-SHA512 signature verified successfully. Invalid payloads are still stored for security auditing.';

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS webhook_events_event_type_idx
  ON public.webhook_events (event_type);

CREATE INDEX IF NOT EXISTS webhook_events_reference_idx
  ON public.webhook_events (paystack_reference)
  WHERE paystack_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS webhook_events_received_at_idx
  ON public.webhook_events (received_at DESC);

CREATE INDEX IF NOT EXISTS webhook_events_processed_idx
  ON public.webhook_events (processed)
  WHERE processed = false;

-- ── 2. Enable RLS on webhook_events ───────────────────────────

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service-role (admin client) can write. Authenticated users cannot read
-- raw webhook payloads (they may contain PII and payment data).
-- Admins access this via the Supabase dashboard with the service key.
-- No RLS policies needed — service-role bypasses RLS.

-- ── 3. Add 'disputed' to payments.status ─────────────────────

-- Postgres does not support adding a value to an inline CHECK constraint directly.
-- We must drop and recreate the constraint.

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'abandoned', 'disputed'));

COMMENT ON COLUMN public.payments.status IS
  'Lifecycle state: pending → paid | failed | abandoned. paid → refunded | disputed.';

-- ── 4. Add 'disputed' to invitations.payment_status ──────────

ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_payment_status_check;

ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_payment_status_check
  CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'failed', 'disputed'));
