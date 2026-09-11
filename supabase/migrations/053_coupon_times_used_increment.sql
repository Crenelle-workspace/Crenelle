-- ============================================================
-- Crenelle — Increment coupon usage atomically on charge.success
-- Migration: 053_coupon_times_used_increment.sql
-- ============================================================
--
-- Replaces process_charge_success to increment coupon_codes.times_used
-- when a payment that used a coupon is successfully processed.
--
-- Preserves all error-handling hardening from migration 040.
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

  -- ── 4b. Increment coupon usage if a coupon was used ────────
  -- The AND guard makes this atomic: even if two concurrent payments both
  -- passed the validate_and_apply_coupon check at times_used = max_uses - 1,
  -- only the first UPDATE will match and the second will be a no-op.
  -- The payment itself is NOT rolled back (it already cleared Paystack);
  -- ops can identify the rare over-use via the payments.coupon_id join.
  IF v_payment.coupon_id IS NOT NULL THEN
    UPDATE public.coupon_codes
    SET
      times_used = times_used + 1,
      updated_at = now()
    WHERE id = v_payment.coupon_id
      AND (max_uses IS NULL OR times_used < max_uses);
  END IF;

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
  -- Raised by the capacity/status triggers (migrations 018/024). Return
  -- terminal outcome so webhook acknowledges (HTTP 200) and alerts ops.
  WHEN raise_exception THEN
    RETURN jsonb_build_object(
      'outcome',  'business_error',
      'sqlstate', SQLSTATE,
      'message',  SQLERRM
    );

  -- Transient errors (deadlocks, etc.) re-raise to trigger webhook 500 retry.
END;
$$;

COMMENT ON FUNCTION public.process_charge_success IS
  'Atomically processes a Paystack charge.success event: marks payment paid, increments coupon times_used if applicable, accepts attendee, and upserts invitation.';

REVOKE ALL ON FUNCTION public.process_charge_success FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_charge_success TO service_role;

-- ── Atomic increment for free registrations (bypasses Paystack webhook) ──
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupon_codes
  SET times_used = times_used + 1,
      updated_at = now()
  WHERE id = p_coupon_id;
END;
$$;

COMMENT ON FUNCTION public.increment_coupon_usage IS
  'Atomically increments coupon_codes.times_used. Used for 100% discount registrations that bypass Paystack.';

REVOKE ALL ON FUNCTION public.increment_coupon_usage FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage TO service_role;

