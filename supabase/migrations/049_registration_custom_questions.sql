-- 049_registration_custom_questions.sql
-- Adds custom question definitions to events and a per-registrant answers table.
--
-- Question definitions are stored as a JSONB array on the events table, following
-- the same pattern as `agenda`, `speakers`, and `faqs`.
--
-- Answer values are stored in a dedicated `registration_answers` table, keyed by
-- attendee_id, to keep the attendees table clean and allow independent querying.

-- ── 1. Question schema column on events ──────────────────────────────────────
--
-- Each element of the array follows this TypeScript shape:
--   { id: string, label: string, type: 'text'|'radio'|'checkbox',
--     required: boolean, options?: string[], sort_order: number }
--
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS registration_questions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ── 2. Per-registrant answers table ──────────────────────────────────────────
--
-- answers JSONB shape: { [question_id: string]: string | string[] }
--   text   → string
--   radio  → string (selected option)
--   checkbox → string[] (selected options, possibly empty)

CREATE TABLE IF NOT EXISTS public.registration_answers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id uuid        NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  event_id    uuid        NOT NULL REFERENCES public.events(id)    ON DELETE CASCADE,
  answers     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS registration_answers_attendee_id_key
  ON public.registration_answers (attendee_id);

CREATE INDEX IF NOT EXISTS registration_answers_event_id_idx
  ON public.registration_answers (event_id);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.registration_answers ENABLE ROW LEVEL SECURITY;

-- Organizers can read answers for events they own
CREATE POLICY "organizer_read_registration_answers"
  ON public.registration_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = registration_answers.event_id
        AND e.organizer_id = auth.uid()
    )
  );

-- Team members (viewer / co-organiser / scanner_manager) can also read answers
CREATE POLICY "team_member_read_registration_answers"
  ON public.registration_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_members em
      WHERE em.event_id = registration_answers.event_id
        AND em.member_id = auth.uid()
    )
  );

-- Answers are inserted by the server-side action using the service-role (admin)
-- client, so no anon/authenticated INSERT policy is required.
-- Granting explicit service-role bypass is the default Supabase behaviour.
