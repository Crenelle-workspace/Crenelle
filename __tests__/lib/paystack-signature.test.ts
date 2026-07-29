/**
 * __tests__/lib/paystack-signature.test.ts
 *
 * Functional guard for Paystack webhook signature verification
 * (lib/paystack.ts → verifyPaystackSignature).
 *
 * Covers the timing-safe-comparison hardening (Fix 12): the comparison must
 * use crypto.timingSafeEqual, reject null/mismatched-length/wrong signatures,
 * and still accept a genuinely valid HMAC-SHA512.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import crypto from 'node:crypto'
import { verifyPaystackSignature } from '@/lib/paystack'

const SECRET = 'sk_test_webhook_secret_value'

function sign(body: string, secret = SECRET): string {
  return crypto.createHmac('sha512', secret).update(body).digest('hex')
}

describe('verifyPaystackSignature', () => {
  beforeEach(() => {
    process.env.PAYSTACK_WEBHOOK_SECRET = SECRET
    delete process.env.PAYSTACK_SECRET_KEY
  })

  it('accepts a valid HMAC-SHA512 signature over the raw body', () => {
    const body = JSON.stringify({ event: 'charge.success', data: { id: 1 } })
    expect(verifyPaystackSignature(body, sign(body))).toBe(true)
  })

  it('rejects a null signature', () => {
    const body = '{"event":"charge.success"}'
    expect(verifyPaystackSignature(body, null)).toBe(false)
  })

  it('rejects a signature computed with the wrong secret', () => {
    const body = '{"event":"charge.success"}'
    expect(verifyPaystackSignature(body, sign(body, 'wrong_secret'))).toBe(false)
  })

  it('rejects a tampered body', () => {
    const original = '{"amount":1000}'
    const sig = sign(original)
    expect(verifyPaystackSignature('{"amount":9999}', sig)).toBe(false)
  })

  it('rejects a signature of the wrong length without throwing (timingSafeEqual guard)', () => {
    const body = '{"event":"charge.success"}'
    // A short/garbage signature must return false, not throw — the length
    // guard protects timingSafeEqual, which throws on unequal-length buffers.
    expect(() => verifyPaystackSignature(body, 'abcd')).not.toThrow()
    expect(verifyPaystackSignature(body, 'abcd')).toBe(false)
  })

  it('falls back to PAYSTACK_SECRET_KEY when the dedicated webhook secret is unset', () => {
    delete process.env.PAYSTACK_WEBHOOK_SECRET
    process.env.PAYSTACK_SECRET_KEY = SECRET
    const body = '{"event":"charge.success"}'
    expect(verifyPaystackSignature(body, sign(body))).toBe(true)
  })
})
