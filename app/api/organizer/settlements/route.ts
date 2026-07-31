import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import * as Sentry from '@sentry/nextjs'

/**
 * GET /api/organizer/settlements
 *
 * Payout Reconciliation Engine — §7 View 2 ("Payout Reconciliation Engine")
 *
 * Returns the organizer's settlement history with per-event revenue breakdown.
 * Answers the question: "Paystack deposited a lump sum — how much came from each event?"
 *
 * Scalability fix applied:
 *   FIX 4: Replaced N+1 query pattern (one query per settlement row) with a
 *   single JOIN query that fetches all settlement_transactions for the current
 *   page in one round-trip, then groups in application memory.
 *   Before: 1 + N queries (N = settlements per page, default 20).
 *   After:  2 queries total, regardless of page size.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminSupabase = createAdminClient()

  // Pagination
  const url     = new URL(request.url)
  const page    = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const perPage = Math.min(50, Math.max(1, parseInt(url.searchParams.get('per_page') ?? '20', 10)))
  const offset  = (page - 1) * perPage

  try {
    // ── Query 1: Fetch the page of settlements ────────────────────────────────
    const { data: settlements, error: settlementsError, count } = await adminSupabase
      .from('settlements')
      .select('*', { count: 'exact' })
      .eq('organizer_id', user.id)
      .order('settlement_date', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (settlementsError) {
      Sentry.captureException(settlementsError, {
        extra: { userId: user.id, context: 'organizer_settlements_fetch' },
      })
      return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 })
    }

    if (!settlements || settlements.length === 0) {
      return NextResponse.json({ settlements: [], total: 0, page, per_page: perPage })
    }

    const settlementIds = settlements.map(s => s.id)

    // ── Query 2: Single JOIN for all breakdown data ───────────────────────────
    // FIX 4: Previously fired one query per settlement (N queries for N settlements).
    // Now fetches all settlement_transactions for this entire page in one query,
    // with event data joined inline. Groups in JS — zero extra round-trips.
    const { data: allTxns, error: txnError } = await adminSupabase
      .from('settlement_transactions')
      .select(`
        settlement_id,
        amount_settled,
        payments (
          event_id,
          events (
            id,
            name,
            date
          )
        )
      `)
      .in('settlement_id', settlementIds)

    if (txnError) {
      Sentry.captureException(txnError, {
        extra: { userId: user.id, context: 'organizer_settlements_txn_fetch' },
      })
      // Non-fatal: return settlements without breakdown rather than erroring
      return NextResponse.json({
        settlements: settlements.map(s => ({ ...s, breakdown: [] })),
        total: count ?? 0,
        page,
        per_page: perPage,
      })
    }

    // ── Group transactions by settlement, then by event ───────────────────────
    // Build a Map<settlementId, Map<eventId, breakdown_row>>
    type BreakdownEntry = {
      event_id: string
      event_name: string
      event_date: string
      amount_settled: number
      payment_count: number
    }

    const breakdownMap = new Map<string, Map<string, BreakdownEntry>>()

    // Pre-populate with empty maps so settlements with no transactions still appear
    for (const s of settlements) {
      breakdownMap.set(s.id, new Map())
    }

    for (const txn of (allTxns ?? [])) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payment = txn.payments as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const event   = payment?.events as any
      if (!event?.id) continue

      const eventMap = breakdownMap.get(txn.settlement_id)
      if (!eventMap) continue

      const existing = eventMap.get(event.id)
      if (existing) {
        existing.amount_settled += txn.amount_settled
        existing.payment_count  += 1
      } else {
        eventMap.set(event.id, {
          event_id:       event.id,
          event_name:     event.name,
          event_date:     event.date,
          amount_settled: txn.amount_settled,
          payment_count:  1,
        })
      }
    }

    // Assemble final response
    const settlementsWithBreakdown = settlements.map(settlement => ({
      ...settlement,
      breakdown: Array.from(breakdownMap.get(settlement.id)?.values() ?? [])
        .sort((a, b) => b.amount_settled - a.amount_settled),
    }))

    return NextResponse.json({
      settlements: settlementsWithBreakdown,
      total:       count ?? 0,
      page,
      per_page:    perPage,
    })
  } catch (err) {
    Sentry.captureException(err, {
      extra: { userId: user.id, context: 'organizer_settlements_route' },
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
