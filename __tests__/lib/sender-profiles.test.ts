/**
 * __tests__/lib/sender-profiles.test.ts
 *
 * Tests for sender profile resolution, RFC 5322 header formatting,
 * and event update sender profile preservation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatFromHeader, fetchOrganizerForEvent } from '@/lib/email'

// Mock Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'

const mockCreateAdminClient = createAdminClient as ReturnType<typeof vi.fn>

describe('Sender Profile & Email Identity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formatFromHeader', () => {
    it('formats a clean display name with double quotes', () => {
      const header = formatFromHeader('Acme Events')
      expect(header).toMatch(/^"Acme Events" <.+>$/)
    })

    it('sanitizes double quotes and newlines from display name', () => {
      const header = formatFromHeader('Acme "Tech" \n Events')
      expect(header).not.toContain('"Tech"')
      expect(header).not.toContain('\n')
      expect(header).toMatch(/^"Acme Tech Events" <.+>$/)
    })

    it('handles special characters and commas safely', () => {
      const header = formatFromHeader('Acme, Inc. & Co.')
      expect(header).toMatch(/^"Acme, Inc. & Co." <.+>$/)
    })

    it('falls back to Crenelle when empty string is provided', () => {
      const header = formatFromHeader('   ')
      expect(header).toMatch(/^"Crenelle" <.+>$/)
    })
  })

  describe('fetchOrganizerForEvent', () => {
    it('returns explicit linked sender profile when profile is an object (Tier 1)', async () => {
      mockCreateAdminClient.mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'events') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  organizer_id: 'org-1',
                  sender_profile_id: 'prof-1',
                  sender_profiles: {
                    display_name: 'Custom Brand',
                    reply_to: 'custom@brand.com',
                  },
                },
                error: null,
              }),
            }
          }
          return {}
        }),
      })

      const details = await fetchOrganizerForEvent('event-1')
      expect(details).toEqual({ name: 'Custom Brand', email: 'custom@brand.com' })
    })

    it('returns explicit linked sender profile when PostgREST returns profile as an array (Tier 1 array fix)', async () => {
      mockCreateAdminClient.mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'events') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  organizer_id: 'org-1',
                  sender_profile_id: 'prof-1',
                  sender_profiles: [
                    {
                      display_name: 'Array Brand',
                      reply_to: 'array@brand.com',
                    },
                  ],
                },
                error: null,
              }),
            }
          }
          return {}
        }),
      })

      const details = await fetchOrganizerForEvent('event-1')
      expect(details).toEqual({ name: 'Array Brand', email: 'array@brand.com' })
    })

    it('falls back to default sender profile when event has no explicit profile (Tier 2)', async () => {
      mockCreateAdminClient.mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'events') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  organizer_id: 'org-1',
                  sender_profile_id: null,
                  sender_profiles: null,
                },
                error: null,
              }),
            }
          }
          if (table === 'sender_profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  display_name: 'Default Brand',
                  reply_to: 'default@brand.com',
                },
                error: null,
              }),
            }
          }
          return {}
        }),
      })

      const details = await fetchOrganizerForEvent('event-1')
      expect(details).toEqual({ name: 'Default Brand', email: 'default@brand.com' })
    })

    it('falls back to organizer_settings org_name when no sender profiles exist (Tier 3)', async () => {
      mockCreateAdminClient.mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'events') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  organizer_id: 'org-1',
                  sender_profile_id: null,
                  sender_profiles: null,
                },
                error: null,
              }),
            }
          }
          if (table === 'sender_profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }
          }
          if (table === 'organizer_settings') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { org_name: 'Settings Org Name' },
                error: null,
              }),
            }
          }
          return {}
        }),
        auth: {
          admin: {
            getUserById: vi.fn().mockResolvedValue({
              data: { user: { email: 'org@example.com' } },
            }),
          },
        },
      })

      const details = await fetchOrganizerForEvent('event-1')
      expect(details).toEqual({ name: 'Settings Org Name', email: 'org@example.com' })
    })

    it('falls back to user metadata when no settings or profiles exist (Tier 4)', async () => {
      mockCreateAdminClient.mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'events') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  organizer_id: 'org-1',
                  sender_profile_id: null,
                  sender_profiles: null,
                },
                error: null,
              }),
            }
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }
        }),
        auth: {
          admin: {
            getUserById: vi.fn().mockResolvedValue({
              data: {
                user: {
                  email: 'user@example.com',
                  user_metadata: { full_name: 'Jane Doe' },
                },
              },
            }),
          },
        },
      })

      const details = await fetchOrganizerForEvent('event-1')
      expect(details).toEqual({ name: 'Jane Doe', email: 'user@example.com' })
    })
  })
})
