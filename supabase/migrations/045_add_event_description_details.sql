-- Migration 045: Add Rich Description & Event Details (Agenda, Speakers, FAQs, Location URL)

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS agenda JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS speakers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS faqs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS location_url TEXT;

COMMENT ON COLUMN public.events.agenda IS 'Structured array of agenda items [{ id, time, title, description, speaker }]';
COMMENT ON COLUMN public.events.speakers IS 'Structured array of speaker profiles [{ id, name, role, avatar_url, bio, company }]';
COMMENT ON COLUMN public.events.faqs IS 'Structured array of FAQ Q&As [{ id, question, answer }]';
COMMENT ON COLUMN public.events.location_url IS 'Map link or embedded map URL for event location';
