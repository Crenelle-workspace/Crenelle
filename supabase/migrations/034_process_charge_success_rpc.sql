-- ============================================================
-- Crenelle — Atomic charge.success Processing RPC
-- Migration: 034_process_charge_success_rpc.sql
-- ============================================================
--
-- Creates a Postgres function that atomically processes a confirmed
-- Paystack charge.success event in a single transaction:
--   1. Idempotency check (returns early if already paid)
--   2. Updates payments.status = 'paid'
--   3. Updates attendees.registration_status = 'accepted'
--   4. Inserts the invitation (or updates if already exists)
--
-- Called from the webhook handler via supabase.rpc('process_charge_success', {...})
-- Returns a JSONB result so the caller knows what happened and whether to send emails.
--
-- From the v2 Production Readiness Checklist:
--   ✓ "Order insert + revenue counter update happen inside a single database transaction"
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
  WHEN OTHERS THEN
    -- Surface the error to the caller with context
    RETURN jsonb_build_object(
      'outcome', 'error',
      'sqlstate', SQLSTATE,
      'message',  SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.process_charge_success IS
  'Atomically processes a Paystack charge.success event: marks payment paid, accepts attendee, and upserts invitation — all in one transaction. Called by the webhook handler via RPC.';

-- Grant execute to service role only
REVOKE ALL ON FUNCTION public.process_charge_success FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_charge_success TO service_role;
