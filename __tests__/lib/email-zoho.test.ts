/**
 * __tests__/lib/email-zoho.test.ts
 *
 * Tests for Zoho CPaaS client, EMAIL_PROVIDER toggle, QR inline attachments,
 * application-level idempotency locking, and bounce/error handling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const resendSendMock = vi.fn(async () => ({ data: { id: 're_test_123' }, error: null }))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: resendSendMock }
  },
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import {
  getEmailProvider,
  sendInvitationEmail,
  sendReminderEmailsDirect,
  sendCoHostInviteEmail,
} from '@/lib/email'
import { getZohoAuthHeader, getZohoBaseUrl, sendZohoEmail } from '@/lib/zoho-cpaas'

const mockCreateAdminClient = createAdminClient as ReturnType<typeof vi.fn>

const ORIG_ENV = { ...process.env }

function setupAdminMock(options: {
  idempotencyDuplicate?: boolean
  organizerEmail?: string | null
  unsubscribed?: boolean
} = {}) {
  const emailLogsUpsert = vi.fn().mockResolvedValue({ error: null })
  const emailLogsInsert = vi.fn().mockResolvedValue({ error: null })
  const idempotencyDeleteEq = vi.fn().mockResolvedValue({ error: null })
  const idempotencyInsert = vi.fn().mockResolvedValue(
    options.idempotencyDuplicate
      ? { error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
      : { error: null }
  )

  const from = vi.fn((table: string) => {
    if (table === 'email_unsubscribes') {
      return {
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: options.unsubscribed ? { id: 'unsub-1' } : null,
                error: null,
              }),
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { token: 'unsub-tok-1' },
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { token: 'unsub-tok-new' }, error: null }),
          }),
        }),
      }
    }

    if (table === 'invitations') {
      const invRow = {
        id: 'inv-1',
        qr_token: 'qr-secret-token',
        party_size: 2,
        seat_info: 'A12',
        ticket_tier_id: null,
        attendee: { name: 'Ada Lovelace', email: 'ada@example.com' },
        ticket_tier: null,
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: invRow, error: null }),
            }),
          }),
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [invRow], error: null }),
          }),
        }),
      }
    }

    if (table === 'events') {
      const orgEmail = options.organizerEmail === undefined ? 'host@crenelle.org' : options.organizerEmail
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                organizer_id: 'org-1',
                sender_profile_id: 'sp-1',
                email_theme: 'editorial',
                sender_profiles: orgEmail
                  ? { display_name: 'Crenelle Events', reply_to: orgEmail }
                  : null,
              },
              error: null,
            }),
          }),
        }),
      }
    }

    if (table === 'sender_profiles' || table === 'organizer_settings') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }
    }

    if (table === 'email_idempotency_keys') {
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation(() => ({
            lt: vi.fn().mockResolvedValue({ error: null }),
            then: (resolve: (v: unknown) => void) => Promise.resolve({ error: null }).then(resolve),
          })),
        }),
        insert: idempotencyInsert,
      }
    }

    if (table === 'email_logs') {
      return {
        upsert: emailLogsUpsert,
        insert: emailLogsInsert,
      }
    }

    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
  })

  mockCreateAdminClient.mockReturnValue({
    from,
    rpc: vi.fn(),
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({
          data: { user: { email: options.organizerEmail ?? undefined, user_metadata: {} } },
        }),
      },
    },
  })

  return { emailLogsUpsert, emailLogsInsert, idempotencyInsert, idempotencyDeleteEq }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env = { ...ORIG_ENV }
  process.env.EMAIL_PROVIDER = 'zoho_cpaas'
  process.env.ZOHO_CPAAS_API_KEY = 'raw-send-mail-token'
  process.env.ZOHO_CPAAS_BASE_URL = 'https://cpaas.zoho.com'
  process.env.EMAIL_FROM_ADDRESS = 'tickets@mail.crenelle.org'
  process.env.NEXT_PUBLIC_APP_URL = 'https://crenelle.org'
})

afterEach(() => {
  process.env = { ...ORIG_ENV }
  vi.unstubAllGlobals()
})

describe('Zoho CPaaS config & helper functions', () => {
  it('toggles cleanly between resend and zoho_cpaas via EMAIL_PROVIDER', () => {
    delete process.env.EMAIL_PROVIDER
    expect(getEmailProvider()).toBe('resend')

    process.env.EMAIL_PROVIDER = 'resend'
    expect(getEmailProvider()).toBe('resend')

    process.env.EMAIL_PROVIDER = 'zoho_cpaas'
    expect(getEmailProvider()).toBe('zoho_cpaas')
  })

  it('normalizes base URL and auth header whether or not prefix/path are included', () => {
    process.env.ZOHO_CPAAS_BASE_URL = 'https://cpaas.zoho.com/v1.1/email/'
    expect(getZohoBaseUrl()).toBe('https://cpaas.zoho.com')

    process.env.ZOHO_CPAAS_API_KEY = 'abc123'
    expect(getZohoAuthHeader()).toBe('Zoho-enczapikey abc123')

    process.env.ZOHO_CPAAS_API_KEY = 'Zoho-enczapikey abc123'
    expect(getZohoAuthHeader()).toBe('Zoho-enczapikey abc123')
  })

  it('retries once on HTTP 429 and does not retry on HTTP 400', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Rate limited' }), {
          status: 429,
          headers: { 'retry-after': '0' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ request_id: '1000.retry.ok' }), { status: 200 })
      )

    vi.stubGlobal('fetch', fetchMock)

    const res = await sendZohoEmail({
      from: { address: 'tickets@mail.crenelle.org' },
      to: [{ email_address: { address: 'ada@example.com' } }],
      subject: 'Test',
      htmlbody: '<p>Hi</p>',
    })

    expect(res).toEqual({ requestId: '1000.retry.ok' })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const badFetchMock = vi.fn().mockResolvedValueOnce(
      new Response('<html>502 Bad Gateway</html>', { status: 400 })
    )
    vi.stubGlobal('fetch', badFetchMock)

    const badRes = await sendZohoEmail({
      from: { address: 'tickets@mail.crenelle.org' },
      to: [{ email_address: { address: 'ada@example.com' } }],
      subject: 'Test',
      htmlbody: '<p>Hi</p>',
    })

    expect(badRes.requestId).toBeNull()
    expect(badRes.error).toContain('400')
    expect(badFetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('sendInvitationEmail — Zoho CPaaS & toggle', () => {
  it('sends Zoho payload with Base64 QR inline_images and logs zoho_request_id', async () => {
    const { emailLogsUpsert } = setupAdminMock()
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ request_id: '1000.zoho.inv1' }), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const res = await sendInvitationEmail({
      eventId: 'evt-1',
      recipientEmail: 'ada@example.com',
      recipientName: 'Ada Lovelace',
      invitationId: 'inv-1',
      event: {
        name: 'Gala',
        date: '2026-12-01',
        time: '19:00',
        venue: 'Grand Hall',
      },
      idempotencyKey: 'key-1',
    })

    expect(res).toEqual({ success: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(resendSendMock).not.toHaveBeenCalled()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://cpaas.zoho.com/v1.1/email')
    expect((init.headers as Record<string, string>).Authorization).toBe('Zoho-enczapikey raw-send-mail-token')

    const body = JSON.parse(init.body as string)
    expect(body.from).toEqual({ address: 'tickets@mail.crenelle.org', name: 'Crenelle Events' })
    expect(body.to).toEqual([{ email_address: { address: 'ada@example.com', name: 'Ada Lovelace' } }])
    expect(body.reply_to).toEqual([{ address: 'host@crenelle.org', name: 'Crenelle Events' }])
    expect(body.client_reference).toBe('key-1')
    expect(body.mime_headers).toEqual({ 'X-Entity-Ref-ID': 'inv-1' })
    expect(body.headers).toBeUndefined()
    expect(body.inline_images).toHaveLength(1)
    expect(body.inline_images[0]).toMatchObject({
      cid: 'qrcode',
      name: 'qrcode.png',
      mime_type: 'image/png',
    })
    expect(body.inline_images[0].content.length).toBeGreaterThan(20)

    expect(emailLogsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'zoho_cpaas',
        zoho_request_id: '1000.zoho.inv1',
        resend_email_id: null,
      }),
      { onConflict: 'zoho_request_id', ignoreDuplicates: true }
    )
  })

  it('omits reply_to when organizer email is empty and refuses onboarding@resend.dev fallback', async () => {
    setupAdminMock({ organizerEmail: null })
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ request_id: '1000.zoho.noreply' }), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const okRes = await sendInvitationEmail({
      eventId: 'evt-1',
      recipientEmail: 'ada@example.com',
      recipientName: 'Ada Lovelace',
      invitationId: 'inv-1',
      event: { name: 'Gala', date: '2026-12-01', time: '19:00', venue: 'Grand Hall' },
    })

    expect(okRes).toEqual({ success: true })
    const sentBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(sentBody.reply_to).toBeUndefined()

    delete process.env.EMAIL_FROM_ADDRESS
    delete process.env.EMAIL_FROM
    const missingFromRes = await sendInvitationEmail({
      eventId: 'evt-1',
      recipientEmail: 'ada@example.com',
      recipientName: 'Ada Lovelace',
      invitationId: 'inv-1',
      event: { name: 'Gala', date: '2026-12-01', time: '19:00', venue: 'Grand Hall' },
    })

    expect(missingFromRes).toEqual({
      error: 'EMAIL_FROM_ADDRESS is not configured for Zoho CPaaS.',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('skips duplicate send when idempotency key is already claimed', async () => {
    setupAdminMock({ idempotencyDuplicate: true })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const res = await sendInvitationEmail({
      eventId: 'evt-1',
      recipientEmail: 'ada@example.com',
      recipientName: 'Ada Lovelace',
      invitationId: 'inv-1',
      event: { name: 'Gala', date: '2026-12-01', time: '19:00', venue: 'Grand Hall' },
      idempotencyKey: 'dup-key',
    })

    expect(res).toEqual({ success: true, skipped: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('routes back to Resend immediately when EMAIL_PROVIDER=resend', async () => {
    process.env.EMAIL_PROVIDER = 'resend'
    const { emailLogsUpsert } = setupAdminMock()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const res = await sendInvitationEmail({
      eventId: 'evt-1',
      recipientEmail: 'ada@example.com',
      recipientName: 'Ada Lovelace',
      invitationId: 'inv-1',
      event: { name: 'Gala', date: '2026-12-01', time: '19:00', venue: 'Grand Hall' },
    })

    expect(res).toEqual({ success: true })
    expect(resendSendMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(emailLogsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'resend',
        resend_email_id: 're_test_123',
        zoho_request_id: null,
      }),
      { onConflict: 'resend_email_id', ignoreDuplicates: true }
    )
  })
})

describe('sendReminderEmailsDirect & sendCoHostInviteEmail — Zoho CPaaS', () => {
  it('dispatches per-recipient reminders with QR inline_images via Zoho CPaaS', async () => {
    const { emailLogsInsert } = setupAdminMock()
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ request_id: '1000.zoho.rem1' }), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const res = await sendReminderEmailsDirect({
      eventId: 'evt-1',
      recipients: [{ email: 'ada@example.com', name: 'Ada Lovelace', invitationId: 'inv-1' }],
      event: { name: 'Gala', date: '2026-12-01', time: '19:00', venue: 'Grand Hall' },
      customMessage: 'Doors open at 6pm',
    })

    expect(res).toEqual({ success: true, sent: 1, errors: undefined })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(emailLogsInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        provider: 'zoho_cpaas',
        zoho_request_id: '1000.zoho.rem1',
        resend_email_id: null,
      }),
    ])
  })

  it('escapes HTML in sendCoHostInviteEmail when using Zoho CPaaS', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ request_id: '1000.zoho.cohost' }), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    await sendCoHostInviteEmail({
      inviteeEmail: 'cohost@example.com',
      inviteeName: 'Bob',
      inviterName: '<script>alert(1)</script>',
      inviterEmail: 'host@example.com',
      eventName: 'Summer <b>Fest</b>',
      eventDate: '2026-12-01',
      eventId: 'evt-1',
      role: 'viewer',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const payload = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(payload.htmlbody).not.toContain('<script>alert(1)</script>')
    expect(payload.htmlbody).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(payload.to).toEqual([{ email_address: { address: 'cohost@example.com', name: 'Bob' } }])
  })
})

