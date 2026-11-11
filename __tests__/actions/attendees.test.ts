/**
 * __tests__/actions/attendees.test.ts
 *
 * Integration tests for attendee server actions.
 * All Supabase calls are mocked at file scope (no resetModules).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'

// ── Mock declarations ──────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/email', () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('@/lib/whatsapp', () => ({
  sendInvitationWhatsApp: vi.fn().mockResolvedValue({ success: true }),
}))

// Import actions AFTER mocks are registered
import {
  addAttendee,
  addMultipleAttendees,
  cancelAttendeeInvitation,
  updateAttendeeTicketTier,
  resendAttendeePass,
} from '@/app/actions/attendees'
import { sendInvitationEmail } from '@/lib/email'
import { __resetRateLimitStoreForTests } from '@/lib/rate-limit'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  return fd
}

const mockCreateClient = createClient as ReturnType<typeof vi.fn>
const mockSendEmail = sendInvitationEmail as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  __resetRateLimitStoreForTests()
  // Restore default email mock after each test
  mockSendEmail.mockResolvedValue({ success: true })
})

// ── addAttendee ────────────────────────────────────────────────────────────

describe('addAttendee', () => {
  it('returns { error } when attendee insert fails', async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'attendees') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
        }
      }),
    })

    const fd = makeFormData({ name: 'Alice', email: 'alice@x.com', party_size: '1' })
    const result = await addAttendee('event-1', fd)
    expect(result).toEqual({ error: 'Insert failed' })
  })

  it('returns { success } when attendee and invitation are created successfully', async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'attendees') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'att-1' }, error: null }),
          }
        }
        if (table === 'invitations') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'inv-1' }, error: null }),
          }
        }
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { name: 'Test', date: '2025-01-01', time: null, venue: 'Lagos', description: null, banner_url: null },
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
        }
      }),
    })

    const fd = makeFormData({ name: 'Alice', email: 'alice@x.com', party_size: '1' })
    const result = await addAttendee('event-1', fd)
    expect(result).toMatchObject({ success: true })
  })

  it('returns { success, warning } when email send fails', async () => {
    mockSendEmail.mockResolvedValueOnce({ error: 'SMTP down' })

    mockCreateClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'attendees') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'att-1' }, error: null }),
          }
        }
        if (table === 'invitations') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'inv-1' }, error: null }),
          }
        }
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { name: 'Test', date: '2025-01-01', time: null, venue: 'Lagos', description: null, banner_url: null },
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
        }
      }),
    })

    const fd = makeFormData({ name: 'Bob', email: 'bob@x.com', party_size: '1' })
    const result = await addAttendee('event-1', fd)
    expect(result).toMatchObject({ success: true, warning: expect.stringContaining('Email failed') })
  })
})

// ── addMultipleAttendees ────────────────────────────────────────────────────

describe('addMultipleAttendees', () => {
  it('returns { error } when no valid emails are provided', async () => {
    mockCreateClient.mockResolvedValue({ from: vi.fn() })

    const result = await addMultipleAttendees('event-1', 'not-an-email, also-bad', 1)
    expect(result).toMatchObject({ error: expect.stringContaining('No valid email addresses') })
  })

  it('returns { success, count } for valid emails', async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { name: 'T', date: '2025-01-01', time: null, venue: 'V', description: null, banner_url: null },
              error: null,
            }),
          }
        }
        if (table === 'attendees') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'att-x' }, error: null }),
          }
        }
        if (table === 'invitations') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'inv-x' }, error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
        }
      }),
    })

    const result = await addMultipleAttendees('event-1', 'alice@x.com\nbob@x.com', 1)
    expect(result).toMatchObject({ success: true, count: 2 })
  })
})

// ── cancelAttendeeInvitation ────────────────────────────────────────────────

describe('cancelAttendeeInvitation', () => {
  it('returns { success } on successful cancel', async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => {
        const eqMock = vi.fn().mockResolvedValue({ error: null })
        return { update: vi.fn().mockReturnValue({ eq: eqMock }) }
      }),
    })

    const result = await cancelAttendeeInvitation('att-1', 'event-1')
    expect(result).toEqual({ success: true })
  })

  it('returns { error } when the DB update fails', async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => {
        const eqMock = vi.fn().mockResolvedValue({ error: { message: 'Update failed' } })
        return { update: vi.fn().mockReturnValue({ eq: eqMock }) }
      }),
    })

    const result = await cancelAttendeeInvitation('att-1', 'event-1')
    expect(result).toEqual({ error: 'Update failed' })
  })
})

// ── updateAttendeeTicketTier ────────────────────────────────────────────────

describe('updateAttendeeTicketTier', () => {
  it('returns { success } on a valid tier update', async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => {
        const eqMock = vi.fn().mockResolvedValue({ error: null })
        return { update: vi.fn().mockReturnValue({ eq: eqMock }) }
      }),
    })

    const result = await updateAttendeeTicketTier('att-1', 'event-1', 'tier-1')
    expect(result).toEqual({ success: true })
  })

  it('returns a user-friendly error when tier capacity is exceeded', async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => {
        const eqMock = vi.fn().mockResolvedValue({ error: { message: 'tier_capacity_exceeded' } })
        return { update: vi.fn().mockReturnValue({ eq: eqMock }) }
      }),
    })

    const result = await updateAttendeeTicketTier('att-1', 'event-1', 'tier-1')
    expect(result).toEqual({ error: 'Capacity exceeded for this ticket tier.' })
  })
})

// ── resendAttendeePass ──────────────────────────────────────────────────────

describe('resendAttendeePass', () => {
  it('resends pass via email for an active invitation', async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'attendees') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'att-1',
                name: 'Alice',
                email: 'alice@x.com',
                phone: null,
                party_size: 2,
                ticket_tier_id: null,
              },
              error: null,
            }),
          }
        }
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { name: 'Gala', date: '2026-12-01', time: '18:00', venue: 'Lagos', description: null, banner_url: null },
              error: null,
            }),
          }
        }
        if (table === 'invitations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'inv-1', status: 'active' },
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

    const result = await resendAttendeePass('att-1', 'event-1')
    expect(result).toEqual({ success: true })
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
  })

  it('returns { error } when guest has a cancelled invitation', async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'attendees') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'att-1',
                name: 'Alice',
                email: 'alice@x.com',
                phone: null,
                party_size: 1,
                ticket_tier_id: null,
              },
              error: null,
            }),
          }
        }
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { name: 'Gala', date: '2026-12-01', time: '18:00', venue: 'Lagos', description: null, banner_url: null },
              error: null,
            }),
          }
        }
        if (table === 'invitations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'inv-1', status: 'cancelled' },
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

    const result = await resendAttendeePass('att-1', 'event-1')
    expect(result).toEqual({ error: 'Cannot resend pass for a cancelled invitation.' })
  })

  it('deduplicates rapid consecutive calls for the same attendee (idempotency guard)', async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'attendees') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'att-1', name: 'Alice', email: 'alice@x.com', phone: null, party_size: 1 },
              error: null,
            }),
          }
        }
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { name: 'Gala', date: '2026-12-01', time: '18:00', venue: 'Lagos' },
              error: null,
            }),
          }
        }
        if (table === 'invitations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'inv-1', status: 'active' },
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

    const first = await resendAttendeePass('att-1', 'event-1')
    expect(first).toEqual({ success: true })
    expect(mockSendEmail).toHaveBeenCalledTimes(1)

    // Immediate second call triggers debounce guard without sending duplicate email
    const second = await resendAttendeePass('att-1', 'event-1')
    expect(second).toEqual({
      success: true,
      warning: 'A pass was just sent to this guest. Please wait 15 seconds before requesting another.',
    })
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
  })
})
