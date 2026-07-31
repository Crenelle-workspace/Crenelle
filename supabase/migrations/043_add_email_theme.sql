-- Migration 043: Add email_theme column to events table
ALTER TABLE events
ADD COLUMN email_theme TEXT NOT NULL DEFAULT 'classic';

ALTER TABLE events
ADD CONSTRAINT events_email_theme_check
CHECK (email_theme IN ('classic', 'boarding_pass', 'minimal_mono', 'luxe_dark', 'bold_poster', 'horizontal_pass'));
