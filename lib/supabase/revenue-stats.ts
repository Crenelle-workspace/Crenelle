import { createAdminClient } from './admin'

// ── Types ──────────────────────────────────────────────────────

export interface MonthlyRevenuePoint {
  month: string // e.g. "2026-09"
  label: string // e.g. "Sep 2026"
  currency: string
  gmvKobo: number
  platformFeeKobo: number
  organiserPayoutKobo: number
  transactionCount: number
}

export interface EventRevenueItem {
  eventId: string
  eventTitle: string
  currency: string
  ticketsSold: number
  gmvKobo: number
  platformFeeKobo: number
  organiserAmountKobo: number
  lastPaymentAt: string | null
}

export interface TaxSettings {
  vatPercent: number
  whtPercent: number
  whtThresholdKobo: number
}

export interface TaxEstimate {
  taxablePlatformFeeKobo: number
  vatEstimateKobo: number
  totalOrganiserPayoutsKobo: number
  whtEstimateKobo: number
  vatPercent: number
  whtPercent: number
  disclaimer: string
}

export interface RevenueStatsTotals {
  gmvKobo: number
  platformFeeKobo: number
  organiserPayoutKobo: number
  transactionCount: number
  refundedCount: number
}

export interface SettlementSummary {
  totalSettledAmount: number // Net NGN from settlements table
  matchedCount: number
  discrepancyCount: number
  pendingCount: number
}

export interface RevenueStats {
  dateRange: {
    from: string
    to: string
  }
  currency: string // 'NGN' | 'USD' | 'ALL'
  totals: RevenueStatsTotals
  monthlyTrend: MonthlyRevenuePoint[]
  topEvents: EventRevenueItem[]
  taxEstimate: TaxEstimate
  settlementSummary: SettlementSummary
  fetchedAt: string
}

// ── Helper Functions ───────────────────────────────────────────

function getMonthStart(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0))
}

function getMonthEnd(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999))
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// ── Main Fetcher ───────────────────────────────────────────────

/**
 * Fetches revenue statistics for admin dashboard.
 * Bypasses RLS using the admin service client.
 *
 * @param from Optional start ISO date string
 * @param to Optional end ISO date string
 * @param targetCurrency Filter by currency ('NGN', 'USD', or 'ALL')
 */
