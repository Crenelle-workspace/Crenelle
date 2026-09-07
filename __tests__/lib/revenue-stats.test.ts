import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { fetchRevenueStats } from '@/lib/supabase/revenue-stats'

const mockCreateAdminClient = createAdminClient as ReturnType<typeof vi.fn>

describe('lib/supabase/revenue-stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('computes revenue totals and tax estimates correctly for NGN payments', async () => {
    const mockPayments = [
      {
        amount_kobo: 500000,
        platform_fee_kobo: 25000,
        organiser_amount_kobo: 475000,
        status: 'paid',
        currency: 'NGN',
        paid_at: new Date().toISOString(),
      },
      {
        amount_kobo: 1000000,
        platform_fee_kobo: 50000,
        organiser_amount_kobo: 950000,
        status: 'paid',
        currency: 'NGN',
        paid_at: new Date().toISOString(),
      },
    ]

    const mockTaxSettings = [
      { key: 'vat_percent', value: 7.5 },
      { key: 'wht_percent', value: 5.0 },
      { key: 'wht_threshold_kobo', value: 1000000 },
    ]

    const mockAdmin = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      from: vi.fn((table: string) => {
        if (table === 'platform_tax_settings') {
          return {
            select: vi.fn().mockResolvedValue({ data: mockTaxSettings, error: null }),
          }
        }
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: mockPayments, error: null }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            then: (resolve: any) => resolve({ data: mockPayments, error: null }),
          }
        }
        if (table === 'settlements') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { total_amount: 14250.0, status: 'MATCHED' },
              ],
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }),
    }

    mockCreateAdminClient.mockReturnValue(mockAdmin)

    const stats = await fetchRevenueStats(undefined, undefined, 'NGN')

    expect(stats.currency).toBe('NGN')
    expect(stats.totals.gmvKobo).toBe(1500000)
    expect(stats.totals.platformFeeKobo).toBe(75000)
    expect(stats.totals.organiserPayoutKobo).toBe(1425000)
    expect(stats.totals.transactionCount).toBe(2)

    // Tax checks
    expect(stats.taxEstimate.vatPercent).toBe(7.5)
    expect(stats.taxEstimate.vatEstimateKobo).toBe(5625) // 75000 * 0.075
    expect(stats.taxEstimate.whtPercent).toBe(5.0)
    expect(stats.taxEstimate.whtEstimateKobo).toBe(71250) // 1425000 * 0.05 (exceeds 1,000,000 threshold)
    expect(stats.taxEstimate.disclaimer).toContain('Consult a chartered accountant')
  })
})
