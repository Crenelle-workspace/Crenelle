-- ============================================================
-- Crenelle — Atomic Check-in Processing RPC
-- Migration: 042_process_check_in_rpc.sql
-- ============================================================
--
-- Collapses the scan hot path — previously 5 sequential round-trips
-- from app/api/scan/route.ts — into a single database transaction:
--   1. Validate the scanner link (exists + is_active)
--   2. Check the event status (must be 'live')
--   3. Resolve the invitation (by qr_token, or by pre-verified id
--      for ephemeral manual-search handles)
--   4. Guard: same-event, not cancelled, not already checked in
--   5. checkOnly short-circuit (returns guest data, writes nothing)
--   6. UPDATE invitations -> checked_in  (fires the three invitation
--      triggers, which preserve every existing error contract:
--      invalid_status_transition, invitation_already_checked_in,
--      tier_capacity_exceeded, tier_soft_deleted)
--   7. Insert entry_logs (non-blocking, mirrors the route's behaviour)
--
-- Called from the scan handler via supabase.rpc('process_check_in', {...}).
-- Ephemeral-token verification and rate limiting stay in the route.
--
-- Returns JSONB with an `outcome` field the route maps 1:1 onto the
-- exact same HTTP responses it returns today. No behaviour change.
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_check_in(
  p_scanner_token   text,
  p_qr_token        text,           -- qr_token for camera scans; NULL when p_invitation_id is supplied
  p_invitation_id   uuid,           -- pre-verified id for ephemeral manual-search; NULL for camera scans
  p_entry_type      text,           -- 'qr_camera' | 'manual_search'
  p_check_only      boolean         -- true => validate + return guest data, write nothing
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scanner    record;
  v_event      record;
  v_inv        record;
  v_attendee   jsonb;
  v_tier       jsonb;
BEGIN
  -- ── 1. Validate the scanner link ───────────────────────────
  SELECT id, event_id, label, is_active
    INTO v_scanner
    FROM public.scanner_links
   WHERE token = p_scanner_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'scanner_invalid');
  END IF;

  IF NOT v_scanner.is_active THEN
    RETURN jsonb_build_object('outcome', 'scanner_inactive');
  END IF;

  -- ── 2. Check event status — scanning only when 'live' ──────
  SELECT status
    INTO v_event
    FROM public.events
   WHERE id = v_scanner.event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'event_not_found');
  END IF;

  IF v_event.status = 'ended' THEN
    RETURN jsonb_build_object('outcome', 'event_ended');
  END IF;

  IF v_event.status IN ('draft', 'published') THEN
    RETURN jsonb_build_object('outcome', 'event_not_open');
  END IF;

  -- ── 3. Resolve the invitation ──────────────────────────────
  -- Lock the row so concurrent scanners serialise on the same guest.
  IF p_invitation_id IS NOT NULL THEN
    SELECT * INTO v_inv
      FROM public.invitations
     WHERE id = p_invitation_id
     FOR UPDATE;
  ELSE
    SELECT * INTO v_inv
      FROM public.invitations
     WHERE qr_token = p_qr_token
     FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'invitation_not_found');
  END IF;

  -- ── 4. Same-event guard ────────────────────────────────────
  IF v_inv.event_id IS DISTINCT FROM v_scanner.event_id THEN
    RETURN jsonb_build_object('outcome', 'wrong_event');
  END IF;

  -- ── 5. Cancelled guard ─────────────────────────────────────
  IF v_inv.status = 'cancelled' THEN
    RETURN jsonb_build_object('outcome', 'cancelled');
  END IF;
  -- Build the attendee + tier payloads the route returns to the client.
  SELECT jsonb_build_object('id', a.id, 'name', a.name, 'email', a.email, 'phone', a.phone)
    INTO v_attendee
    FROM public.attendees a
   WHERE a.id = v_inv.attendee_id;

  SELECT jsonb_build_object('id', t.id, 'name', t.name)
    INTO v_tier
    FROM public.ticket_tiers t
   WHERE t.id = v_inv.ticket_tier_id;

  -- ── 6. Already-checked-in guard ────────────────────────────
  IF v_inv.checked_in_at IS NOT NULL OR v_inv.status = 'checked_in' THEN
    RETURN jsonb_build_object(
      'outcome',    'already_checked_in',
      'enteredAt',  v_inv.checked_in_at,
      'guest',      v_attendee,
      'partySize',  v_inv.party_size,
      'seatInfo',   v_inv.seat_info
    );
  END IF;

  -- ── 7. checkOnly short-circuit — validate, write nothing ───
  IF p_check_only THEN
    RETURN jsonb_build_object(
      'outcome',    'check_only',
      'guest',      v_attendee,
      'partySize',  v_inv.party_size,
      'seatInfo',   v_inv.seat_info
    );
  END IF;

  -- ── 8. Record the check-in ─────────────────────────────────
  -- This UPDATE fires the three BEFORE triggers (status transition,
  -- single check-in, tier capacity). Any rule violation raises and
  -- bubbles to the EXCEPTION block below, preserving the exact error
  -- strings the route already maps onto HTTP status codes.
  UPDATE public.invitations
     SET status         = 'checked_in',
         checked_in_at   = now(),
         checked_in_by   = NULL   -- token gates are not authenticated auth.users
   WHERE id = v_inv.id;

  -- ── 9. Entry log (non-blocking, mirrors the route) ─────────
  BEGIN
    INSERT INTO public.entry_logs (invitation_id, scanner_link_id, entry_type)
    VALUES (v_inv.id, v_scanner.id, p_entry_type);
  EXCEPTION WHEN OTHERS THEN
    -- Analytics only — never fail a successful check-in on log insert.
    NULL;
  END;

  RETURN jsonb_build_object(
    'outcome',      'checked_in',
    'attendee',     v_attendee,
    'guest',        v_attendee,
    'partySize',    v_inv.party_size,
    'checkedInAt',  now(),
    'tier',         v_tier
  );

EXCEPTION
  -- Trigger-raised business-rule violations (invalid_status_transition,
  -- invitation_already_checked_in, tier_capacity_exceeded, tier_soft_deleted,
  -- scanner_write_restricted, …) surface here. Return SQLERRM verbatim so the
  -- route string-matches it exactly as it does today with updateError.message.
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'outcome',  'error',
      'sqlstate', SQLSTATE,
      'message',  SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.process_check_in(text, text, uuid, text, boolean) IS
  'Atomic scan check-in: validates the scanner link + event status, resolves and '
  'locks the invitation, applies same-event / cancelled / already-checked-in guards, '
  'then performs the triggered status UPDATE and a non-blocking entry_logs insert. '
  'Returns jsonb keyed by `outcome`; trigger violations return outcome=error with '
  'SQLERRM as `message`. Collapses the former 5-round-trip scan path into one call.';

REVOKE ALL ON FUNCTION public.process_check_in(text, text, uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_check_in(text, text, uuid, text, boolean) TO service_role;
