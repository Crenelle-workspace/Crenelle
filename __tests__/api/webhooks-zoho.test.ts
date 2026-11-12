/**
 * __tests__/api/webhooks-zoho.test.ts
 *
 * Tests for GET/HEAD/POST /api/webhooks/zoho — the Zoho CPaaS deliverability
 * feedback loop.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createHmac } from 'crypto'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { GET, HEAD, POST } from '@/app/api/webhooks/zoho/route'

const mockCreateAdminClient = createAdminClient as ReturnType<typeof vi.fn>

const WEBHOOK_SECRET = 'test-zoho-webhook-secret'

function signPayload(payload: string, secret = WEBHOOK_SECRET): string {
  return createHmac('sha256', secret).update(payload).digest('base64')
}

function makeJsonRequest(
  payload: unknown,
  opts: {
    signature?: string
    tsMs?: number
    algorithm?: string
    omitHeader?: boolean
    rawBodyOverride?: string
    urlEncodeSig?: boolean
  } = {}
): NextRequest {
  const rawBody = opts.rawBodyOverride ?? JSON.stringify(payload)
  const ts = opts.tsMs ?? Date.now()
  const sig = opts.signature ?? signPayload(rawBody)
  const encodedSig = opts.urlEncodeSig ? encodeURIComponent(sig) : sig
  const alg = opts.algorithm ?? 'HmacSHA256'

  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (!opts.omitHeader) {
    headers['producer-signature'] = `ts=${ts};s=${encodedSig};s-algorithm=${alg}`
  }

  return new NextRequest('http://localhost/api/webhooks/zoho', {
    method: 'POST',
    body: rawBody,
    headers,
  })
}

function makeFormRequest(payload: unknown, opts: { tsMs?: number } = {}): NextRequest {
  const jsonStr = JSON.stringify(payload)
  const ts = opts.tsMs ?? Date.now()
  const sig = encodeURIComponent(signPayload(jsonStr))
  const formBody = `body=${encodeURIComponent(jsonStr)}`

  return new NextRequest('http://localhost/api/webhooks/zoho', {
    method: 'POST',
    body: formBody,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'producer-signature': `ts=${ts};s=${sig};s-algorithm=HmacSHA256`,
    },
  })
}

function mockAdminClient(
  log: { recipient_email: string } | null = null,
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

  mockCreateAdminClient.mockReturnValue({
    from: fromSpy,
    rpc: vi.fn(),
  })

  return { fromSpy, upsertSpy }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ZOHO_CPAAS_WEBHOOK_SECRET = WEBHOOK_SECRET
})

describe('GET/HEAD /api/webhooks/zoho', () => {
  it('responds 200 for reachability checks', async () => {
    const getRes = await GET()
    expect(getRes.status).toBe(200)
    const headRes = await HEAD()
    expect(headRes.status).toBe(200)
  })
})

describe('POST /api/webhooks/zoho — signature verification', () => {
  it('rejects missing producer-signature header with 401', async () => {
    const { fromSpy } = mockAdminClient()
    const res = await POST(
      makeJsonRequest({ event_name: ['hardbounce'] }, { omitHeader: true })
    )
    expect(res.status).toBe(401)
    expect(fromSpy).not.toHaveBeenCalled()
  })

  it('rejects invalid signature with 401', async () => {
    const { fromSpy } = mockAdminClient()
    const res = await POST(
      makeJsonRequest(
        { event_name: ['hardbounce'] },
        { signature: 'forged-signature==' }
      )
    )
    expect(res.status).toBe(401)
    expect(fromSpy).not.toHaveBeenCalled()
  })

  it('rejects stale millisecond timestamps (> 5 min old) with 401', async () => {
    const { fromSpy } = mockAdminClient()
    const sixMinutesAgo = Date.now() - 6 * 60 * 1000
    const res = await POST(
      makeJsonRequest({ event_name: ['hardbounce'] }, { tsMs: sixMinutesAgo })
    )
    expect(res.status).toBe(401)
    expect(fromSpy).not.toHaveBeenCalled()
  })

  it('rejects unsupported algorithms with 401', async () => {
    const { fromSpy } = mockAdminClient()
    const res = await POST(
      makeJsonRequest({ event_name: ['hardbounce'] }, { algorithm: 'md5' })
    )
    expect(res.status).toBe(401)
    expect(fromSpy).not.toHaveBeenCalled()
  })

  it('fails closed with 401 when ZOHO_CPAAS_WEBHOOK_SECRET is unset', async () => {
    delete process.env.ZOHO_CPAAS_WEBHOOK_SECRET
    const { fromSpy } = mockAdminClient()
    const res = await POST(makeJsonRequest({ event_name: ['hardbounce'] }))
    expect(res.status).toBe(401)
    expect(fromSpy).not.toHaveBeenCalled()
  })

  it('verifies URL-encoded Base64 signatures with trailing = padding', async () => {
    const { upsertSpy } = mockAdminClient()
    const payload = {
      event_name: ['hardbounce'],
      event_message: [
        {
          request_id: '1000.abc.123',
          email_info: {
            to: [{ email_address: { address: 'Bounced@Example.com' } }],
          },
        },
      ],
    }

    const res = await POST(makeJsonRequest(payload, { urlEncodeSig: true }))
    expect(res.status).toBe(200)
    expect(upsertSpy).toHaveBeenCalledTimes(1)
    expect(upsertSpy.mock.calls[0][0]).toEqual([
      expect.objectContaining({ email: 'bounced@example.com' }),
    ])
  })

  it('verifies application/x-www-form-urlencoded body=... payloads', async () => {
    const { upsertSpy } = mockAdminClient()
    const payload = {
      event_name: ['feedbackloop'],
      event_message: [
        {
          request_id: '1000.form.456',
          email_info: {
            to: [{ email_address: { address: 'Spam@Example.com' } }],
          },
        },
      ],
    }

    const res = await POST(makeFormRequest(payload))
    expect(res.status).toBe(200)
    expect(upsertSpy).toHaveBeenCalledTimes(1)
    expect(upsertSpy.mock.calls[0][0]).toEqual([
      expect.objectContaining({ email: 'spam@example.com' }),
    ])
  })
})

describe('POST /api/webhooks/zoho — suppression & event handling', () => {
  it('acks non-suppressing events (softbounce, email_open) without touching DB', async () => {
    const { fromSpy } = mockAdminClient()
    for (const eventName of ['softbounce', 'email_open', 'email_link_click']) {
      const res = await POST(
        makeJsonRequest({
          event_name: [eventName],
          event_message: [
            {
              request_id: '1000.soft.1',
              email_info: { to: [{ email_address: { address: 'guest@example.com' } }] },
            },
          ],
        })
      )
      expect(res.status).toBe(200)
      expect(fromSpy).not.toHaveBeenCalled()
    }
  })

  it('processes all recipients across batched event_message arrays', async () => {
    const { upsertSpy } = mockAdminClient()
    const res = await POST(
      makeJsonRequest({
        event_name: ['hardbounce'],
        event_message: [
          {
            request_id: 'req-1',
            email_info: {
              to: [{ email_address: { address: 'First@Example.com' } }],
            },
          },
          {
            request_id: 'req-2',
            email_info: {
              to: [
                { email_address: { address: 'Second@Example.com' } },
                { email_address: { address: 'first@example.com' } },
              ],
            },
          },
        ],
      })
    )

    expect(res.status).toBe(200)
    expect(upsertSpy).toHaveBeenCalledTimes(1)
    const rows = upsertSpy.mock.calls[0][0] as Array<{ email: string }>
    expect(rows.map(r => r.email)).toEqual(['first@example.com', 'second@example.com'])
  })

  it('falls back to email_logs lookup by zoho_request_id when email_info.to is absent', async () => {
    const { upsertSpy } = mockAdminClient({ recipient_email: 'Fallback@Example.com' })
    const res = await POST(
      makeJsonRequest({
        event_name: ['hardbounce'],
        event_message: [{ request_id: 'zoho-req-999' }],
      })
    )

    expect(res.status).toBe(200)
    expect(upsertSpy).toHaveBeenCalledWith(
      [expect.objectContaining({ email: 'fallback@example.com' })],
      { onConflict: 'email', ignoreDuplicates: false }
    )
  })

  it('returns 500 when suppression upsert fails so Zoho retries', async () => {
    mockAdminClient(null, { message: 'db down' })
    const res = await POST(
      makeJsonRequest({
        event_name: ['hardbounce'],
        event_message: [
          {
            request_id: 'req-fail',
            email_info: { to: [{ email_address: { address: 'bad@example.com' } }] },
          },
        ],
      })
    )

    expect(res.status).toBe(500)
  })
})

