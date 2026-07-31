/**
 * __tests__/api/webhooks-resend.test.ts
 *
 * Tests for POST /api/webhooks/resend — the deliverability feedback loop.
 *
 * This endpoint was deleted by accident in 3f6637f (a UI refactor commit) and
 * restored suppression-only: engagement tracking was dropped deliberately, but
 * bounce/complaint suppression is what protects sender reputation, so it needs
 * coverage to stop it silently disappearing again.
 *
 * Guarantees:
 *   1. A forged / missing / stale signature → 401, no DB access at all.
 *   2. Non-suppressing events (delivered, opened, clicked) → 200, no DB access.
 *   3. email.bounced → the recipient is upserted into email_unsubscribes, lowercased.
 *   4. email.complained → same suppression path.
 *   5. An unknown resend_email_id → 200, no suppression written.
 *   6. A failed upsert → 500, so Resend retries instead of dropping the bounce.
 *
 * The admin Supabase client is fully mocked — no network or DB calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createHmac } from 'crypto'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { POST } from '@/app/api/webhooks/resend/route'

const mockCreateAdminClient = createAdminClient as ReturnType<typeof vi.fn>

// Secret is base64 in the Svix scheme, optionally prefixed with "whsec_"
const SECRET_B64 = Buffer.from('test-webhook-secret').toString('base64')
process.env.RESEND_WEBHOOK_SECRET = `whsec_${SECRET_B64}`

const SVIX_ID = 'msg_test123'

function sign(svixId: string, timestamp: string, body: string): string {
  return createHmac('sha256', Buffer.from(SECRET_B64, 'base64'))
    .update(`${svixId}.${timestamp}.${body}`)
    .digest('base64')
}

/**
 * Build a signed webhook request. Pass `signature` to forge a bad one, or
 * `timestamp` to test the replay window.
 */
function makeRequest(
  payload: unknown,
  opts: { signature?: string; timestamp?: string; omitHeaders?: boolean } = {}
): NextRequest {
  const body = JSON.stringify(payload)
  const timestamp = opts.timestamp ?? String(Math.floor(Date.now() / 1000))
  const signature = opts.signature ?? sign(SVIX_ID, timestamp, body)

  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (!opts.omitHeaders) {
    headers['svix-id'] = SVIX_ID
    headers['svix-timestamp'] = timestamp
    headers['svix-signature'] = `v1,${signature}`
  }

  return new NextRequest('http://localhost/api/webhooks/resend', {
    method: 'POST',
    body,
    headers,
  })
}

/**
 * Mock the admin client.
 * - log: the email_logs row found by resend_email_id (null = not found)
 * - upsertError: force the suppression write to fail
 */
function mockAdminClient(
  log: { recipient_email: string } | null,
  upsertError: { message: string } | null = null
) {
  const upsertSpy = vi.fn().mockResolvedValue({ error: upsertError })
  const maybeSingleSpy = vi.fn().mockResolvedValue({ data: log, error: null })

  const fromSpy = vi.fn((table: string) => {
    if (table === 'email_logs') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: maybeSingleSpy,
      }
    }
    return { upsert: upsertSpy }
  })

  const client = { from: fromSpy }
  mockCreateAdminClient.mockReturnValue(client)
  return { fromSpy, upsertSpy }
}

const BOUNCE = {
  type: 'email.bounced',
  data: { email_id: 'resend-abc-123' },
}

describe('POST /api/webhooks/resend — signature verification', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects a forged signature with 401 and never touches the DB', async () => {
    const { fromSpy } = mockAdminClient({ recipient_email: 'guest@example.com' })

    const res = await POST(makeRequest(BOUNCE, { signature: 'not-a-real-signature' }))

    expect(res.status).toBe(401)
    expect(fromSpy).not.toHaveBeenCalled()
  })

  it('rejects missing Svix headers with 401', async () => {
    const { fromSpy } = mockAdminClient({ recipient_email: 'guest@example.com' })

    const res = await POST(makeRequest(BOUNCE, { omitHeaders: true }))

    expect(res.status).toBe(401)
    expect(fromSpy).not.toHaveBeenCalled()
  })

  it('rejects a stale timestamp with 401 (replay protection)', async () => {
    const { fromSpy } = mockAdminClient({ recipient_email: 'guest@example.com' })
    const stale = String(Math.floor(Date.now() / 1000) - 600) // 10 minutes old

    const res = await POST(makeRequest(BOUNCE, { timestamp: stale }))

    expect(res.status).toBe(401)
    expect(fromSpy).not.toHaveBeenCalled()
  })
})

describe('POST /api/webhooks/resend — suppression', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each(['email.delivered', 'email.opened', 'email.clicked'])(
    'acks %s without any DB access (tracking removed)',
    async (type) => {
      const { fromSpy } = mockAdminClient({ recipient_email: 'guest@example.com' })

      const res = await POST(makeRequest({ type, data: { email_id: 'resend-abc-123' } }))

      expect(res.status).toBe(200)
      expect(fromSpy).not.toHaveBeenCalled()
    }
  )

  it('suppresses the recipient on email.bounced, lowercased', async () => {
    const { upsertSpy } = mockAdminClient({ recipient_email: 'Guest@Example.COM' })

    const res = await POST(makeRequest(BOUNCE))

    expect(res.status).toBe(200)
    expect(upsertSpy).toHaveBeenCalledTimes(1)
    expect(upsertSpy.mock.calls[0][0]).toMatchObject({ email: 'guest@example.com' })
    expect(upsertSpy.mock.calls[0][1]).toMatchObject({ onConflict: 'email' })
  })

  it('suppresses the recipient on email.complained', async () => {
    const { upsertSpy } = mockAdminClient({ recipient_email: 'spam-reporter@example.com' })

    const res = await POST(
      makeRequest({ type: 'email.complained', data: { email_id: 'resend-abc-123' } })
    )

    expect(res.status).toBe(200)
    expect(upsertSpy).toHaveBeenCalledTimes(1)
    expect(upsertSpy.mock.calls[0][0]).toMatchObject({ email: 'spam-reporter@example.com' })
  })

  it('acks without suppressing when the resend_email_id is unknown', async () => {
    const { upsertSpy } = mockAdminClient(null)

    const res = await POST(makeRequest(BOUNCE))

    expect(res.status).toBe(200)
    expect(upsertSpy).not.toHaveBeenCalled()
  })

  it('returns 500 when the suppression write fails so Resend retries', async () => {
    mockAdminClient({ recipient_email: 'guest@example.com' }, { message: 'db down' })

    const res = await POST(makeRequest(BOUNCE))

    expect(res.status).toBe(500)
  })
})
