-- ============================================================
-- Crenelle — Fix integer overflow in validate_and_apply_coupon
-- Migration: 055_fix_coupon_integer_overflow.sql
-- ============================================================
--
-- Bug: The intermediate multiplication in the percent-discount
-- branch used integer × integer arithmetic, which overflows
-- PostgreSQL's 32-bit integer ceiling (~2.14 billion) for any
-- realistic ticket price.
--
-- Example: ₦15,000 ticket (1,500,000 kobo) with a 10% coupon
-- (discount_value = 1,000):
--   1,500,000 × 1,000 = 1,500,000,000   -- fine
--   ₦21,475+ ticket × 10% coupon        -- overflow → "integer out of range"
--   ₦10,738+ ticket × 20% coupon        -- overflow
--   ₦4,295+  ticket × 50% coupon        -- overflow
--   ₦2,148+  ticket × 100% coupon       -- overflow
--
-- Fix: Cast both operands to bigint before multiplying so the
-- intermediate result uses 64-bit arithmetic (max ~9.2 quintillion).
-- The final ROUND() result is still safely within integer range
-- because the clamping at the end ensures it cannot exceed
-- v_tier_price_kobo (also an integer).
-- ============================================================

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
  --
  -- FIX: Cast operands to bigint before multiplying to prevent 32-bit
  -- integer overflow. Without this cast, PostgreSQL evaluates
  -- integer x integer -> integer, which overflows for any ticket
  -- above roughly N2,147 with a 100% coupon, or N21,474 with a 10% coupon.
  IF v_coupon.discount_type = 'percent' THEN
    -- discount_value is in basis points (e.g. 2000 = 20%, 10000 = 100%)
    v_discount_kobo := ROUND(
      (v_tier_price_kobo::bigint * v_coupon.discount_value::bigint) / 10000.0
    );
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
  'Safely validates coupon codes against dates, usage limits, and tier restrictions without incrementing usage. Returns discount amount in kobo and final ticket price in kobo. Fixed in 055: percent-discount intermediate multiplication now uses bigint to avoid 32-bit integer overflow on realistic ticket prices.';

-- Grants unchanged from 052: service_role only.
REVOKE ALL ON FUNCTION public.validate_and_apply_coupon FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_and_apply_coupon TO service_role;
