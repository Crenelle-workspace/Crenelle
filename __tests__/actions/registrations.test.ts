/**
 * __tests__/actions/registrations.test.ts
 *
 * Integration tests for the public registration server actions.
 * Supabase clients are fully mocked — no real DB calls are made.
 *
 * Strategy: vi.mock() at file level keeps the mock factory registered.
 * Each test re-assigns the mock return value to control per-test behaviour.
 * No vi.resetModules() is used (it breaks vi.mock registration).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { __resetRateLimitStoreForTests } from '@/lib/rate-limit'

// ── Mock declarations (at file scope) ─────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/email', () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendReminderEmailsDirect: vi.fn().mockResolvedValue({ sent: 1, errors: [] }),
}))
vi.mock('@/lib/whatsapp', () => ({
  sendInvitationWhatsApp: vi.fn().mockResolvedValue({ success: true }),
}))

// Import actions AFTER mocks are registered so they pick up mocked modules
import {
  submitRegistration,
  acceptRegistration,
  rejectRegistration,
  promoteFromWaitlist,
} from '@/app/actions/registrations'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  return fd
}

// Use unique emails per test to prevent in-memory rate-limit state from bleeding between tests.
let emailCounter = 0
function uniqueEmail() {
  emailCounter++
  return `test-${emailCounter}-${Date.now()}@x.com`
}

const mockCreateAdminClient = createAdminClient as ReturnType<typeof vi.fn>
const mockCreateClient = createClient as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  __resetRateLimitStoreForTests()
})

// ── submitRegistration ─────────────────────────────────────────────────────

describe('submitRegistration', () => {
  it('returns { error } when the event is not found', async () => {
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }),
    })

    const fd = makeFormData({ email: uniqueEmail(), full_name: 'Test User' })
    const result = await submitRegistration('event-1', fd)
    expect(result).toEqual({ error: 'Event not found' })
  })

  it('returns { error } for a draft event', async () => {
    const mockEvent = { id: 'event-1', event_type: 'open', status: 'draft', max_registrations: null }
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
        not: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })

    const fd = makeFormData({ email: uniqueEmail(), full_name: 'Test User' })
    const result = await submitRegistration('event-1', fd)
    expect(result).toEqual({ error: 'Registration is not yet open for this event' })
  })

  it('returns { error } for an ended event', async () => {
    const mockEvent = { id: 'event-1', event_type: 'open', status: 'ended', max_registrations: null }
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
      }),
    })

    const fd = makeFormData({ email: uniqueEmail(), full_name: 'Test User' })
    const result = await submitRegistration('event-1', fd)
    expect(result).toEqual({ error: 'This event has ended' })
  })

  it('returns { error } for a closed (non-open) event', async () => {
    const mockEvent = { id: 'event-1', event_type: 'closed', status: 'published', max_registrations: null }
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
      }),
    })

    const fd = makeFormData({ email: uniqueEmail(), full_name: 'Test User' })
    const result = await submitRegistration('event-1', fd)
    expect(result).toEqual({ error: 'This event does not accept public registrations' })
  })

  // ── input validation (finding 9) ─────────────────────────────────────────
  //
  // email format + length caps are enforced BEFORE the email is used as a
  // rate-limit key or reaches the DB. These cases fail fast, so no `from`
  // mock is needed — an unexpected DB call would throw and fail the test.

  it('returns { error } when name and email are empty', async () => {
    const fd = makeFormData({ email: '', full_name: '' })
    const result = await submitRegistration('event-1', fd)
    // name is validated first → its min-length message surfaces
    expect(result).toEqual({ error: 'Name must be at least 2 characters' })
  })

  it('returns { error } for a malformed email address', async () => {
    const fd = makeFormData({ email: 'not-an-email', full_name: 'Valid Name' })
    const result = await submitRegistration('event-1', fd)
    expect(result).toEqual({ error: 'Please enter a valid email address' })
  })

  it('returns { error } for a single-character name', async () => {
    const fd = makeFormData({ email: uniqueEmail(), full_name: 'A' })
    const result = await submitRegistration('event-1', fd)
    expect(result).toEqual({ error: 'Name must be at least 2 characters' })
  })

  it('returns { error } when the name exceeds 120 characters', async () => {
    const fd = makeFormData({ email: uniqueEmail(), full_name: 'A'.repeat(121) })
    const result = await submitRegistration('event-1', fd)
    expect(result).toEqual({ error: 'Name is too long (max 120 characters)' })
  })

  it('returns { error } when the email exceeds 254 characters', async () => {
    // Syntactically valid local part but over the length cap.
    const longEmail = `${'a'.repeat(250)}@x.com`
    const fd = makeFormData({ email: longEmail, full_name: 'Valid Name' })
    const result = await submitRegistration('event-1', fd)
    expect(result).toEqual({ error: 'Email is too long' })
  })

  it('returns { error } when the phone exceeds 30 characters', async () => {
    const fd = makeFormData({ email: uniqueEmail(), full_name: 'Valid Name', phone: '1'.repeat(31) })
    const result = await submitRegistration('event-1', fd)
    expect(result).toEqual({ error: 'Phone number is too long' })
  })

  it('normalises email to lowercase before it reaches the DB', async () => {
    let insertedEmail: unknown = 'UNSET'
    mockCreateAdminClient.mockReturnValue(
      mockClientWithTier(null, (payload) => {
        insertedEmail = payload.email
      }),
    )

    const fd = makeFormData({ email: 'MixedCase@X.COM', full_name: 'Case User' })
    const result = await submitRegistration('event-1', fd)
    expect(result).toEqual({ success: true, waitlisted: false })
    expect(insertedEmail).toBe('mixedcase@x.com')
  })

  it('returns { error } on duplicate insert (code 23505)', async () => {
    const mockEvent = { id: 'event-1', event_type: 'open', status: 'published', max_registrations: null }
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
          }
        }
        if (table === 'email_unsubscribes') {
          return {
            select: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        // attendees insert — duplicate error
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          count: 0,
          insert: vi.fn().mockResolvedValue({ error: { message: 'duplicate', code: '23505' } }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    })

    const fd = makeFormData({ email: 'dup@x.com', full_name: 'Dup User' })
    const result = await submitRegistration('event-1', fd)
    expect(result).toEqual({ error: 'You have already registered for this event with this email' })
  })

  // ── ticket-tier validation (paid-for-free / tier IDOR guard) ──────────────

  /**
   * Build an admin-client mock for the "open, published, no-cap" happy path
   * where the only variable is what the ticket_tiers lookup returns.
   * `tier` is the row returned by the ticket_tiers .maybeSingle().
   * `onInsert` lets a test assert on the payload passed to attendees.insert().
   */
  function mockClientWithTier(
    tier: { id: string; price: number; is_public: boolean; deleted_at: string | null } | null,
    onInsert?: (payload: Record<string, unknown>) => void,
  ) {
    const mockEvent = { id: 'event-1', event_type: 'open', status: 'published', max_registrations: null }
    return {
      from: vi.fn((table: string) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
          }
        }
        if (table === 'email_unsubscribes') {
          return {
            select: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'ticket_tiers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: tier, error: null }),
          }
        }
        // attendees
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          count: 0,
          insert: vi.fn((payload: Record<string, unknown>) => {
            onInsert?.(payload)
            return Promise.resolve({ error: null })
          }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    }
  }

  it('rejects a PAID tier submitted through the (free) registration path', async () => {
    mockCreateAdminClient.mockReturnValue(
      mockClientWithTier({ id: 'tier-paid', price: 500000, is_public: true, deleted_at: null }),
    )

    const fd = makeFormData({ email: uniqueEmail(), full_name: 'Freeloader', ticket_tier_id: 'tier-paid' })
    const result = await submitRegistration('event-1', fd)
    expect(result).toEqual({
      error: 'This ticket tier requires payment. Please complete checkout to register.',
    })
  })

  it('rejects a tier id that does not belong to the event (IDOR)', async () => {
    // Query is scoped by .eq('event_id', eventId) so a foreign tier returns null.
    mockCreateAdminClient.mockReturnValue(mockClientWithTier(null))

    const fd = makeFormData({ email: uniqueEmail(), full_name: 'IDOR User', ticket_tier_id: 'tier-other-event' })
    const result = await submitRegistration('event-1', fd)
    expect(result).toEqual({ error: 'Selected ticket tier is not available' })
  })

  it('rejects a private or soft-deleted tier', async () => {
    mockCreateAdminClient.mockReturnValue(
      mockClientWithTier({ id: 'tier-hidden', price: 0, is_public: false, deleted_at: null }),
    )

    const fd = makeFormData({ email: uniqueEmail(), full_name: 'Sneaky User', ticket_tier_id: 'tier-hidden' })
    const result = await submitRegistration('event-1', fd)
    expect(result).toEqual({ error: 'Selected ticket tier is not available' })
  })

  it('accepts a valid free tier and persists its id', async () => {
    let insertedTierId: unknown = 'UNSET'
    mockCreateAdminClient.mockReturnValue(
      mockClientWithTier({ id: 'tier-free', price: 0, is_public: true, deleted_at: null }, (payload) => {
        insertedTierId = payload.ticket_tier_id
      }),
    )

    const fd = makeFormData({ email: uniqueEmail(), full_name: 'Valid User', ticket_tier_id: 'tier-free' })
    const result = await submitRegistration('event-1', fd)
    expect(result).toEqual({ success: true, waitlisted: false })
    expect(insertedTierId).toBe('tier-free')
  })

  it('returns { error } for unsubscribed/suppressed emails', async () => {
    const mockEvent = { id: 'event-1', event_type: 'open', status: 'published', max_registrations: null }
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
          }
        }
        if (table === 'email_unsubscribes') {
          return {
            select: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'unsub-1' }, error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          count: 0,
        }
      }),
    })

    const fd = makeFormData({ email: 'unsub@x.com', full_name: 'Unsub User' })
    const result = await submitRegistration('event-1', fd)
    expect(result).toEqual({
      error: 'This email address has unsubscribed or experienced delivery issues. Please contact support or the organizer to resubscribe.',
    })
  })
})

