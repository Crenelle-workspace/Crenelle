import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GET } from '@/app/api/events/[id]/registrations/export/route'

const mockCreateClient = createClient as ReturnType<typeof vi.fn>
const mockCreateAdminClient = createAdminClient as ReturnType<typeof vi.fn>

describe('GET /api/events/[id]/registrations/export', () => {
  const eventId = 'evt-test-123'
  const userId = 'user-organizer-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when the user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('No session') }),
      },
      rpc: vi.fn(),
    })

    const req = new NextRequest(`http://localhost:3000/api/events/${eventId}/registrations/export`)
    const res = await GET(req, { params: Promise.resolve({ id: eventId }) })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 403 when the user is neither the organizer nor a team member', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'other-user' } }, error: null }),
      },
      rpc: vi.fn(),
    })

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: eventId, organizer_id: userId, name: 'Exclusive Gala' },
              error: null,
            }),
          }
        }
        if (table === 'event_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      }),
      rpc: vi.fn(),
    })

    const req = new NextRequest(`http://localhost:3000/api/events/${eventId}/registrations/export`)
    const res = await GET(req, { params: Promise.resolve({ id: eventId }) })
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Forbidden')
  })

  it('returns CSV with UTF-8 BOM, standard fields, and custom questions', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
      },
      rpc: vi.fn(),
    })

    const mockQuestions = [
      { id: 'q1', label: 'Dietary Requirements', type: 'radio', sort_order: 1 },
      { id: 'q2', label: 'Company Name', type: 'text', sort_order: 2 },
      { id: 'q3', label: 'Interests', type: 'checkbox', sort_order: 3 },
    ]

    const mockAttendees = [
      {
        id: 'att-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+2348011112222',
        registration_status: 'accepted',
        created_at: '2026-08-20T12:00:00Z',
        ticket_tier_id: 'tier-vip',
      },
      {
        id: 'att-2',
        name: 'Bob Smith, Jr.',
        email: 'bob@example.com',
        phone: null,
        registration_status: 'pending',
        created_at: '2026-08-21T15:30:00Z',
        ticket_tier_id: null,
      },
    ]

    const mockTiers = [
      { id: 'tier-vip', name: 'VIP Access', price: 500000, currency: 'NGN' },
    ]

    const mockPayments = [
      { attendee_id: 'att-1', status: 'paid', created_at: '2026-08-20T12:05:00Z' },
    ]

    const mockAnswers = [
      {
        attendee_id: 'att-1',
        answers: {
          q1: 'Vegan',
          q2: 'Acme Corp',
          q3: ['AI', 'Web3'],
        },
      },
      {
        attendee_id: 'att-2',
        answers: {
          q1: 'None',
          q2: 'Design Studio',
        },
      },
    ]

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: eventId,
                organizer_id: userId,
                name: 'Tech Summit 2026',
                registration_questions: mockQuestions,
                date: '2026-09-15',
                timezone: 'Africa/Lagos',
              },
              error: null,
            }),
          }
        }
        if (table === 'attendees') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockAttendees, error: null }),
          }
        }
        if (table === 'ticket_tiers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: mockTiers, error: null }),
          }
        }
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: mockPayments, error: null }),
          }
        }
        if (table === 'registration_answers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: mockAnswers, error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      }),
      rpc: vi.fn(),
    })

    const req = new NextRequest(`http://localhost:3000/api/events/${eventId}/registrations/export?format=csv`)
    const res = await GET(req, { params: Promise.resolve({ id: eventId }) })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/csv')
    expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="tech-summit-2026-registrations-')

    const buffer = await res.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    // Verify UTF-8 BOM (0xEF, 0xBB, 0xBF) is present in the raw binary output
    expect(bytes[0]).toBe(0xef)
    expect(bytes[1]).toBe(0xbb)
    expect(bytes[2]).toBe(0xbf)

    const text = new TextDecoder('utf-8').decode(buffer)

    // Verify headers
    expect(text).toContain('Full Name,Email,Phone,Status,Ticket Tier,Payment Status,Registered At,Dietary Requirements,Company Name,Interests')

    // Verify Row 1
    expect(text).toContain('Jane Doe,jane@example.com,+2348011112222,ACCEPTED,VIP Access,Paid,2026-08-20 12:00:00,Vegan,Acme Corp,AI; Web3')

    // Verify Row 2 (Name with comma is quoted, empty checkbox is empty)
    expect(text).toContain('"Bob Smith, Jr.",bob@example.com,,PENDING,Free / Standard,Free,2026-08-21 15:30:00,None,Design Studio,')
  })

  it('returns Excel (XML) format when format=xlsx or format=excel is requested', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
      },
      rpc: vi.fn(),
    })

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: eventId,
                organizer_id: userId,
                name: 'Innovators & Founders',
                registration_questions: [{ id: 'q1', label: 'Company <Role>', type: 'text', sort_order: 1 }],
                date: '2026-09-15',
                timezone: 'Africa/Lagos',
              },
              error: null,
            }),
          }
        }
        if (table === 'attendees') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'att-1',
                  name: 'Sam & Partner',
                  email: 'sam@example.com',
                  phone: null,
                  registration_status: 'accepted',
                  created_at: '2026-08-20T12:00:00Z',
                  ticket_tier_id: null,
                },
              ],
              error: null,
            }),
          }
        }
        if (table === 'ticket_tiers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === 'registration_answers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{ attendee_id: 'att-1', answers: { q1: 'CTO & Co-Founder' } }],
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      }),
      rpc: vi.fn(),
    })

    const req = new NextRequest(`http://localhost:3000/api/events/${eventId}/registrations/export?format=xlsx`)
    const res = await GET(req, { params: Promise.resolve({ id: eventId }) })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/vnd.ms-excel')
    expect(res.headers.get('Content-Disposition')).toContain('.xls')

    const xml = await res.text()
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<Workbook')
    expect(xml).toContain('<Worksheet ss:Name="Registrations">')
    // XML escaping checks
    expect(xml).toContain('Innovators &amp; Founders')
    expect(xml).toContain('Company &lt;Role&gt;')
    expect(xml).toContain('Sam &amp; Partner')
    expect(xml).toContain('CTO &amp; Co-Founder')
  })
})
