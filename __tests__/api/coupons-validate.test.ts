import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimitAsync: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { POST } from '@/app/api/coupons/validate/route'

const mockCreateAdminClient = createAdminClient as ReturnType<typeof vi.fn>
const mockCheckRateLimitAsync = checkRateLimitAsync as ReturnType<typeof vi.fn>

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/coupons/validate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimitAsync.mockResolvedValue({ allowed: true })
  })

  it('rejects missing parameters with 400', async () => {
    const req = makeRequest({ code: 'SAVE20' }) // missing event_id & tier_id
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.valid).toBe(false)
    expect(json.reason).toContain('required')
  })

  it('rejects rate-limited requests with 429', async () => {
    mockCheckRateLimitAsync.mockResolvedValue({ allowed: false })
    const req = makeRequest({
      code: 'SAVE20',
      event_id: 'evt-1',
      tier_id: 'tier-1',
    })
    const res = await POST(req)
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.valid).toBe(false)
    expect(json.reason).toContain('Too many coupon validation attempts')
  })

  it('calls validate_and_apply_coupon RPC and returns valid result', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        valid: true,
        coupon_id: 'c-123',
        code: 'SAVE20',
        discount_type: 'percent',
        discount_value: 2000,
        discount_kobo: 200000,
        final_price_kobo: 800000,
        original_price_kobo: 1000000,
      },
      error: null,
    })

    mockCreateAdminClient.mockReturnValue({
      rpc: mockRpc,
      from: vi.fn(),
    })

    const req = makeRequest({
      code: 'save20',
      event_id: 'evt-1',
      tier_id: 'tier-1',
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.valid).toBe(true)
    expect(json.discount_kobo).toBe(200000)
    expect(json.final_price_kobo).toBe(800000)

    expect(mockRpc).toHaveBeenCalledWith('validate_and_apply_coupon', {
      p_code: 'save20',
      p_event_id: 'evt-1',
      p_tier_id: 'tier-1',
    })
  })

  it('surfaces invalid coupon error from RPC', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        valid: false,
        reason: 'This coupon has expired',
      },
      error: null,
    })

    mockCreateAdminClient.mockReturnValue({
      rpc: mockRpc,
      from: vi.fn(),
    })

    const req = makeRequest({
      code: 'EXPIRED',
      event_id: 'evt-1',
      tier_id: 'tier-1',
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.valid).toBe(false)
    expect(json.reason).toBe('This coupon has expired')
  })
})
