-- Migration 044: Update email_theme check constraint to include horizontal_pass
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_email_theme_check;

ALTER TABLE events
ADD CONSTRAINT events_email_theme_check
CHECK (email_theme IN ('classic', 'boarding_pass', 'minimal_mono', 'luxe_dark', 'bold_poster', 'horizontal_pass'));
