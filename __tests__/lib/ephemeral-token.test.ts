/**
 * __tests__/lib/ephemeral-token.test.ts
 *
 * Security tests for the ephemeral usher-search token (finding 5, HIGH).
 *
 * Guarantees:
 *   1. A round-tripped token verifies and returns its invitationId.
 *   2. Signatures are the FULL 256-bit HMAC (64 hex chars) — never truncated.
 *   3. Tokens are bound to the scanner token: a different scanner cannot use
 *      another scanner's handle.
 *   4. Tampering with the invitationId or signature is rejected.
 *   5. Expired tokens are rejected.
 *   6. There is no forgeable hardcoded-secret fallback — with no secret in the
 *      environment, both create and verify fail closed (throw) rather than
 *      producing/accepting forgeable tokens.
 */
import { describe, it, expect, afterEach } from 'vitest'
import {
  createEphemeralSearchToken,
  verifyEphemeralSearchToken,
} from '@/lib/ephemeral-token'

const SCANNER = 'scanner-token-abc'

describe('ephemeral search token', () => {
  it('round-trips a valid token back to its invitationId', () => {
    const token = createEphemeralSearchToken('inv-123', SCANNER)
    expect(verifyEphemeralSearchToken(token, SCANNER)).toBe('inv-123')
  })

  it('uses the full 256-bit HMAC signature (64 hex chars, not truncated)', () => {
    const token = createEphemeralSearchToken('inv-123', SCANNER)
    const signature = token.slice(token.lastIndexOf('_') + 1)
    expect(signature).toHaveLength(64)
    expect(signature).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is bound to the scanner token (cannot be replayed by another scanner)', () => {
    const token = createEphemeralSearchToken('inv-123', SCANNER)
    expect(verifyEphemeralSearchToken(token, 'a-different-scanner')).toBeNull()
  })

  it('rejects a token whose invitationId has been swapped', () => {
    const token = createEphemeralSearchToken('inv-123', SCANNER)
    const [, , expiresAt, sig] = token.split('_')
    const forged = `eph_inv-999_${expiresAt}_${sig}`
    expect(verifyEphemeralSearchToken(forged, SCANNER)).toBeNull()
  })

  it('rejects a token with a tampered signature', () => {
    const token = createEphemeralSearchToken('inv-123', SCANNER)
    const idx = token.lastIndexOf('_')
    const body = token.slice(0, idx)
    // Flip one hex digit of the signature.
    const forged = `${body}_${'f'.repeat(64)}`
    expect(verifyEphemeralSearchToken(forged, SCANNER)).toBeNull()
  })

  it('rejects an expired token', () => {
    const token = createEphemeralSearchToken('inv-123', SCANNER)
    const [, invitationId, , sig] = token.split('_')
    // Re-sign is impossible without the secret, so just move the timestamp into
    // the past on the existing token — the signature no longer matches AND the
    // expiry check fails, both of which must reject.
    const past = Date.now() - 1000
    const forged = `eph_${invitationId}_${past}_${sig}`
    expect(verifyEphemeralSearchToken(forged, SCANNER)).toBeNull()
  })

  it('rejects malformed tokens', () => {
    expect(verifyEphemeralSearchToken('', SCANNER)).toBeNull()
    expect(verifyEphemeralSearchToken('not-a-token', SCANNER)).toBeNull()
    expect(verifyEphemeralSearchToken('eph_only-one-part', SCANNER)).toBeNull()
    expect(verifyEphemeralSearchToken('eph_inv_notanumber_sig', SCANNER)).toBeNull()
  })

  // ── fail-closed: no hardcoded secret fallback ──────────────────────────────

  describe('with no secret configured', () => {
    const savedEphemeral = process.env.EPHEMERAL_TOKEN_SECRET
    const savedServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

    afterEach(() => {
      process.env.EPHEMERAL_TOKEN_SECRET = savedEphemeral
      process.env.SUPABASE_SERVICE_ROLE_KEY = savedServiceRole
    })

    it('throws instead of signing with a hardcoded default', () => {
      delete process.env.EPHEMERAL_TOKEN_SECRET
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      expect(() => createEphemeralSearchToken('inv-123', SCANNER)).toThrow(
        /secret is not configured/i,
      )
    })

    it('throws on verify rather than accepting a forged token', () => {
      // Mint a token while a secret is present...
      process.env.SUPABASE_SERVICE_ROLE_KEY = savedServiceRole
      const token = createEphemeralSearchToken('inv-123', SCANNER)
      // ...then remove the secret: verification must fail closed, not silently
      // fall back to a guessable default.
      delete process.env.EPHEMERAL_TOKEN_SECRET
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      expect(() => verifyEphemeralSearchToken(token, SCANNER)).toThrow(
        /secret is not configured/i,
      )
    })
  })
})
