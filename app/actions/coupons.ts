'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CouponCode, CouponDiscountType } from '@/lib/types'

export interface CreateCouponInput {
  eventId: string
  code: string
  discountType: CouponDiscountType
  discountValue: number // basis points for percent (e.g. 2000 = 20%); kobo for flat
  maxUses?: number | null
  validFrom?: string | null
  validUntil?: string | null
  tierIds?: string[]
}

export interface UpdateCouponInput {
  couponId: string
  eventId: string
  code: string
  discountType: CouponDiscountType
  discountValue: number
  maxUses?: number | null
  validFrom?: string | null
  validUntil?: string | null
  tierIds?: string[]
}

export async function createCoupon(input: CreateCouponInput): Promise<{ success?: boolean; error?: string; coupon?: CouponCode }> {
  const supabase = await createClient()

  const normalizedCode = input.code.trim().toUpperCase()
  if (!normalizedCode) {
    return { error: 'Coupon code cannot be empty' }
  }

  if (input.discountValue <= 0) {
    return { error: 'Discount value must be greater than zero' }
  }

  if (input.discountType === 'percent' && input.discountValue > 10000) {
    return { error: 'Percentage discount cannot exceed 100%' }
  }

  if (input.validFrom && input.validUntil && new Date(input.validFrom) > new Date(input.validUntil)) {
    return { error: 'Start date cannot be after end date' }
  }

  // 1. Insert the coupon code record
  const { data: coupon, error } = await supabase
    .from('coupon_codes')
    .insert({
      event_id: input.eventId,
      code: normalizedCode,
      discount_type: input.discountType,
      discount_value: input.discountValue,
      max_uses: input.maxUses ?? null,
      valid_from: input.validFrom ?? null,
      valid_until: input.validUntil ?? null,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505' || error.message.includes('unique')) {
      return { error: `Coupon code "${normalizedCode}" already exists for this event` }
    }
    return { error: error.message }
  }

  // 2. Insert tier restrictions if any were selected
  if (input.tierIds && input.tierIds.length > 0) {
    const restrictions = input.tierIds.map((tierId) => ({
      coupon_id: coupon.id,
      tier_id: tierId,
    }))

    const { error: tierError } = await supabase
      .from('coupon_code_tier_restrictions')
      .insert(restrictions)

    if (tierError) {
      // Roll back: soft-delete the coupon so it doesn't float restriction-less
      // (applying to all tiers is the opposite of the organiser's intent).
      await supabase
        .from('coupon_codes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', coupon.id)
      return { error: 'Failed to save tier restrictions. The coupon was not created — please try again.' }
    }
  }

  revalidatePath(`/events/${input.eventId}/tickets`)
  return { success: true, coupon: { ...coupon, tier_ids: input.tierIds ?? [] } }
}

export async function updateCoupon(input: UpdateCouponInput): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  const normalizedCode = input.code.trim().toUpperCase()
  if (!normalizedCode) {
    return { error: 'Coupon code cannot be empty' }
  }

  if (input.discountValue <= 0) {
    return { error: 'Discount value must be greater than zero' }
  }

  if (input.discountType === 'percent' && input.discountValue > 10000) {
    return { error: 'Percentage discount cannot exceed 100%' }
  }

  if (input.validFrom && input.validUntil && new Date(input.validFrom) > new Date(input.validUntil)) {
    return { error: 'Start date cannot be after end date' }
  }

  // 1. Update coupon code — also scope to deleted_at IS NULL to prevent
  // resurrecting a soft-deleted coupon via a replayed or racing request.
  const { error } = await supabase
    .from('coupon_codes')
    .update({
      code: normalizedCode,
      discount_type: input.discountType,
      discount_value: input.discountValue,
      max_uses: input.maxUses ?? null,
      valid_from: input.validFrom ?? null,
      valid_until: input.validUntil ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.couponId)
    .eq('event_id', input.eventId)
    .is('deleted_at', null)

  if (error) {
    if (error.code === '23505' || error.message.includes('unique')) {
      return { error: `Coupon code "${normalizedCode}" already exists for this event` }
    }
    return { error: error.message }
  }

  // 2. Sync tier restrictions: remove previous and insert new
  await supabase
    .from('coupon_code_tier_restrictions')
    .delete()
    .eq('coupon_id', input.couponId)

  if (input.tierIds && input.tierIds.length > 0) {
    const restrictions = input.tierIds.map((tierId) => ({
      coupon_id: input.couponId,
      tier_id: tierId,
    }))

    const { error: tierError } = await supabase
      .from('coupon_code_tier_restrictions')
      .insert(restrictions)

    if (tierError) {
      return { error: `Coupon updated, but failed to save tier restrictions: ${tierError.message}` }
    }
  }

  revalidatePath(`/events/${input.eventId}/tickets`)
  return { success: true }
}

export async function toggleCouponActive(
  couponId: string,
  eventId: string,
  isActive: boolean
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('coupon_codes')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', couponId)
    .eq('event_id', eventId)

  if (error) return { error: error.message }

  revalidatePath(`/events/${eventId}/tickets`)
  return { success: true }
}

export async function deleteCoupon(
  couponId: string,
  eventId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('coupon_codes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', couponId)
    .eq('event_id', eventId)

  if (error) return { error: error.message }

  revalidatePath(`/events/${eventId}/tickets`)
  return { success: true }
}

export async function fetchCouponsForEvent(
  eventId: string
): Promise<{ data?: CouponCode[]; error?: string }> {
  const supabase = await createClient()

  const { data: coupons, error } = await supabase
    .from('coupon_codes')
    .select('*')
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  if (!coupons || coupons.length === 0) return { data: [] }

  const couponIds = coupons.map((c) => c.id)

  const { data: restrictions, error: restError } = await supabase
    .from('coupon_code_tier_restrictions')
    .select('coupon_id, tier_id')
    .in('coupon_id', couponIds)

  if (restError) return { error: restError.message }

  const restrictionMap: Record<string, string[]> = {}
  for (const r of restrictions ?? []) {
    if (!restrictionMap[r.coupon_id]) {
      restrictionMap[r.coupon_id] = []
    }
    restrictionMap[r.coupon_id].push(r.tier_id)
  }

  const mapped: CouponCode[] = coupons.map((c) => ({
    ...c,
    tier_ids: restrictionMap[c.id] ?? [],
  }))

  return { data: mapped }
}
