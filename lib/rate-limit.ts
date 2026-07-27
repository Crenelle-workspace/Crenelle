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
}

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
 * Async rate-limit check with automatic Upstash Redis REST fallback.
 * Uses Upstash HTTP REST API if UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set,
 * otherwise falls back to checkRateLimit().
 */
export async function checkRateLimitAsync(
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) {
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
      console.warn('[rate-limit] Upstash Redis request failed, falling back to local store')
      return checkRateLimit(options)
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
    console.error('[rate-limit] Exception during Upstash Redis check:', err)
    return checkRateLimit(options)
  }
}