// ── acceptRegistration ─────────────────────────────────────────────────────

describe('acceptRegistration', () => {
  it('returns { error: "Already accepted" } for already-accepted attendees', async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'attendees') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'att-1', registration_status: 'accepted', email: 'a@x.com', name: 'A', phone: null, ticket_tier_id: null },
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    })

    const result = await acceptRegistration('att-1', 'event-1')
    expect(result).toEqual({ error: 'Already accepted' })
  })

  it('returns { error } when attendee is not found', async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      })),
    })

    const result = await acceptRegistration('missing-att', 'event-1')
    expect(result).toEqual({ error: 'Registrant not found' })
  })
})

// ── rejectRegistration ─────────────────────────────────────────────────────

describe('rejectRegistration', () => {
  it('returns { success } on successful rejection', async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'attendees') {
          // .update({}).eq() terminates — resolve with no error
          const eqMock = vi.fn().mockResolvedValue({ error: null })
          return { update: vi.fn().mockReturnValue({ eq: eqMock }) }
        }
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { max_registrations: null }, error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    })

    const result = await rejectRegistration('att-1', 'event-1')
    expect(result).toEqual({ success: true })
  })

  it('returns { error } when DB update fails', async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => {
        const eqMock = vi.fn().mockResolvedValue({ error: { message: 'DB error' } })
        return { update: vi.fn().mockReturnValue({ eq: eqMock }) }
      }),
    })

    const result = await rejectRegistration('att-1', 'event-1')
    expect(result).toEqual({ error: 'DB error' })
  })
})

// ── promoteFromWaitlist ─────────────────────────────────────────────────────

describe('promoteFromWaitlist', () => {
  it('returns { error } when event is at capacity', async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { max_registrations: 10 }, error: null }),
          }
        }
        // attendees count query — returns count=10 meaning at cap
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          count: 10,
        }
      }),
    })

    const result = await promoteFromWaitlist('att-1', 'event-1')
    expect(result).toEqual({ error: expect.stringContaining('No capacity') })
  })
})
