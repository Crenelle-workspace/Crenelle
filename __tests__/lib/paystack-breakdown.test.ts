/**
 * __tests__/lib/paystack-breakdown.test.ts
 *
 * Tests for Paystack fee calculations and payment breakdown math:
 * - calculatePaystackFee
 * - calculatePaymentBreakdown (3-pass algorithm + ceiling rounding to ₦10)
 * - formatKoboAsNGN
 */
import { describe, it, expect } from 'vitest'
import { calculatePaystackFee, calculatePaymentBreakdown, formatKoboAsNGN } from '@/lib/paystack'

describe('calculatePaystackFee', () => {
  it('returns 0 for non-positive amounts', () => {
    expect(calculatePaystackFee(0)).toBe(0)
    expect(calculatePaystackFee(-100)).toBe(0)
  })

  it('calculates 1.5% without NGN 100 flat fee for amounts under NGN 2,500 (250,000 kobo)', () => {
    // ₦2,000 ticket = 200,000 kobo
    // 1.5% of 200,000 = 3,000 kobo (₦30)
    expect(calculatePaystackFee(200000)).toBe(3000)
  })

  it('calculates 1.5% + NGN 100 flat fee for amounts >= NGN 2,500 (250,000 kobo)', () => {
    // ₦10,000 ticket = 1,000,000 kobo
    // 1.5% of 1,000,000 = 15,000 kobo (₦150)
    // plus 10,000 kobo (₦100) = 25,000 kobo (₦250)
    expect(calculatePaystackFee(1000000)).toBe(25000)
  })

  it('caps total Paystack fee at NGN 2,000 (200,000 kobo)', () => {
    // ₦500,000 ticket = 50,000,000 kobo
    // 1.5% = 750,000 kobo + 10,000 = 760,000 kobo
    // Capped at 200,000 kobo (₦2,000)
    expect(calculatePaystackFee(50000000)).toBe(200000)
  })
})

describe('calculatePaymentBreakdown', () => {
  it('returns 0 values for free tickets (0 kobo)', () => {
    const breakdown = calculatePaymentBreakdown(0, 5)
    expect(breakdown.ticketFeeKobo).toBe(0)
    expect(breakdown.totalAmountKobo).toBe(0)
    expect(breakdown.crenelleChargeKobo).toBe(0)
    expect(breakdown.paystackFeeKobo).toBe(0)
    expect(breakdown.organiserPayoutKobo).toBe(0)
  })

  it('calculates breakdown for ₦2,000 ticket (under ₦2,500 threshold)', () => {
    // ₦2,000 ticket (200,000 kobo) + 5% platform fee
    // Buyer total: ₦2,140 (214,000 kobo)
    const breakdown = calculatePaymentBreakdown(200000, 5)

    expect(breakdown.ticketFeeKobo).toBe(200000)
    expect(breakdown.totalAmountKobo).toBe(214000) // ₦2,140
    expect(breakdown.organiserPayoutKobo).toBe(200000) // ₦2,000 (100%)
    expect(breakdown.crenelleChargeKobo).toBe(14000) // ₦140
    expect(breakdown.paystackFeeKobo).toBe(3210) // 1.5% of 214,000 = ₦32.10
  })

  it('calculates breakdown for ₦5,000 ticket (includes ₦100 flat fee)', () => {
    // ₦5,000 ticket (500,000 kobo) + 5% platform fee
    // Buyer total: ₦5,460 (546,000 kobo)
    const breakdown = calculatePaymentBreakdown(500000, 5)

    expect(breakdown.ticketFeeKobo).toBe(500000)
    expect(breakdown.totalAmountKobo).toBe(546000) // ₦5,460
    expect(breakdown.organiserPayoutKobo).toBe(500000) // ₦5,000 (100%)
    expect(breakdown.crenelleChargeKobo).toBe(46000) // ₦460
    expect(breakdown.paystackFeeKobo).toBe(18190) // 1.5% of 546,000 + ₦100 = ₦181.90
  })

  it('calculates breakdown for ₦10,000 ticket', () => {
    // ₦10,000 ticket (1,000,000 kobo) + 5% platform fee
    // Buyer total: ₦10,810 (1,081,000 kobo)
    const breakdown = calculatePaymentBreakdown(1000000, 5)

    expect(breakdown.ticketFeeKobo).toBe(1000000)
    expect(breakdown.totalAmountKobo).toBe(1081000) // ₦10,810
    expect(breakdown.organiserPayoutKobo).toBe(1000000) // ₦10,000 (100%)
    expect(breakdown.crenelleChargeKobo).toBe(81000) // ₦810
    expect(breakdown.paystackFeeKobo).toBe(26215) // 1.5% of 1,081,000 + ₦100 = ₦262.15
  })

  it('handles fee cap for large transactions (₦150,000 ticket)', () => {
    // ₦150,000 ticket (15,000,000 kobo) + 5% platform fee
    // Paystack fee hits max ₦2,000 cap
    // Buyer total: ₦160,000 (16,000,000 kobo)
    const breakdown = calculatePaymentBreakdown(15000000, 5)

    expect(breakdown.ticketFeeKobo).toBe(15000000)
    expect(breakdown.totalAmountKobo).toBe(16000000) // ₦160,000
    expect(breakdown.organiserPayoutKobo).toBe(15000000) // ₦150,000 (100%)
    expect(breakdown.crenelleChargeKobo).toBe(1000000) // ₦10,000
    expect(breakdown.paystackFeeKobo).toBe(200000) // Capped at ₦2,000 (200,000 kobo)
  })

  it('handles boundary case just under ₦2,500 threshold', () => {
    // ₦2,300 ticket (230,000 kobo) + 5% platform fee
    // Raw total stays under ₦2,500 (250,000 kobo), so ₦100 flat fee is not added
    // 230,000 / 0.935 = 245,989.3 -> rounded UP to 246,000 kobo (₦2,460)
    const breakdown = calculatePaymentBreakdown(230000, 5)

    expect(breakdown.ticketFeeKobo).toBe(230000)
    expect(breakdown.totalAmountKobo).toBe(246000) // ₦2,460
    expect(breakdown.organiserPayoutKobo).toBe(230000) // ₦2,300 (100%)
    expect(breakdown.crenelleChargeKobo).toBe(16000) // ₦160
  })

  it('handles custom platform fee percentage', () => {
    // ₦20,000 ticket (2,000,000 kobo) with 10% platform fee
    // Combined percent = 10% + 1.5% = 11.5% (0.115)
    // (2,000,000 + 10,000) / (1 - 0.115) = 2,010,000 / 0.885 = 2,271,186.4 -> 2,272,000 kobo (₦22,720)
    const breakdown = calculatePaymentBreakdown(2000000, 10)

    expect(breakdown.organiserPayoutKobo).toBe(2000000) // ₦20,000 (100%)
    expect(breakdown.totalAmountKobo).toBe(2272000) // ₦22,720
    expect(breakdown.crenelleChargeKobo).toBe(272000) // ₦2,720
    expect(breakdown.platformFeePercent).toBe(10)
  })
})

describe('formatKoboAsNGN', () => {
  it('formats kobo to NGN currency string correctly', () => {
    expect(formatKoboAsNGN(1000000)).toContain('10,000')
    expect(formatKoboAsNGN(50000)).toContain('500')
  })
})
