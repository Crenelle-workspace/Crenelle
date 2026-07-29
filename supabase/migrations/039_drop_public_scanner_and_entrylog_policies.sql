-- ============================================================
-- Crenelle — Drop dangerous public RLS policies
-- Migration: 039_drop_public_scanner_and_entrylog_policies.sql
-- ============================================================
--
-- Closes two platform-wide holes left over from 001_initial_schema.sql
-- that were never superseded by the later RLS work (015/016/026):
--
--   1. "Public can read active scanner links"
--        USING (is_active = true)
--      → the anon key (public in the browser bundle) could read the
--        `token` column of EVERY active scanner link for EVERY event.
--        Those tokens are the sole credential the scan API trusts, so
--        this defeated the entire scanner-link security model and fed
--        guest-list enumeration via /api/scan/search.
--
--   2. "Public can insert entry logs"
--        WITH CHECK (true)
--      → any anon caller could insert arbitrary rows into entry_logs.
--        Because entry_logs.invitation_id is UNIQUE, a forged row also
--        permanently blocks the real check-in log for that invitation
--        and inflates the admin attendance counters.
--
-- Neither policy is needed by the application: every server-side scan
-- path (validate token, read invitation, write entry_log) uses the
-- service-role admin client, which bypasses RLS entirely. Organiser,
-- co-organiser and scanner-manager access is covered by the policies
-- added in 015/016/026.
--
-- Safe to run repeatedly (DROP ... IF EXISTS).
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS "Public can read active scanner links" ON public.scanner_links;

DROP POLICY IF EXISTS "Public can insert entry logs" ON public.entry_logs;

COMMIT;
