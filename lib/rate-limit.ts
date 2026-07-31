/**
 * lib/rate-limit.ts
 *
 * Sliding-window rate limiter with dual mode:
 * 1. In-process Map store (default for development and single-instance deployments).
 * 2. Upstash Redis REST adapter (when UPSTASH_REDIS_REST_URL is configured for multi-region serverless).
 */

interface WindowEntry {
  count: number
  resetAt: number
}

// Module-level in-memory store — lives for the lifetime of the warm serverless instance
const store = new Map<string, WindowEntry>()

// Clean up expired keys periodically so memory usage remains bounded
const CLEANUP_INTERVAL_MS = 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key)
  }
}

/**
 * Test-only: clear the in-process store so counters do not bleed between
 * test cases (all of which run in one warm module instance). Not used in
 * production code paths.
 */
export function __resetRateLimitStoreForTests() {
  store.clear()
  lastCleanup = Date.now()
}

export interface RateLimitOptions {
  /** Unique key for this counter — e.g. `register:${ip}` or `scan:${token}` */
  key: string
  /** Maximum number of requests allowed within the window */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  /** true if the request is within the allowed limit */
  allowed: boolean
  /** remaining requests in this window */
  remaining: number
  /** timestamp (ms) when the window resets */
  resetAt: number
  /**
   * true when this result is a fail-CLOSED denial caused by the durable store
   * being configured but unreachable — the request was denied defensively, not
   * because a real counter was exceeded. Callers may surface a "try again"
   * message distinct from a genuine rate-limit block.
   */
  degraded?: boolean
}

// Warn once (not per-request) if we're running without a durable store. On
// multi-instance serverless the in-process Map is per-instance and resets on
// cold start, so it is best-effort only — an attacker can spread requests
// across instances to dilute it. Production must configure Upstash.
let warnedNoDurableStore = false

/**
 * Synchronous rate-limit check using the in-process sliding window store.
 */
export function checkRateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): RateLimitResult {
  cleanup()

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  entry.count++

  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}

/**
 * A fail-CLOSED denial: used when the durable (Upstash) store is configured but
 * unreachable. We must NOT silently fall back to the per-instance in-process
 * Map, because on serverless that counter resets on cold start and is
 * per-instance — an attacker can dilute it across instances and bypass the
 * limit entirely. Denying defensively during a backend outage is the safe
 * choice for a security control.
 */
function failClosed(options: RateLimitOptions): RateLimitResult {
  return {
    allowed: false,
    remaining: 0,
    resetAt: Date.now() + options.windowMs,
    degraded: true,
  }
}

/**
 * Async rate-limit check backed by Upstash Redis when configured.
 *
 * - If Upstash is NOT configured: uses the in-process store. This is only sound
 *   for development / single-instance deployments and warns once at runtime.
 * - If Upstash IS configured but the request errors: FAILS CLOSED (denies)
 *   rather than falling back to the dilutable in-process store.
 */
export async function checkRateLimitAsync(
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) {
    if (!warnedNoDurableStore) {
      warnedNoDurableStore = true
      const msg =
        '[rate-limit] No durable store configured (UPSTASH_REDIS_REST_URL/TOKEN). ' +
        'Falling back to a per-instance in-memory limiter, which is best-effort ' +
        'only and NOT reliable on multi-instance serverless.'
      if (process.env.NODE_ENV === 'production') {
        console.error(msg)
      } else {
        console.warn(msg)
      }
    }
    return checkRateLimit(options)
  }

  try {
    const url = `${redisUrl}/pipeline`
    const pttlKey = `rl:${options.key}`

    // Upstash pipeline: INCR key, PTTL key, EXPIRE key px windowMs if new
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', pttlKey],
        ['PTTL', pttlKey],
      ]),
    })

    if (!res.ok) {
      // Upstash is configured but returned an error. Fail CLOSED rather than
      // silently dropping to the dilutable per-instance store.
      console.error(
        `[rate-limit] Upstash Redis request failed (status ${res.status}); failing closed`
      )
      return failClosed(options)
    }

    const data = await res.json()
    const currentCount = Number(data[0]?.result ?? 1)
    let ttlMs = Number(data[1]?.result ?? options.windowMs)

    // Set expiration on first hit
    if (currentCount === 1 || ttlMs < 0) {
      await fetch(`${redisUrl}/pexpire/${pttlKey}/${options.windowMs}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      })
      ttlMs = options.windowMs
    }

    const now = Date.now()
    const resetAt = now + Math.max(0, ttlMs)
    const allowed = currentCount <= options.limit
    const remaining = Math.max(0, options.limit - currentCount)

    return { allowed, remaining, resetAt }
  } catch (err) {
    // Network/DNS/timeout error reaching Upstash. Fail CLOSED — see failClosed().
    console.error('[rate-limit] Exception during Upstash Redis check; failing closed:', err)
    return failClosed(options)
  }
}
