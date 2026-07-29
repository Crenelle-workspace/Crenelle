import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import * as Sentry from '@sentry/nextjs'

/**
 * GET /api/organizer/finances/payouts
 *
 * Settlement / payout history for the authenticated organiser.
 * Each payout (settlement batch from Paystack) is broken down by event,
 * so the organiser can see exactly which money came from which event.
 *
 * Query params:
 *   status    — filter by settlement status: PENDING | MATCHED | DISCREPANCY
 *   from      — ISO date string, inclusive (settlement_date >=)
 *   to        — ISO date string, inclusive (settlement_date <=)
 *   page      — page number, 1-indexed (default: 1)
 *   per_page  — results per page (default: 20, max: 100)
 *
 * Returns:
 *   {
 *     payouts: PayoutRow[],
 *     pagination: { page, per_page, total, total_pages },
 *     summary: { total_settled_ngn, payout_count }
 *   }
 *
 * Each PayoutRow:
 *   {
 *     id:                   string         — our DB UUID
 *     paystack_settlement_id: string       — Paystack's internal ID
 *     transfer_reference:   string | null  — bank transfer ref (e.g. PAY-XXXXXXXX-NG)
 *     settlement_date:      string         — date the bank deposit hit
 *     total_amount_ngn:     number         — total amount deposited (NGN)
 *     status:               string         — PENDING | MATCHED | DISCREPANCY
 *     by_event: [                           — breakdown of which events contributed
 *       {
 *         event_id:         string
 *         event_name:       string
 *         event_date:       string
 *         transaction_count: number        — # of tickets in this payout from this event
 *         amount_settled_ngn: number       — NGN amount from this event in this payout
 *       }
 *     ]
 *   }
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse query params ───────────────────────────────────────
  const { searchParams } = request.nextUrl
  const filterStatus = searchParams.get('status') ?? undefined
  const filterFrom   = searchParams.get('from') ?? undefined
  const filterTo     = searchParams.get('to') ?? undefined
  const page         = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const perPage      = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') ?? '20', 10)))

  const validStatuses = ['PENDING', 'MATCHED', 'DISCREPANCY']
  if (filterStatus && !validStatuses.includes(filterStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  try {
    // 1. Build the settlements query (restricted to this organiser by RLS + explicit filter)
    const buildBase = () => {
      let q = admin
        .from('settlements')
        .select('id, paystack_settlement_id, transfer_reference, settlement_date, total_amount, status, created_at')
        .eq('organizer_id', user.id)

      if (filterStatus) q = q.eq('status', filterStatus)
      if (filterFrom)   q = q.gte('settlement_date', filterFrom)
      if (filterTo)     q = q.lte('settlement_date', filterTo)

      return q
    }

    // Separate count builder — uses two-arg .select('*', {count, head}) which is only
    // valid on the initial .select() call, not chained after buildBase().
    const buildCount = () => {
      let q = admin
        .from('settlements')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', user.id)

      if (filterStatus) q = q.eq('status', filterStatus)
      if (filterFrom)   q = q.gte('settlement_date', filterFrom)
      if (filterTo)     q = q.lte('settlement_date', filterTo)

      return q
    }

    const [countResult, settlementsResult] = await Promise.all([
      buildCount(),
      buildBase()
        .order('settlement_date', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1),
    ])

    if (countResult.error) {
      Sentry.captureException(countResult.error, { extra: { context: 'organizer_payouts_count' } })
      return NextResponse.json({ error: 'Failed to count payouts' }, { status: 500 })
    }
    if (settlementsResult.error) {
      Sentry.captureException(settlementsResult.error, { extra: { context: 'organizer_payouts_list' } })
      return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
    }

    const settlements = settlementsResult.data ?? []
    const total       = countResult.count ?? 0
    const totalPages  = Math.ceil(total / perPage)

    if (settlements.length === 0) {
      return NextResponse.json({
        payouts: [],
        pagination: { page, per_page: perPage, total, total_pages: totalPages, has_next: false, has_prev: false },
        summary:    { total_settled_ngn: 0, payout_count: 0 },
      })
    }

    const settlementIds = settlements.map(s => s.id)

    // 2. Fetch settlement_transactions for all settlements on this page in one query.
    //    Join through payments → events so we get the event info per transaction.
    const { data: txnRows, error: txnError } = await admin
      .from('settlement_transactions')
      .select(`
        settlement_id,
        amount_settled,
        payments (
          id,
          event_id,
          amount_kobo,
          organiser_amount_kobo,
          events ( id, name, date, registration_slug )
        )
      `)
      .in('settlement_id', settlementIds)

    if (txnError) {
      Sentry.captureException(txnError, { extra: { context: 'organizer_payouts_transactions' } })
      return NextResponse.json({ error: 'Failed to fetch payout breakdown' }, { status: 500 })
    }

    // 3. Build per-settlement, per-event breakdown
    //    Structure: settlementId → eventId → { event info, count, amount }
    type EventBucket = {
      event_id:            string
      event_name:          string
      event_date:          string | null
      registration_slug:   string | null
      transaction_count:   number
      amount_settled_ngn:  number
    }

    const bySettlement = new Map<string, Map<string, EventBucket>>()
    for (const sid of settlementIds) {
      bySettlement.set(sid, new Map())
    }

    for (const txn of txnRows ?? []) {
      // Supabase returns joined rows as an array even for many-to-one relations.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawPayment = (txn.payments as any)
      const payment = (Array.isArray(rawPayment) ? rawPayment[0] : rawPayment) as {
        id: string
        event_id: string | null
        amount_kobo: number | null
        organiser_amount_kobo: number | null
        events: { id: string; name: string; date: string | null; registration_slug: string | null } | null
      } | null

      if (!payment?.event_id || !payment.events) continue

      const eventBuckets = bySettlement.get(txn.settlement_id)
      if (!eventBuckets) continue

      const eventId = payment.event_id
      if (!eventBuckets.has(eventId)) {
        eventBuckets.set(eventId, {
          event_id:           eventId,
          event_name:         payment.events.name,
          event_date:         payment.events.date,
          registration_slug:  payment.events.registration_slug,
          transaction_count:  0,
          amount_settled_ngn: 0,
        })
      }

      const bucket = eventBuckets.get(eventId)!
      bucket.transaction_count  += 1
      bucket.amount_settled_ngn += Number(txn.amount_settled ?? 0)
    }

    // 4. Assemble the final payouts array
    const payouts = settlements.map(s => ({
      id:                     s.id,
      paystack_settlement_id: s.paystack_settlement_id,
      transfer_reference:     s.transfer_reference,
      settlement_date:        s.settlement_date,
      total_amount_ngn:       Number(s.total_amount),
      status:                 s.status,
      created_at:             s.created_at,
      // Per-event breakdown sorted by amount (largest first)
      by_event: Array.from(bySettlement.get(s.id)?.values() ?? [])
        .sort((a, b) => b.amount_settled_ngn - a.amount_settled_ngn),
    }))

    // 5. Summary: total settled across ALL matching settlements (not just this page)
    const { data: allSettlements } = await buildBase().select('total_amount')
    const totalSettledNgn = (allSettlements ?? [])
      .reduce((s, r) => s + Number(r.total_amount ?? 0), 0)

    return NextResponse.json({
      payouts,
      pagination: {
        page,
        per_page:    perPage,
        total,
        total_pages: totalPages,
        has_next:    page < totalPages,
        has_prev:    page > 1,
      },
      summary: {
        payout_count:      total,
        total_settled_ngn: totalSettledNgn,
      },
    })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'organizer_finances_payouts' } })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
