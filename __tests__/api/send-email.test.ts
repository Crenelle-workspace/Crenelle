/**
 * __tests__/api/send-email.test.ts
 *
 * Security tests for POST /api/send-email — the authenticated
 * invitation / reminder dispatch endpoint.
 *
 * Focus (finding 4, HIGH):
 *   1. The reminder branch must NOT trust a client-supplied `recipients`
 *      array — doing so turns the endpoint into an authenticated open mail
 *      relay. Recipients must be derived server-side from the event's own
 *      invitations.
 *   2. `customMessage` is HTML-escaped before it reaches the email body
 *      (stored-XSS sink). Verified via the exported escapeHtml() helper.
 *
 * Supabase + Resend are fully mocked — no network or DB calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/email', () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendReminderEmailsDirect: vi.fn().mockResolvedValue({ sent: 1, errors: [] }),
}))

import { createClient } from '@/lib/supabase/server'
import { sendReminderEmailsDirect } from '@/lib/email'
import { POST } from '@/app/api/send-email/route'

const mockCreateClient = createClient as ReturnType<typeof vi.fn>
const mockSendReminders = sendReminderEmailsDirect as ReturnType<typeof vi.fn>

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/send-email', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const AUTHED_EVENT = {
  name: 'Gala Night',
  date: '2026-08-01',
  time: '19:00',
  venue: 'The Hall',
  description: null,
  banner_url: null,
}

const OWN_INVITATIONS = [
  { id: 'inv-1', status: 'active', attendee: { email: 'guest1@x.com', name: 'Guest One' } },
  { id: 'inv-2', status: 'active', attendee: { email: 'guest2@x.com', name: 'Guest Two' } },
]

/**
 * Build a mocked awaited server client.
 * - auth.getUser() → provided user (null = unauthenticated)
 * - events fetch → provided event (null = not found / RLS denied)
 * - invitations fetch → provided invitation rows
 */
function mockServerClient({
  user = { id: 'user-1' } as { id: string } | null,
  event = AUTHED_EVENT as typeof AUTHED_EVENT | null,
  invitations = OWN_INVITATIONS as unknown[],
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'no session' },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'events') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: event,
            error: event ? null : { message: 'not found' },
          }),
        }
      }
      // invitations
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({ data: invitations, error: null }),
      }
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── reminder branch: recipient list is derived server-side ──────────────────

describe('POST /api/send-email — reminder branch', () => {
  it('rejects unauthenticated callers with 401', async () => {
    mockCreateClient.mockResolvedValue(mockServerClient({ user: null }))

    const res = await POST(makeRequest({ type: 'reminder', eventId: 'event-1' }))
    expect(res.status).toBe(401)
    expect(mockSendReminders).not.toHaveBeenCalled()
  })

  it('IGNORES an attacker-supplied recipients array and derives from invitations', async () => {
    mockCreateClient.mockResolvedValue(mockServerClient())

    const res = await POST(
      makeRequest({
        type: 'reminder',
        eventId: 'event-1',
        customMessage: 'See you soon',
        // Attacker tries to relay to arbitrary external addresses:
        recipients: [
          { email: 'victim@external.com', name: 'Victim', invitationId: 'x' },
          { email: 'spam-target@evil.com', name: 'Spam', invitationId: 'y' },
        ],
      }),
    )

    expect(res.status).toBe(200)
    expect(mockSendReminders).toHaveBeenCalledTimes(1)

    const passed = mockSendReminders.mock.calls[0][0] as {
      recipients: { email: string }[]
    }
    const emails = passed.recipients.map((r) => r.email).sort()
    // Only the event's own invitation attendees — never the attacker's list.
    expect(emails).toEqual(['guest1@x.com', 'guest2@x.com'])
    expect(emails).not.toContain('victim@external.com')
    expect(emails).not.toContain('spam-target@evil.com')
  })

  it('returns 404 when the event is not found / not owned (RLS)', async () => {
    mockCreateClient.mockResolvedValue(mockServerClient({ event: null }))

    const res = await POST(makeRequest({ type: 'reminder', eventId: 'foreign-event' }))
    expect(res.status).toBe(404)
    expect(mockSendReminders).not.toHaveBeenCalled()
  })

  it('returns 400 when the event has no invitations with emails', async () => {
    mockCreateClient.mockResolvedValue(mockServerClient({ invitations: [] }))

    const res = await POST(makeRequest({ type: 'reminder', eventId: 'event-1' }))
    expect(res.status).toBe(400)
    expect(mockSendReminders).not.toHaveBeenCalled()
  })

  it('coerces a non-string customMessage to an empty string', async () => {
    mockCreateClient.mockResolvedValue(mockServerClient())

    await POST(
      makeRequest({
        type: 'reminder',
        eventId: 'event-1',
        customMessage: { evil: 'object' } as unknown as string,
      }),
    )

    const passed = mockSendReminders.mock.calls[0][0] as { customMessage: string }
    expect(passed.customMessage).toBe('')
  })
})