export async function fetchRevenueStats(
  from?: string,
  to?: string,
  targetCurrency: string = 'NGN'
): Promise<RevenueStats> {
  const admin = createAdminClient()

  // Default to current month if not provided
  const now = new Date()
  const startDate = from ? new Date(from) : getMonthStart(now)
  const endDate = to ? new Date(to) : getMonthEnd(now)

  const startIso = startDate.toISOString()
  const endIso = endDate.toISOString()

  // 1. Fetch Tax Settings
  const taxSettings: TaxSettings = {
    vatPercent: 7.5,
    whtPercent: 5.0,
    whtThresholdKobo: 1000000, // ₦10,000 threshold
  }

  try {
    const { data: taxData } = await admin
      .from('platform_tax_settings')
      .select('key, value')

    if (taxData && taxData.length > 0) {
      taxData.forEach((row) => {
        if (row.key === 'vat_percent') taxSettings.vatPercent = Number(row.value)
        if (row.key === 'wht_percent') taxSettings.whtPercent = Number(row.value)
        if (row.key === 'wht_threshold_kobo') taxSettings.whtThresholdKobo = Number(row.value)
      })
    }
  } catch (err) {
    console.error('[revenue-stats] Error loading tax settings:', err)
  }

  // 2. Query paid payments within date range for totals (server-side aggregation)
  // Only fetch paid rows — status='paid' is enforced in the query, not in JS
  let paidQuery = admin
    .from('payments')
    .select('amount_kobo, platform_fee_kobo, organiser_amount_kobo')
    .eq('status', 'paid')
    .gte('paid_at', startIso)
    .lte('paid_at', endIso)

  if (targetCurrency !== 'ALL') {
    paidQuery = paidQuery.eq('currency', targetCurrency)
  }

  const { data: paidData, error: paidError } = await paidQuery

  if (paidError) {
    console.error('[revenue-stats] Error fetching paid payments:', paidError)
  }

  // Count refunds separately (no amount needed — just count)
  let refundQuery = admin
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'refunded')
    .gte('paid_at', startIso)
    .lte('paid_at', endIso)

  if (targetCurrency !== 'ALL') {
    refundQuery = refundQuery.eq('currency', targetCurrency)
  }

  const { count: refundedCount } = await refundQuery

  const totals: RevenueStatsTotals = {
    gmvKobo: 0,
    platformFeeKobo: 0,
    organiserPayoutKobo: 0,
    transactionCount: 0,
    refundedCount: refundedCount ?? 0,
  }

  if (paidData) {
    paidData.forEach((p) => {
      totals.gmvKobo += p.amount_kobo || 0
      totals.platformFeeKobo += p.platform_fee_kobo || 0
      totals.organiserPayoutKobo += p.organiser_amount_kobo || 0
      totals.transactionCount += 1
    })
  }

  // 3. Fetch 6-Month Monthly Trend
  const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1, 0, 0, 0, 0))
  let trendQuery = admin
    .from('payments')
    .select('amount_kobo, platform_fee_kobo, organiser_amount_kobo, paid_at, currency')
    .eq('status', 'paid')
    .gte('paid_at', sixMonthsAgo.toISOString())

  if (targetCurrency !== 'ALL') {
    trendQuery = trendQuery.eq('currency', targetCurrency)
  }

  const { data: trendData } = await trendQuery

  // Group by month
  const monthlyMap: Record<string, MonthlyRevenuePoint> = {}

  // Pre-fill 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    monthlyMap[key] = {
      month: key,
      label: formatMonthLabel(d),
      currency: targetCurrency,
      gmvKobo: 0,
      platformFeeKobo: 0,
      organiserPayoutKobo: 0,
      transactionCount: 0,
    }
  }

  if (trendData) {
    trendData.forEach((p) => {
      if (p.paid_at) {
        const d = new Date(p.paid_at)
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
        if (monthlyMap[key]) {
          monthlyMap[key].gmvKobo += p.amount_kobo || 0
          monthlyMap[key].platformFeeKobo += p.platform_fee_kobo || 0
          monthlyMap[key].organiserPayoutKobo += p.organiser_amount_kobo || 0
          monthlyMap[key].transactionCount += 1
        }
      }
    })
  }

  const monthlyTrend = Object.values(monthlyMap)

  // 4. Fetch Top Earning Events — scoped to the selected date range
  let topEvents: EventRevenueItem[] = []
  try {
    let eventsQuery = admin
      .from('payments')
      .select(`
        event_id,
        amount_kobo,
        platform_fee_kobo,
        organiser_amount_kobo,
        currency,
        paid_at,
        events (
          id,
          title
        )
      `)
      .eq('status', 'paid')
      .gte('paid_at', startIso)
      .lte('paid_at', endIso)

    if (targetCurrency !== 'ALL') {
      eventsQuery = eventsQuery.eq('currency', targetCurrency)
    }

    const { data: eventsData, error: eventsErr } = await eventsQuery

    if (eventsData && !eventsErr) {
      const eventMap: Record<string, EventRevenueItem> = {}

      eventsData.forEach((row) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const evt = row.events as any
        if (!evt || !evt.id) return

        if (!eventMap[evt.id]) {
          eventMap[evt.id] = {
            eventId: evt.id,
            eventTitle: evt.title || 'Untitled Event',
            currency: row.currency || 'NGN',
            ticketsSold: 0,
            gmvKobo: 0,
            platformFeeKobo: 0,
            organiserAmountKobo: 0,
            lastPaymentAt: row.paid_at,
          }
        }

        const item = eventMap[evt.id]
        item.ticketsSold += 1
        item.gmvKobo += row.amount_kobo || 0
        item.platformFeeKobo += row.platform_fee_kobo || 0
        item.organiserAmountKobo += row.organiser_amount_kobo || 0
        if (row.paid_at && (!item.lastPaymentAt || new Date(row.paid_at) > new Date(item.lastPaymentAt))) {
          item.lastPaymentAt = row.paid_at
        }
      })

      topEvents = Object.values(eventMap)
        .sort((a, b) => b.platformFeeKobo - a.platformFeeKobo)
        .slice(0, 10)
    }
  } catch (err) {
    console.error('[revenue-stats] Error computing top events:', err)
  }

  // 5. Calculate Tax Estimates
  // VAT: applied on platform fee income earned by Crenelle
  const taxablePlatformFeeKobo = totals.platformFeeKobo
  const vatEstimateKobo = Math.round(taxablePlatformFeeKobo * (taxSettings.vatPercent / 100))

  // WHT: simplified platform-wide estimate — actual WHT is per-organizer per-month.
  // The threshold check here is directional only; actual per-organizer analysis
  // requires per-organizer aggregation which is outside the scope of this dashboard.
  const totalOrganiserPayoutsKobo = totals.organiserPayoutKobo
  const whtEstimateKobo = Math.round(totalOrganiserPayoutsKobo * (taxSettings.whtPercent / 100))

  const taxEstimate: TaxEstimate = {
    taxablePlatformFeeKobo,
    vatEstimateKobo,
    totalOrganiserPayoutsKobo,
    whtEstimateKobo,
    vatPercent: taxSettings.vatPercent,
    whtPercent: taxSettings.whtPercent,
    disclaimer: 'These figures are platform-wide estimates for internal reference only. Actual WHT obligations apply per organizer. Consult a chartered accountant for actual filings.',
  }

  // 6. Fetch Settlement Summary
  const settlementSummary: SettlementSummary = {
    totalSettledAmount: 0,
    matchedCount: 0,
    discrepancyCount: 0,
    pendingCount: 0,
  }

  try {
    const { data: settlements } = await admin
      .from('settlements')
      .select('total_amount, status')

    if (settlements) {
      settlements.forEach((s) => {
        settlementSummary.totalSettledAmount += Number(s.total_amount || 0)
        if (s.status === 'MATCHED') settlementSummary.matchedCount += 1
        else if (s.status === 'DISCREPANCY') settlementSummary.discrepancyCount += 1
        else if (s.status === 'PENDING') settlementSummary.pendingCount += 1
      })
    }
  } catch (err) {
    console.error('[revenue-stats] Error fetching settlements:', err)
  }

  return {
    dateRange: {
      from: startIso,
      to: endIso,
    },
    currency: targetCurrency,
    totals,
    monthlyTrend,
    topEvents,
    taxEstimate,
    settlementSummary,
    fetchedAt: new Date().toISOString(),
  }
}
