-- =============================================================================
-- Migration 056: Security Hardening (RLS Policies, Storage Bucket, Coupon Guard)
-- =============================================================================

-- 1. Remove unnecessary anonymous INSERT policy on public.attendees.
-- Public registrations are handled server-side via service_role in
-- submitRegistration() and /api/payments/initialize. Leaving an anon INSERT
-- policy open allows direct PostgREST inserts with registration_status='accepted'.
DROP POLICY IF EXISTS "Public can self-register as attendee" ON public.attendees;

-- 2. Restrict email_logs and email_events INSERT policies to service_role only.
-- Previously these policies omitted `TO service_role`, allowing anon and
-- authenticated callers to insert forged delivery logs (which can also suppress
-- legitimate ticket emails via deduplication checks).
DROP POLICY IF EXISTS "Service can insert email logs" ON public.email_logs;
CREATE POLICY "Service can insert email logs"
  ON public.email_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert email events" ON public.email_events;
CREATE POLICY "Service role can insert email events"
  ON public.email_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 3. Harden the public `banners` storage bucket:
--    a) Enforce image MIME allowlist and 5 MB file size limit on the bucket.
--    b) Scope UPDATE and DELETE on storage.objects to the uploading user (owner = auth.uid()).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/heic',
      'image/avif'
    ],
    file_size_limit = 5242880
WHERE id = 'banners';

DROP POLICY IF EXISTS "Organizer Manage Banners" ON storage.objects;

DROP POLICY IF EXISTS "Organizers can upload banners" ON storage.objects;
CREATE POLICY "Organizers can upload banners"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'banners' AND owner = auth.uid());

DROP POLICY IF EXISTS "Organizers can update own banners" ON storage.objects;
CREATE POLICY "Organizers can update own banners"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'banners' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'banners' AND owner = auth.uid());

DROP POLICY IF EXISTS "Organizers can delete own banners" ON storage.objects;
CREATE POLICY "Organizers can delete own banners"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'banners' AND owner = auth.uid());

-- 4. Guard increment_coupon_usage against exceeding max_uses under concurrency.
--    Returns true only if a slot was actually claimed, so callers can refuse the
--    registration when a concurrent request exhausted the coupon first.
--    (Return type changes void -> boolean, so the function must be dropped first.)
DROP FUNCTION IF EXISTS public.increment_coupon_usage(uuid);

CREATE FUNCTION public.increment_coupon_usage(p_coupon_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupon_codes
  SET times_used = times_used + 1,
      updated_at = now()
  WHERE id = p_coupon_id
    AND is_active = true
    AND (max_uses IS NULL OR times_used < max_uses);

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.increment_coupon_usage IS
  'Atomically claims one coupon use if the coupon is active and under max_uses. Returns true if claimed.';

REVOKE ALL ON FUNCTION public.increment_coupon_usage FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage TO service_role;

