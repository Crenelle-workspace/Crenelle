-- Migration 038: Add entry_type audit tracking to entry_logs
-- ==============================================================
--
-- Adds entry_type column to public.entry_logs to distinguish between
-- camera QR scans ('qr_camera') and usher manual search overrides ('manual_search').
-- ==============================================================

BEGIN;

ALTER TABLE public.entry_logs
  ADD COLUMN IF NOT EXISTS entry_type text NOT NULL DEFAULT 'qr_camera'
  CHECK (entry_type IN ('qr_camera', 'manual_search'));

COMMIT;
