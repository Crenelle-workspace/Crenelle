import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import type { CouponValidationResult } from '@/lib/types'

export async function POST(request: NextRequest) {
  let body: {
    code?: string
    event_id?: string
    tier_id?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { valid: false, reason: 'Invalid JSON request body' } satisfies CouponValidationResult,
      { status: 400 }
    )
  }

  const { code, event_id, tier_id } = body

  if (!code || !event_id || !tier_id) {
    return NextResponse.json(
      { valid: false, reason: 'code, event_id, and tier_id are required' } satisfies CouponValidationResult,
      { status: 400 }
    )
  }

  if (code.length > 64) {
    return NextResponse.json(
      { valid: false, reason: 'Invalid coupon code' } satisfies CouponValidationResult,
      { status: 400 }
    )
  }

  // Rate limit by IP to prevent coupon brute-forcing (20 attempts per 10 minutes)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const rateLimit = await checkRateLimitAsync({
    key: `coupon_val:${ip}`,
    limit: 20,
    windowMs: 10 * 60 * 1000,
  })

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { valid: false, reason: 'Too many coupon validation attempts. Please wait before trying again.' } satisfies CouponValidationResult,
      { status: 429 }
    )
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('validate_and_apply_coupon', {
    p_code: code.trim(),
    p_event_id: event_id,
    p_tier_id: tier_id,
  })

  if (error) {
    return NextResponse.json(
      { valid: false, reason: error.message || 'Validation failed' } satisfies CouponValidationResult,
      { status: 500 }
    )
  }

  return NextResponse.json(data as CouponValidationResult)
}
