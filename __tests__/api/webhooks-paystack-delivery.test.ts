/**
 * __tests__/api/webhooks-paystack-delivery.test.ts
 *
 * Regression guard: the Paystack webhook must AWAIT invitation delivery.
 *
 * THE BUG THIS PROTECTS AGAINST
 * -----------------------------
 * The webhook used to dispatch the invitation email/WhatsApp fire-and-forget:
 *
 *     sendInvitationEmail({ ... }).catch(e => Sentry.captureException(e))
 *     return NextResponse.json({ received: true })
 *
 * On Vercel, returning the response freezes the function instance, so the
 * in-flight promise was killed before Resend ever received the request. Paying
 * guests therefore never got their pass, while the free registration path —
 * which awaits (app/actions/registrations.ts:228) — worked fine. The only error
 * channel was Sentry, which was unconfigured, so it failed silently in
 * production for weeks.
 *
 * A type checker cannot catch a missing `await`, so these tests assert the
 * observable consequence instead: by the time POST() resolves, the send must
 * have RUN TO COMPLETION. If someone drops the `await` again, the flag is still
 * false when the response is returned and these fail.
 *
 * All I/O is mocked — no network, no DB, no real Resend call.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/paystack', () => ({ verifyPaystackSignature: vi.fn(() => true) }))
vi.mock('@/lib/email', () => ({ sendInvitationEmail: vi.fn() }))
vi.mock('@/lib/whatsapp', () => ({ sendInvitationWhatsApp: vi.fn() }))
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { sendInvitationEmail } from '@/lib/email'
import { sendInvitationWhatsApp } from '@/lib/whatsapp'
import { POST } from '@/app/api/webhooks/paystack/route'

const mockCreateAdminClient = createAdminClient as ReturnType<typeof vi.fn>
const mockSendEmail = sendInvitationEmail as ReturnType<typeof vi.fn>
const mockSendWhatsApp = sendInvitationWhatsApp as ReturnType<typeof vi.fn>

const REFERENCE     = 'CRN-ABCD1234-1700000000-AB12'
const EVENT_ID      = 'event-1'
const ATTENDEE_ID   = 'attendee-1'
const INVITATION_ID = 'invitation-1'

const EVENT    = { name: 'Founders Dinner', date: '2026-08-01', time: '19:00', venue: 'Lagos', description: null, banner_url: null }
const ATTENDEE = { name: 'Alice Doe', email: 'alice@example.com', phone: '+2348012345678' }

/** Minimal admin-client double covering the charge.success happy path. */
function mockAdminClient(outcome: 'created' | 'updated' = 'created') {
  const chain = (row: unknown) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: row, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
  })

  const rpc = vi.fn().mockResolvedValue({
    data: {
      outcome,
      invitation_id: INVITATION_ID,
      attendee_id: ATTENDEE_ID,
      event_id: EVENT_ID,
    },
    error: null,
  })

  const from = vi.fn((table: string) => {
    if (table === 'events') return chain(EVENT)
    if (table === 'attendees') return chain(ATTENDEE)
    return chain(null) // webhook_events, email_logs, invitations …
  })

  mockCreateAdminClient.mockReturnValue({ from, rpc })
  return { from, rpc }
}

function chargeSuccessRequest(): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/paystack', {
    method: 'POST',
    body: JSON.stringify({
      event: 'charge.success',
      data: {
        id: 987654,
        reference: REFERENCE,
        amount: 500000,
        channel: 'card',
        paid_at: '2026-07-30T12:00:00Z',
        status: 'success',
        currency: 'NGN',
        customer: { id: 1, email: ATTENDEE.email, first_name: 'Alice', last_name: 'Doe' },
      },
    }),
    headers: {
      'content-type': 'application/json',
      'x-paystack-signature': 'stubbed-verified-by-mock',
    },
  })
}

describe('POST /api/webhooks/paystack — invitation delivery is awaited', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not respond until the invitation email has fully sent', async () => {
    mockAdminClient()

    // Resolves on a later tick. If the route forgets to await, the response
    // returns while this is still pending and the flag is still false.
    let emailCompleted = false
    mockSendEmail.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      emailCompleted = true
      return { success: true }
    })
    mockSendWhatsApp.mockResolvedValue({ success: true })

    const res = await POST(chargeSuccessRequest())

    expect(res.status).toBe(200)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(emailCompleted).toBe(true) // ← fails if the await is dropped
  })

  it('does not respond until the WhatsApp invitation has fully sent', async () => {
    mockAdminClient()

    let whatsappCompleted = false
    mockSendEmail.mockResolvedValue({ success: true })
    mockSendWhatsApp.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      whatsappCompleted = true
      return { success: true }
    })

    await POST(chargeSuccessRequest())

    expect(mockSendWhatsApp).toHaveBeenCalledTimes(1)
    expect(whatsappCompleted).toBe(true)
  })

  it('sends to the attendee resolved from the RPC result', async () => {
    mockAdminClient()
    mockSendEmail.mockResolvedValue({ success: true })
    mockSendWhatsApp.mockResolvedValue({ success: true })

    await POST(chargeSuccessRequest())

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: EVENT_ID,
        recipientEmail: ATTENDEE.email,
        invitationId: INVITATION_ID,
      })
    )
  })

  it('still acknowledges with 200 when the email send throws', async () => {
    mockAdminClient()

    // Delivery failure must stay non-fatal: the payment is already recorded, and
    // Paystack must not be told to retry a charge that processed correctly.
    mockSendEmail.mockRejectedValue(new Error('Resend is down'))
    mockSendWhatsApp.mockResolvedValue({ success: true })

    const res = await POST(chargeSuccessRequest())

    expect(res.status).toBe(200)
    expect(mockSendWhatsApp).toHaveBeenCalledTimes(1) // email failure must not skip WhatsApp
  })

  it('awaits delivery on the already_processed retry path too', async () => {
    // Paystack retried after the RPC had already committed. The invitation exists
    // but the email may never have gone out, so this path re-sends — and must
    // await, for the same reason.
    const chain = (row: unknown) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })

    const from = vi.fn((table: string) => {
      if (table === 'events') return chain(EVENT)
      if (table === 'attendees') return chain(ATTENDEE)
      if (table === 'invitations') return chain({ id: INVITATION_ID })
      if (table === 'email_logs') return chain(null) // no prior send logged
      return chain(null)
    })

    mockCreateAdminClient.mockReturnValue({
      from,
      rpc: vi.fn().mockResolvedValue({
        data: { outcome: 'already_processed', attendee_id: ATTENDEE_ID, event_id: EVENT_ID },
        error: null,
      }),
    })

    let emailCompleted = false
    mockSendEmail.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      emailCompleted = true
      return { success: true }
    })
    mockSendWhatsApp.mockResolvedValue({ success: true })

    const res = await POST(chargeSuccessRequest())

    expect(res.status).toBe(200)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(emailCompleted).toBe(true)
  })
})
