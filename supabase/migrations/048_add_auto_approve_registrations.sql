-- 048_add_auto_approve_registrations.sql
-- Add auto_approve_registrations flag to events table for open events

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS auto_approve_registrations boolean NOT NULL DEFAULT false;
