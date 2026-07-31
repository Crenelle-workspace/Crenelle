/**
 * __tests__/lib/rate-limit.async.test.ts
 *
 * Security tests for checkRateLimitAsync (finding 6, HIGH — fail-open limiter).
 *
 * The rate limiter is a security control. When a durable store (Upstash) is
 * CONFIGURED but unreachable, the limiter must FAIL CLOSED (deny) rather than
 * silently fall back to the per-instance in-process Map — that Map resets on
 * cold start and is per-instance, so on serverless an attacker can dilute it
 * across instances and bypass the limit entirely.
 *
 * Guarantees:
 *   1. Upstash configured + fetch rejects (network error)  → allowed:false, degraded:true
 *   2. Upstash configured + non-OK HTTP response           → allowed:false, degraded:true
 *   3. Upstash configured + success under the limit        → allowed:true (not degraded)
 *   4. Upstash configured + success over the limit         → allowed:false (not degraded)
 *   5. Upstash NOT configured                              → in-process store, allowed, not degraded
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkRateLimitAsync } from '@/lib/rate-limit'

const URL_KEY = 'UPSTASH_REDIS_REST_URL'
const TOKEN_KEY = 'UPSTASH_REDIS_REST_TOKEN'

const savedUrl = process.env[URL_KEY]
const savedToken = process.env[TOKEN_KEY]

function configureUpstash() {
  process.env[URL_KEY] = 'https://example.upstash.io'
  process.env[TOKEN_KEY] = 'test-token'
}

function unconfigureUpstash() {
  delete process.env[URL_KEY]
  delete process.env[TOKEN_KEY]
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  if (savedUrl === undefined) delete process.env[URL_KEY]
  else process.env[URL_KEY] = savedUrl
  if (savedToken === undefined) delete process.env[TOKEN_KEY]
  else process.env[TOKEN_KEY] = savedToken
})

const OPTS = { key: 'test-key', limit: 3, windowMs: 60_000 }

describe('checkRateLimitAsync — durable store failure semantics', () => {
  it('fails CLOSED when Upstash is configured but fetch rejects', async () => {
    configureUpstash()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))

    const result = await checkRateLimitAsync(OPTS)

    expect(result.allowed).toBe(false)
    expect(result.degraded).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('fails CLOSED when Upstash returns a non-OK HTTP status', async () => {
    configureUpstash()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    )

    const result = await checkRateLimitAsync(OPTS)

    expect(result.allowed).toBe(false)
    expect(result.degraded).toBe(true)
  })

  it('allows a request under the limit when Upstash succeeds', async () => {
    configureUpstash()
    // INCR → 1 (first hit), PTTL → -1 (no expiry yet). The pexpire follow-up
    // also goes through fetch; return ok for any call.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [{ result: 1 }, { result: -1 }],
      }),
    )

    const result = await checkRateLimitAsync(OPTS)

    expect(result.allowed).toBe(true)
    expect(result.degraded).toBeUndefined()
  })

  it('denies (but not degraded) when Upstash reports the count is over the limit', async () => {
    configureUpstash()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [{ result: 4 }, { result: 30_000 }], // 4 > limit of 3
      }),
    )

    const result = await checkRateLimitAsync(OPTS)

    expect(result.allowed).toBe(false)
    expect(result.degraded).toBeUndefined()
  })

  it('uses the in-process store (allowed, not degraded) when Upstash is NOT configured', async () => {
    unconfigureUpstash()
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = await checkRateLimitAsync({ ...OPTS, key: 'unconfigured-key' })

    expect(result.allowed).toBe(true)
    expect(result.degraded).toBeUndefined()
    // No durable store means no network call.
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
