-- ============================================================
-- Crenelle — Coupon Codes & Tier Restrictions
-- Migration: 052_coupon_codes.sql
-- ============================================================

-- 1. Create coupon_codes table
CREATE TABLE IF NOT EXISTS public.coupon_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  code            text NOT NULL,
  discount_type   text NOT NULL CHECK (discount_type IN ('percent', 'flat')),
  discount_value  integer NOT NULL CHECK (discount_value > 0), -- basis points for percent (e.g. 2000 = 20%, 10000 = 100%); kobo for flat
  max_uses        integer DEFAULT NULL CHECK (max_uses IS NULL OR max_uses > 0),
  times_used      integer NOT NULL DEFAULT 0 CHECK (times_used >= 0),
  valid_from      timestamptz DEFAULT NULL,
  valid_until     timestamptz DEFAULT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz DEFAULT NULL
);

-- Case-insensitive unique code per event (active/non-deleted only)
CREATE UNIQUE INDEX IF NOT EXISTS coupon_codes_event_code_unique_idx
  ON public.coupon_codes (event_id, UPPER(code))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS coupon_codes_event_id_idx
  ON public.coupon_codes (event_id)
  WHERE deleted_at IS NULL;

-- 2. Create coupon_code_tier_restrictions join table
CREATE TABLE IF NOT EXISTS public.coupon_code_tier_restrictions (
  coupon_id       uuid NOT NULL REFERENCES public.coupon_codes(id) ON DELETE CASCADE,
  tier_id         uuid NOT NULL REFERENCES public.ticket_tiers(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (coupon_id, tier_id)
);

CREATE INDEX IF NOT EXISTS coupon_tier_restrictions_tier_id_idx
  ON public.coupon_code_tier_restrictions (tier_id);

-- 3. Extend payments and attendees tables
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupon_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_kobo integer DEFAULT 0;

ALTER TABLE public.attendees
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupon_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_kobo integer DEFAULT 0;

-- 4. Enable Row Level Security
ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_code_tier_restrictions ENABLE ROW LEVEL SECURITY;

-- Organisers can manage coupon codes for their events
CREATE POLICY "Organisers can view coupon codes"
  ON public.coupon_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = coupon_codes.event_id
        AND e.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organisers can insert coupon codes"
  ON public.coupon_codes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = coupon_codes.event_id
        AND e.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organisers can update coupon codes"
  ON public.coupon_codes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = coupon_codes.event_id
        AND e.organizer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = coupon_codes.event_id
        AND e.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organisers can delete coupon codes"
  ON public.coupon_codes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = coupon_codes.event_id
        AND e.organizer_id = auth.uid()
    )
  );

-- Co-organisers can view coupon codes
CREATE POLICY "Co-organisers can view coupon codes"
  ON public.coupon_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_members em
      WHERE em.event_id = coupon_codes.event_id
        AND em.member_id = auth.uid()
    )
  );

-- Policies for tier restrictions
CREATE POLICY "Organisers can view coupon tier restrictions"
  ON public.coupon_code_tier_restrictions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coupon_codes c
      JOIN public.events e ON e.id = c.event_id
      WHERE c.id = coupon_code_tier_restrictions.coupon_id
        AND e.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organisers can insert coupon tier restrictions"
  ON public.coupon_code_tier_restrictions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coupon_codes c
      JOIN public.events e ON e.id = c.event_id
      WHERE c.id = coupon_code_tier_restrictions.coupon_id
        AND e.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organisers can delete coupon tier restrictions"
  ON public.coupon_code_tier_restrictions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.coupon_codes c
      JOIN public.events e ON e.id = c.event_id
      WHERE c.id = coupon_code_tier_restrictions.coupon_id
        AND e.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Co-organisers can view coupon tier restrictions"
  ON public.coupon_code_tier_restrictions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coupon_codes c
      JOIN public.event_members em ON em.event_id = c.event_id
      WHERE c.id = coupon_code_tier_restrictions.coupon_id
        AND em.member_id = auth.uid()
    )
  );

