-- 047_terms_acceptances.sql
-- Append-only evidence log for user terms and privacy policy acceptances.

CREATE TABLE IF NOT EXISTS public.terms_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document TEXT NOT NULL DEFAULT 'terms_and_privacy',
  version TEXT NOT NULL DEFAULT '1.0',
  ip_address TEXT,
  user_agent TEXT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT terms_acceptances_user_doc_version_key UNIQUE (user_id, document, version)
);

-- Enable Row Level Security
ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own acceptance evidence records
CREATE POLICY "Users can view their own terms acceptances"
  ON public.terms_acceptances
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Deliberately no INSERT, UPDATE, or DELETE policies created for anon/authenticated.
-- Writes are performed strictly via service-role client to prevent forging records.
