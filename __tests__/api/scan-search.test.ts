/**
 * __tests__/api/scan-search.test.ts
 *
 * Unit tests for GET /api/scan/search — the manual name-search fallback for
 * damaged / dead-battery QR codes.
 *
 * Regression focus (finding 8): a scanner-token holder must NOT be able to
 * enumerate the whole guest list by sending wildcard-only queries. The route
 * escapes SQL LIKE metacharacters and requires >= 2 literal characters, so
 * probes like `%`, `__`, `**` return no results and never reach an
 * enumerating `ilike` pattern.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
// Rate limit always allows in these tests.
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }),
}))
// Deterministic token so assertions don't depend on the HMAC secret.
vi.mock('@/lib/ephemeral-token', () => ({
  createEphemeralSearchToken: vi.fn((invId: string) => `eph_${invId}`),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { GET } from '@/app/api/scan/search/route'

const mockCreateAdminClient = createAdminClient as ReturnType<typeof vi.fn>

const SCANNER_TOKEN = 'tok_scan_1'
const EVENT_ID = 'event-1'

const ACTIVE_LINK = { event_id: EVENT_ID, is_active: true }
const ATTENDEE = {
  id: 'att-1',
  name: 'Alice Example',
  phone: '+15551234567',
  invitations: [{ id: 'inv-1', party_size: 2, seat_info: 'A-12', status: 'accepted' }],
}

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(q: string | null, token: string | null = SCANNER_TOKEN): NextRequest {
  const url = new URL('http://localhost/api/scan/search')
  if (token !== null) url.searchParams.set('token', token)
  if (q !== null) url.searchParams.set('q', q)
  return new NextRequest(url)
}

/**
 * Build a mock admin client.
 * First `from()` (scanner_links) resolves the active-link lookup.
 * Second `from()` (attendees) captures the `ilike` pattern and resolves rows.
 */
function mockAdminClient(rows: unknown[] = [ATTENDEE]) {
  const ilikeSpy = vi.fn().mockReturnThis()

  const scannerLinkChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: ACTIVE_LINK, error: null }),
  }

  const attendeesChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: ilikeSpy,
    limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
  }

  let call = 0
  const client = {
    from: vi.fn(() => {
      call++
      return call === 1 ? scannerLinkChain : attendeesChain
    }),
  }

  mockCreateAdminClient.mockReturnValue(client)
  return { client, ilikeSpy }
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('GET /api/scan/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when the scanner token is missing', async () => {
    const res = await GET(makeRequest('Alice', null))
    expect(res.status).toBe(400)
  })

  it('returns empty results (no DB hit) for a query with < 2 literal chars', async () => {
    const { client } = mockAdminClient()
    const res = await GET(makeRequest('a'))
    expect(res.status).toBe(200)
    expect((await res.json()).results).toEqual([])
    // Short query short-circuits before any Supabase call.
    expect(client.from).not.toHaveBeenCalled()
  })

  it.each(['%%', '__', '**', '%', '*', '%_*'])(
    'treats all-wildcard query %j as too short and never runs an ilike search',
    async (probe) => {
      const { client } = mockAdminClient()
      const res = await GET(makeRequest(probe))
      expect(res.status).toBe(200)
      expect((await res.json()).results).toEqual([])
      expect(client.from).not.toHaveBeenCalled()
    }
  )

  it('escapes LIKE metacharacters embedded in a real query', async () => {
    const { ilikeSpy } = mockAdminClient()
    // 100% real name chars around an injected wildcard.
    const res = await GET(makeRequest('Al%_e'))
    expect(res.status).toBe(200)
    expect(ilikeSpy).toHaveBeenCalledTimes(1)
    const [column, pattern] = ilikeSpy.mock.calls[0]
    expect(column).toBe('name')
    // % and _ are backslash-escaped so they match literally, wrapped in %...%.
    expect(pattern).toBe('%Al\\%\\_e%')
  })

  it('strips asterisks (PostgREST % alias) from the pattern', async () => {
    const { ilikeSpy } = mockAdminClient()
    const res = await GET(makeRequest('Ali*ce'))
    expect(res.status).toBe(200)
    const [, pattern] = ilikeSpy.mock.calls[0]
    expect(pattern).toBe('%Alice%')
    expect(pattern).not.toContain('*')
  })

  it('returns masked results for a valid query', async () => {
    mockAdminClient()
    const res = await GET(makeRequest('Alice'))
    expect(res.status).toBe(200)
    const { results } = await res.json()
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      guestId: 'att-1',
      guestName: 'Alice Example',
      phone: '***-***-4567',
      invitationId: 'eph_inv-1',
      partySize: 2,
    })
  })

  it('returns 403 for an inactive scanner link', async () => {
    const inactiveChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { event_id: EVENT_ID, is_active: false }, error: null }),
    }
    mockCreateAdminClient.mockReturnValue({ from: vi.fn(() => inactiveChain) })
    const res = await GET(makeRequest('Alice'))
    expect(res.status).toBe(403)
  })
})
