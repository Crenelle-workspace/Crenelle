-- ============================================================
-- Crenelle — Harden process_charge_success error handling
-- Migration: 040_process_charge_success_error_handling.sql
-- ============================================================
--
-- Fixes a webhook-retry defect in migration 034.
--
-- The previous version had a blanket `EXCEPTION WHEN OTHERS` that flattened
-- EVERY error into `outcome: 'error'`. The webhook maps that to HTTP 500,
-- which tells Paystack to retry. The problem:
--
--   * PERMANENT business-rule failures raised by the capacity/status triggers
--     (tier_capacity_exceeded, tier_soft_deleted, invalid/illegal_status_transition)
--     can NEVER succeed on retry — the customer has paid but there is no seat.
--     Retrying forever is wrong; this must terminate and alert an operator to refund.
--
--   * Genuinely TRANSIENT failures (deadlock, serialization_failure) SHOULD retry,
--     and should roll the whole transaction back so no partial state persists.
--
-- This version distinguishes the two:
--   - Known business-rule exceptions  -> caught, returned as outcome 'business_error'
--                                         (webhook returns 200, stops retries, alerts).
--   - Everything else                 -> RE-RAISED, so the transaction rolls back and
--                                         the webhook returns 500 for a legitimate retry.
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_charge_success(
  p_reference             text,
  p_paystack_transaction_id bigint,
  p_channel               text,
  p_paid_at               timestamptz,
  p_amount_kobo           integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment         record;
  v_existing_inv    record;
  v_new_inv_id      uuid;
  v_result          jsonb;
BEGIN
  -- ── 1. Look up the payment record ──────────────────────────
  SELECT *
  INTO v_payment
  FROM public.payments
  WHERE paystack_reference = p_reference
  FOR UPDATE; -- lock the row to prevent race conditions

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'not_found',
      'message', 'No payment record found for reference'
    );
  END IF;

  -- ── 2. Idempotency: bail early if already paid ─────────────
  IF v_payment.status = 'paid' THEN
    RETURN jsonb_build_object(
      'outcome', 'already_processed',
      'invitation_id', NULL,
      'attendee_id', v_payment.attendee_id,
      'event_id', v_payment.event_id
    );
  END IF;

  -- ── 3. Amount fraud check ──────────────────────────────────
  IF p_amount_kobo < v_payment.amount_kobo THEN
    UPDATE public.payments
    SET
      status              = 'failed',
      webhook_received_at = now()
    WHERE paystack_reference = p_reference;

    RETURN jsonb_build_object(
      'outcome', 'amount_mismatch',
      'expected', v_payment.amount_kobo,
      'received', p_amount_kobo
    );
  END IF;

  -- ── 4. Update payment → paid ───────────────────────────────
  UPDATE public.payments
  SET
    status                  = 'paid',
    paystack_transaction_id = p_paystack_transaction_id,
    paystack_channel        = p_channel,
    paid_at                 = COALESCE(p_paid_at, now()),
    webhook_received_at     = now()
  WHERE paystack_reference = p_reference;

  -- ── 5. Update attendee → accepted ─────────────────────────
  IF v_payment.attendee_id IS NOT NULL THEN
    UPDATE public.attendees
    SET registration_status = 'accepted'
    WHERE id = v_payment.attendee_id;
  END IF;

  -- ── 6. Upsert invitation ───────────────────────────────────
  -- Check if an invitation already exists (idempotency)
  SELECT id
  INTO v_existing_inv
  FROM public.invitations
  WHERE attendee_id = v_payment.attendee_id
    AND event_id    = v_payment.event_id
  LIMIT 1;

  IF v_existing_inv IS NULL THEN
    -- Insert new invitation
    INSERT INTO public.invitations (
      event_id,
      attendee_id,
      party_size,
      status,
      ticket_tier_id,
      payment_reference,
      payment_status,
      amount_paid_kobo,
      paid_at
    ) VALUES (
      v_payment.event_id,
      v_payment.attendee_id,
      1,
      'active',
      v_payment.ticket_tier_id,
      p_reference,
      'paid',
      p_amount_kobo,
      COALESCE(p_paid_at, now())
    )
    RETURNING id INTO v_new_inv_id;

    v_result := jsonb_build_object(
      'outcome',        'created',
      'invitation_id',  v_new_inv_id,
      'attendee_id',    v_payment.attendee_id,
      'event_id',       v_payment.event_id
    );
  ELSE
    -- Update existing invitation with payment confirmation
    UPDATE public.invitations
    SET
      status            = 'active',
      payment_reference = p_reference,
      payment_status    = 'paid',
      amount_paid_kobo  = p_amount_kobo,
      paid_at           = COALESCE(p_paid_at, now())
    WHERE id = v_existing_inv.id;

    v_result := jsonb_build_object(
      'outcome',        'updated',
      'invitation_id',  v_existing_inv.id,
      'attendee_id',    v_payment.attendee_id,
      'event_id',       v_payment.event_id
    );
  END IF;

  RETURN v_result;

EXCEPTION
  -- ── Known, PERMANENT business-rule failures ────────────────
  -- Raised by the capacity/status triggers (migrations 018/024). These can
  -- never succeed on retry: the customer paid but there is no seat / the tier
  -- is gone / the status transition is illegal. Return a terminal outcome so
  -- the webhook acknowledges (HTTP 200, stops Paystack retries) and alerts an
  -- operator to refund. The raise rolls back this transaction's writes, so no
  -- partial paid/accepted state is persisted for an un-seatable charge.
  WHEN raise_exception THEN
    RETURN jsonb_build_object(
      'outcome',  'business_error',
      'sqlstate', SQLSTATE,
      'message',  SQLERRM
    );

  -- ── Everything else: TRANSIENT / unexpected ────────────────
  -- Deadlocks, serialization failures, and any error we did not anticipate.
  -- Re-raise so the transaction rolls back cleanly and the webhook returns 500,
  -- letting Paystack retry a failure that may genuinely succeed next time.
  -- (No WHEN OTHERS swallow — the unhandled raise propagates to the caller.)
END;
$$;

COMMENT ON FUNCTION public.process_charge_success IS
  'Atomically processes a Paystack charge.success event: marks payment paid, accepts attendee, and upserts invitation — all in one transaction. Permanent business-rule failures (capacity/status triggers) return outcome ''business_error'' (terminal); transient/unexpected errors propagate so the webhook can retry. Called by the webhook handler via RPC.';

-- Grant execute to service role only (unchanged from 034)
REVOKE ALL ON FUNCTION public.process_charge_success FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_charge_success TO service_role;
