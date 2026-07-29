import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import * as Sentry from '@sentry/nextjs'

/**
 * GET /api/organizer/finances/payments
 *
 * Paginated, filterable list of all individual payment transactions
 * across all events owned by the authenticated organiser.
 *
 * Query params:
 *   event_id  — filter to a specific event UUID
 *   status    — filter by status: paid | refunded | disputed | pending | failed
 *   from      — ISO date string, inclusive (e.g. 2026-01-01)
 *   to        — ISO date string, inclusive (e.g. 2026-12-31)
 *   page      — page number, 1-indexed (default: 1)
 *   per_page  — results per page (default: 50, max: 200)
 *
 * Returns:
 *   {
 *     payments: PaymentRow[],
 *     pagination: { page, per_page, total, total_pages },
 *     summary: { gross_kobo, platform_fees_kobo, net_earnings_kobo, ... }
 *              (summary is for the CURRENT filtered result set, not lifetime)
 *   }
 *
 * Each payment row includes the event name, ticket tier name, and payer details
 * so the UI can render a full transaction table without extra fetches.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse query params ───────────────────────────────────────
  const { searchParams } = request.nextUrl
  const filterEventId = searchParams.get('event_id') ?? undefined
  const filterStatus  = searchParams.get('status') ?? undefined
  const filterFrom    = searchParams.get('from') ?? undefined
  const filterTo      = searchParams.get('to') ?? undefined
  const page          = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const perPage       = Math.min(200, Math.max(1, parseInt(searchParams.get('per_page') ?? '50', 10)))

  const validStatuses = ['paid', 'refunded', 'disputed', 'pending', 'failed', 'abandoned']
  if (filterStatus && !validStatuses.includes(filterStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  try {
    // 1. Get all event IDs owned by this organiser (or validate the single event_id)
    let eventIds: string[]

    if (filterEventId) {
      // Verify ownership of the specific event
      const { data: event } = await admin
        .from('events')
        .select('id')
        .eq('id', filterEventId)
        .eq('organizer_id', user.id)
        .maybeSingle()

      if (!event) {
        return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 })
      }
      eventIds = [filterEventId]
    } else {
      const { data: events, error: eventsError } = await admin
        .from('events')
        .select('id')
        .eq('organizer_id', user.id)

      if (eventsError) {
        Sentry.captureException(eventsError, { extra: { context: 'organizer_payments_list_events' } })
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
      }
      eventIds = (events ?? []).map(e => e.id)
    }

    if (eventIds.length === 0) {
      return NextResponse.json({
        payments: [],
        pagination: { page: 1, per_page: perPage, total: 0, total_pages: 0 },
        summary: { paid_count: 0, gross_kobo: 0, platform_fees_kobo: 0, net_earnings_kobo: 0, gross_ngn: 0, platform_fees_ngn: 0, net_earnings_ngn: 0 },
      })
    }

    // 2. Build the query with filters
    // We need a count query (no range) + a data query (with range) — run in parallel
    const buildBase = () => {
      let q = admin
        .from('payments')
        .select(`
          id,
          paystack_reference,
          amount_kobo,
          platform_fee_kobo,
          organiser_amount_kobo,
          currency,
          status,
          payer_email,
          payer_name,
          paystack_channel,
          paid_at,
          created_at,
          metadata,
          event_id,
          ticket_tier_id,
          events ( id, name, date, registration_slug ),
          ticket_tiers ( id, name, price, currency )
        `)
        .in('event_id', eventIds)

      if (filterStatus) {
        q = q.eq('status', filterStatus)
      } else {
        // Default: show everything except abandoned/failed to keep the list clean
        // The consumer can pass status=failed explicitly if needed
        q = q.in('status', ['paid', 'refunded', 'disputed'])
      }

      if (filterFrom) {
        q = q.gte('paid_at', new Date(filterFrom).toISOString())
      }

      if (filterTo) {
        // Inclusive upper bound: end of the given day
        const toDate = new Date(filterTo)
        toDate.setHours(23, 59, 59, 999)
        q = q.lte('paid_at', toDate.toISOString())
      }

      return q
    }

    // Separate count builder — uses two-arg .select('*', {count, head}) which is only
    // valid on the initial .select() call, not when chained after buildBase().
    const buildCount = () => {
      let q = admin
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .in('event_id', eventIds)

      if (filterStatus) {
        q = q.eq('status', filterStatus)
      } else {
        q = q.in('status', ['paid', 'refunded', 'disputed'])
      }
      if (filterFrom) q = q.gte('paid_at', new Date(filterFrom).toISOString())
      if (filterTo) {
        const toDate = new Date(filterTo)
        toDate.setHours(23, 59, 59, 999)
        q = q.lte('paid_at', toDate.toISOString())
      }
      return q
    }

    const [countResult, dataResult] = await Promise.all([
      buildCount(),
      buildBase()
        .order('paid_at', { ascending: false, nullsFirst: false })
        .range((page - 1) * perPage, page * perPage - 1),
    ])

    if (countResult.error) {
      Sentry.captureException(countResult.error, { extra: { context: 'organizer_payments_list_count' } })
      return NextResponse.json({ error: 'Failed to count payments' }, { status: 500 })
    }

    if (dataResult.error) {
      Sentry.captureException(dataResult.error, { extra: { context: 'organizer_payments_list_data' } })
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    const total      = countResult.count ?? 0
    const payments   = dataResult.data ?? []
    const totalPages = Math.ceil(total / perPage)

    // 3. Summary for the filtered result set (all matching rows, not just this page)
    //    Fetch aggregate values for the full filtered set
    const { data: allMatchedIds } = await buildBase()
      .select('amount_kobo, platform_fee_kobo, organiser_amount_kobo, status')

    const paidRows = (allMatchedIds ?? []).filter(p => p.status === 'paid')
    const grossKobo    = paidRows.reduce((s, p) => s + (p.amount_kobo ?? 0), 0)
    const platformKobo = paidRows.reduce((s, p) => s + (p.platform_fee_kobo ?? 0), 0)
    const netKobo      = paidRows.reduce((s, p) => s + (p.organiser_amount_kobo ?? 0), 0)

    const summary = {
      paid_count:         paidRows.length,
      refunded_count:     (allMatchedIds ?? []).filter(p => p.status === 'refunded').length,
      disputed_count:     (allMatchedIds ?? []).filter(p => p.status === 'disputed').length,
      gross_kobo:         grossKobo,
      platform_fees_kobo: platformKobo,
      net_earnings_kobo:  netKobo,
      gross_ngn:          grossKobo    / 100,
      platform_fees_ngn:  platformKobo / 100,
      net_earnings_ngn:   netKobo      / 100,
      currency:           'NGN',
    }

    return NextResponse.json({
      payments,
      pagination: {
        page,
        per_page:    perPage,
        total,
        total_pages: totalPages,
        has_next:    page < totalPages,
        has_prev:    page > 1,
      },
      summary,
    })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'organizer_finances_payments' } })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
