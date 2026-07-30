-- Migration 046: Fix viewer role permissions & harden scanner manager status writes

-- 1. Restrict payments SELECT policy to co-organisers (excluding viewers & scanner_managers)
DROP POLICY IF EXISTS "Members can read payments for co-hosted events" ON public.payments;

CREATE POLICY "Co-organisers can read payments for co-hosted events"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_members em
      WHERE em.event_id = payments.event_id
        AND em.member_id = auth.uid()
        AND em.role = 'co_organiser'
    )
  );

-- 2. Allow viewer role to select attendees, invitations, and ticket tiers
CREATE POLICY "Viewers can select attendees"
  ON public.attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_members em
      WHERE em.event_id = attendees.event_id
        AND em.member_id = auth.uid()
        AND em.role = 'viewer'
    )
  );

CREATE POLICY "Viewers can select invitations"
  ON public.invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_members em
      WHERE em.event_id = invitations.event_id
        AND em.member_id = auth.uid()
        AND em.role = 'viewer'
    )
  );

CREATE POLICY "Viewers can select ticket tiers"
  ON public.ticket_tiers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_members em
      WHERE em.event_id = ticket_tiers.event_id
        AND em.member_id = auth.uid()
        AND em.role = 'viewer'
    )
  );

-- 3. Harden enforce_scanner_write() so scanner_managers cannot cancel invitations
CREATE OR REPLACE FUNCTION public.enforce_scanner_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- Only restrict sessions that are scanner_managers for this event.
  -- Non-scanner roles (organiser, co-organiser, service_role) are not
  -- in event_members with role = 'scanner_manager', so this block is skipped.
  IF EXISTS (
    SELECT 1 FROM public.event_members em
    WHERE em.event_id = NEW.event_id
      AND em.member_id = auth.uid()
      AND em.role = 'scanner_manager'
  ) THEN
    IF NEW.attendee_id    IS DISTINCT FROM OLD.attendee_id    OR
       NEW.ticket_tier_id IS DISTINCT FROM OLD.ticket_tier_id OR
       NEW.party_size     IS DISTINCT FROM OLD.party_size     OR
       NEW.event_id       IS DISTINCT FROM OLD.event_id       OR
       NEW.qr_token       IS DISTINCT FROM OLD.qr_token       OR
       NEW.status         = 'cancelled'
    THEN
      RAISE EXCEPTION 'scanner_write_restricted'
        USING DETAIL = 'Scanner managers may only update check-in fields (checked_in_at, checked_in_by, seat_info, checked_in status) and cannot cancel invitations.',
              ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
