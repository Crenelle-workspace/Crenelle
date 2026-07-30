/**
 * __tests__/lib/paystack-breakdown.test.ts
 *
 * Tests for Paystack fee calculations and payment breakdown math:
 * - calculatePaystackFee
 * - calculatePaymentBreakdown
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
  it('computes ticket fee, Crenelle charge, Paystack fee, total amount, and net organiser payout', () => {
    // ₦10,000 ticket (1,000,000 kobo) with default 5% Crenelle charge
    const breakdown = calculatePaymentBreakdown(1000000, 5)

    expect(breakdown.ticketFeeKobo).toBe(1000000)
    expect(breakdown.crenelleChargeKobo).toBe(50000) // ₦500
    expect(breakdown.paystackFeeKobo).toBe(25000) // ₦250
    expect(breakdown.totalAmountKobo).toBe(1000000) // ₦10,000
    expect(breakdown.organiserPayoutKobo).toBe(950000) // ₦9,500
    expect(breakdown.platformFeePercent).toBe(5)
  })

  it('handles custom platform fee percentage', () => {
    // ₦20,000 ticket with 10% platform fee
    const breakdown = calculatePaymentBreakdown(2000000, 10)

    expect(breakdown.crenelleChargeKobo).toBe(200000) // ₦2,000
    expect(breakdown.organiserPayoutKobo).toBe(1800000) // ₦18,000
    expect(breakdown.platformFeePercent).toBe(10)
  })
})

describe('formatKoboAsNGN', () => {
  it('formats kobo to NGN currency string correctly', () => {
    expect(formatKoboAsNGN(1000000)).toContain('10,000')
    expect(formatKoboAsNGN(50000)).toContain('500')
  })
})