-- 5. RPC function to safely validate a coupon code and calculate discount
CREATE OR REPLACE FUNCTION public.validate_and_apply_coupon(
  p_code     text,
  p_event_id uuid,
  p_tier_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_code  text;
  v_coupon           record;
  v_tier_price_kobo  integer;
  v_discount_kobo    integer;
  v_final_price_kobo integer;
BEGIN
  v_normalized_code := UPPER(TRIM(p_code));

  IF v_normalized_code = '' OR v_normalized_code IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Coupon code is required');
  END IF;

  -- 1. Find coupon by event and code
  SELECT *
  INTO v_coupon
  FROM public.coupon_codes
  WHERE event_id = p_event_id
    AND UPPER(code) = v_normalized_code
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Coupon code not found');
  END IF;

  -- 2. Check active flag
  IF NOT v_coupon.is_active THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'This coupon is currently inactive');
  END IF;

  -- 3. Check start time
  IF v_coupon.valid_from IS NOT NULL AND now() < v_coupon.valid_from THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'This coupon is not yet active');
  END IF;

  -- 4. Check expiration
  IF v_coupon.valid_until IS NOT NULL AND now() > v_coupon.valid_until THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'This coupon has expired');
  END IF;

  -- 5. Check usage limit
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.times_used >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'This coupon has reached its maximum usage limit');
  END IF;

  -- 6. Check tier restriction if any exist for this coupon
  IF EXISTS (SELECT 1 FROM public.coupon_code_tier_restrictions WHERE coupon_id = v_coupon.id) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.coupon_code_tier_restrictions
      WHERE coupon_id = v_coupon.id AND tier_id = p_tier_id
    ) THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'This coupon is not applicable to the selected ticket tier');
    END IF;
  END IF;

  -- 7. Validate tier price
  SELECT price
  INTO v_tier_price_kobo
  FROM public.ticket_tiers
  WHERE id = p_tier_id
    AND event_id = p_event_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Invalid ticket tier');
  END IF;

  IF v_tier_price_kobo = 0 THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Coupons cannot be applied to free tickets');
  END IF;

  -- 8. Calculate discount
  IF v_coupon.discount_type = 'percent' THEN
    -- discount_value is in basis points (e.g. 2000 = 20%, 10000 = 100%)
    v_discount_kobo := ROUND((v_tier_price_kobo * v_coupon.discount_value) / 10000.0);
  ELSIF v_coupon.discount_type = 'flat' THEN
    -- discount_value is in kobo
    v_discount_kobo := v_coupon.discount_value;
  ELSE
    RETURN jsonb_build_object('valid', false, 'reason', 'Unknown discount type');
  END IF;

  -- Clamp discount to ticket price
  IF v_discount_kobo > v_tier_price_kobo THEN
    v_discount_kobo := v_tier_price_kobo;
  END IF;
  IF v_discount_kobo < 0 THEN
    v_discount_kobo := 0;
  END IF;

  v_final_price_kobo := v_tier_price_kobo - v_discount_kobo;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_kobo', v_discount_kobo,
    'final_price_kobo', v_final_price_kobo,
    'original_price_kobo', v_tier_price_kobo
  );
END;
$$;

COMMENT ON FUNCTION public.validate_and_apply_coupon IS
  'Safely validates coupon codes against dates, usage limits, and tier restrictions without incrementing usage. Returns discount amount in kobo and final ticket price in kobo.';

-- Grant execute to service_role only.
-- The attendee portal validates coupons through /api/coupons/validate (which uses the
-- admin/service_role client and enforces rate limiting). Granting to `authenticated`
-- would allow any logged-in user to call the RPC directly via PostgREST, bypassing the
-- rate limiter and making coupon codes trivially enumerable.
REVOKE ALL ON FUNCTION public.validate_and_apply_coupon FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_and_apply_coupon TO service_role;
