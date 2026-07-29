/**
 * __tests__/api/unsubscribe.test.ts
 *
 * Security / correctness tests for GET /api/unsubscribe (finding 7, MED).
 *
 * The bug: the GET handler treated ANY existing token row as "already
 * unsubscribed" and returned a success page WITHOUT setting `unsubscribed_at`.
 * But getUnsubscribeUrl() pre-seeds a token row (unsubscribed_at = NULL) before
 * every send, so a still-subscribed guest who clicked the footer link was told
 * "already removed" while email dispatch (which gates on unsubscribed_at IS NOT
 * NULL) kept sending to them.
 *
 * Guarantees:
 *   1. A malformed token → 400, no DB write.
 *   2. An unknown token → 400 (invalid link), no DB write.
 *   3. A pre-seeded token (unsubscribed_at NULL) → 200 AND an UPDATE that stamps
 *      unsubscribed_at, scoped to `.is('unsubscribed_at', null)`.
 *   4. An already-unsubscribed token → 200, idempotent, no UPDATE.
 *
 * The admin Supabase client is fully mocked — no network or DB calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { GET } from '@/app/api/unsubscribe/route'

const mockCreateAdminClient = createAdminClient as ReturnType<typeof vi.fn>

const VALID_TOKEN = 'a'.repeat(48)

function makeRequest(token?: string): NextRequest {
  const url = token
    ? `http://localhost/api/unsubscribe?token=${token}`
    : 'http://localhost/api/unsubscribe'
  return new NextRequest(url)
}

/**
 * Build a mocked admin client.
 * - lookupRow: the row returned by the select().eq().maybeSingle() lookup
 *   (null = token not found).
 * Returns { client, updateSpy, isSpy } so tests can assert the UPDATE path.
 */
function mockAdminClient(lookupRow: { email: string; unsubscribed_at: string | null } | null) {
  const isSpy = vi.fn().mockResolvedValue({ error: null })
  const updateSpy = vi.fn(() => ({
    eq: vi.fn(() => ({ is: isSpy })),
  }))

  const client = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: lookupRow, error: null }),
      update: updateSpy,
    })),
  }

  return { client, updateSpy, isSpy }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/unsubscribe', () => {
  it('rejects a malformed token with 400 and does not touch the DB', async () => {
    const { client, updateSpy } = mockAdminClient(null)
    mockCreateAdminClient.mockReturnValue(client)

    const res = await GET(makeRequest('not-a-valid-token'))

    expect(res.status).toBe(400)
    expect(client.from).not.toHaveBeenCalled()
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('rejects an unknown token as an invalid link (400) with no write', async () => {
    const { client, updateSpy } = mockAdminClient(null)
    mockCreateAdminClient.mockReturnValue(client)

    const res = await GET(makeRequest(VALID_TOKEN))

    expect(res.status).toBe(400)
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('opts out a pre-seeded (NULL) token: 200 AND stamps unsubscribed_at', async () => {
    const { client, updateSpy, isSpy } = mockAdminClient({
      email: 'guest@example.com',
      unsubscribed_at: null,
    })
    mockCreateAdminClient.mockReturnValue(client)

    const res = await GET(makeRequest(VALID_TOKEN))

    expect(res.status).toBe(200)
    // The row must actually be updated...
    expect(updateSpy).toHaveBeenCalledTimes(1)
    const patch = updateSpy.mock.calls[0][0] as { unsubscribed_at?: string }
    expect(patch.unsubscribed_at).toBeTruthy()
    // ...and scoped to rows still NULL, so a duplicate click can't clobber it.
    expect(isSpy).toHaveBeenCalledTimes(1)

    const body = await res.text()
    expect(body).toContain('removed from our mailing list')
  })

  it('is idempotent for an already-unsubscribed token: 200, no UPDATE', async () => {
    const { client, updateSpy } = mockAdminClient({
      email: 'guest@example.com',
      unsubscribed_at: '2026-01-01T00:00:00.000Z',
    })
    mockCreateAdminClient.mockReturnValue(client)

    const res = await GET(makeRequest(VALID_TOKEN))

    expect(res.status).toBe(200)
    expect(updateSpy).not.toHaveBeenCalled()

    const body = await res.text()
    expect(body).toContain('already been removed')
  })
})
