import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { fetchRevenueStats } from '@/lib/supabase/revenue-stats'
import { AdminRevenueReport } from '@/components/admin-revenue-pdf'

export const dynamic = 'force-dynamic'

function formatMoney(kobo: number, currency: string = 'NGN'): string {
  const major = Math.round(kobo / 100)
  return `${currency} ${major}`
}

export async function GET(request: NextRequest) {
  // ── Auth Guard ──────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Query Params — validated against allowlists ─────────────
  const searchParams = request.nextUrl.searchParams
  const format = searchParams.get('format') || 'csv'
  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined

  // Validate currency against allowlist — prevents Content-Disposition header injection
  const ALLOWED_CURRENCIES = ['NGN', 'USD', 'ALL'] as const
  type AllowedCurrency = typeof ALLOWED_CURRENCIES[number]
  const rawCurrency = searchParams.get('currency') ?? 'NGN'
  const currency: AllowedCurrency = (ALLOWED_CURRENCIES as readonly string[]).includes(rawCurrency)
    ? (rawCurrency as AllowedCurrency)
    : 'NGN'

  const stats = await fetchRevenueStats(from, to, currency)
  const fileDate = new Date().toISOString().split('T')[0]

  // ── Export Format: CSV ────────────────────────────────────────
  if (format === 'csv') {
    const csvLines: string[] = []

    csvLines.push('CRENELLE EXECUTIVE PLATFORM REVENUE REPORT')
    csvLines.push(`Period: ${stats.dateRange.from.split('T')[0]} to ${stats.dateRange.to.split('T')[0]}`)
    csvLines.push(`Currency: ${stats.currency}`)
    csvLines.push(`Generated: ${stats.fetchedAt}`)
    csvLines.push('')

    // Totals Section
    csvLines.push('=== SUMMARY TOTALS ===')
    csvLines.push('Gross Merchandise Value (GMV),Crenelle Revenue,Organizer Disbursements,Successful Transactions,Refunded Txns')
    csvLines.push(
      `"${formatMoney(stats.totals.gmvKobo, currency)}","${formatMoney(stats.totals.platformFeeKobo, currency)}","${formatMoney(stats.totals.organiserPayoutKobo, currency)}",${stats.totals.transactionCount},${stats.totals.refundedCount}`
    )
    csvLines.push('')

    // Tax Estimate Section
    csvLines.push('=== TAX ESTIMATES (INTERNAL REFERENCE) ===')
    csvLines.push(`Taxable Platform Revenue,Estimated VAT (${stats.taxEstimate.vatPercent}%),Total Organizer Payouts,Estimated WHT (${stats.taxEstimate.whtPercent}%)`)
    csvLines.push(
      `"${formatMoney(stats.taxEstimate.taxablePlatformFeeKobo, currency)}","${formatMoney(stats.taxEstimate.vatEstimateKobo, currency)}","${formatMoney(stats.taxEstimate.totalOrganiserPayoutsKobo, currency)}","${formatMoney(stats.taxEstimate.whtEstimateKobo, currency)}"`
    )
    csvLines.push(`Disclaimer: "${stats.taxEstimate.disclaimer.replace(/"/g, '""')}"`)
    csvLines.push('')

    // Monthly Trend Section
    csvLines.push('=== 6-MONTH MONTHLY TREND ===')
    csvLines.push('Month,Label,Currency,Transactions,GMV,Crenelle Revenue,Organizer Payouts')
    stats.monthlyTrend.forEach((m) => {
      csvLines.push(
        `"${m.month}","${m.label}","${m.currency}",${m.transactionCount},"${formatMoney(m.gmvKobo, currency)}","${formatMoney(m.platformFeeKobo, currency)}","${formatMoney(m.organiserPayoutKobo, currency)}"`
      )
    })
    csvLines.push('')

    // Top Events Section
    csvLines.push('=== TOP REVENUE GENERATING EVENTS ===')
    csvLines.push('Event Title,Currency,Tickets Sold,Gross GMV,Crenelle Revenue,Organizer Share')
    stats.topEvents.forEach((e) => {
      csvLines.push(
        `"${e.eventTitle.replace(/"/g, '""')}","${e.currency}",${e.ticketsSold},"${formatMoney(e.gmvKobo, e.currency)}","${formatMoney(e.platformFeeKobo, e.currency)}","${formatMoney(e.organiserAmountKobo, e.currency)}"`
      )
    })

    const csvContent = csvLines.join('\n')
    const fileName = `crenelle-revenue-report-${currency.toLowerCase()}-${fileDate}.csv`

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  }

  // ── Export Format: PDF ────────────────────────────────────────
  if (format === 'pdf') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfBuffer = await renderToBuffer(React.createElement(AdminRevenueReport, { stats }) as any)
      const fileName = `crenelle-revenue-report-${currency.toLowerCase()}-${fileDate}.pdf`

      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      })
    } catch (pdfErr) {
      console.error('[export/route] PDF rendering error:', pdfErr)
      return NextResponse.json({ error: 'Failed to generate PDF report' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Invalid export format requested' }, { status: 400 })
}
