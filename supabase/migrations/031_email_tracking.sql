-- Migration: 031_email_tracking.sql
-- Adds open/click/delivery tracking to email_logs and introduces a granular
-- email_events table populated by the /api/webhooks/resend endpoint.

-- ─── 1. Extend email_logs ────────────────────────────────────────────────────

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS resend_email_id  text,
  ADD COLUMN IF NOT EXISTS opened_count     int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicked_count    int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_opened_at  timestamptz,
  ADD COLUMN IF NOT EXISTS first_clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at     timestamptz,
  ADD COLUMN IF NOT EXISTS bounced_at       timestamptz,
  ADD COLUMN IF NOT EXISTS complained_at    timestamptz;

-- Allow fast lookup of a log row by its Resend message ID when a webhook arrives.
CREATE UNIQUE INDEX IF NOT EXISTS email_logs_resend_id_idx
  ON public.email_logs (resend_email_id)
  WHERE resend_email_id IS NOT NULL;

-- ─── 2. Granular email_events table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.email_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id    uuid        REFERENCES public.email_logs(id) ON DELETE CASCADE,
  resend_email_id text        NOT NULL,
  event_type      text        NOT NULL,   -- opened | clicked | delivered | bounced | complained
  click_url       text,                   -- populated for 'clicked' events
  raw_payload     jsonb,                  -- full Resend payload for debugging
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_events_log_id_idx
  ON public.email_events (email_log_id);

CREATE INDEX IF NOT EXISTS email_events_resend_id_idx
  ON public.email_events (resend_email_id);

-- ─── 3. RLS ─────────────────────────────────────────────────────────────────

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Organisers can read events for their own events
CREATE POLICY "Organisers can view email events for their events"
  ON public.email_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.email_logs el
      JOIN public.events    ev ON ev.id = el.event_id
      WHERE el.id = email_events.email_log_id
        AND ev.organizer_id = auth.uid()
    )
  );

-- Co-hosts with at least viewer role can also read
CREATE POLICY "Co-hosts can view email events for their events"
  ON public.email_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.email_logs  el
      JOIN public.event_members em ON em.event_id = el.event_id
      WHERE el.id = email_events.email_log_id
        AND em.member_id = auth.uid()
    )
  );

-- Only service-role (webhook handler uses admin client) can insert
CREATE POLICY "Service role can insert email events"
  ON public.email_events FOR INSERT
  WITH CHECK (true);
