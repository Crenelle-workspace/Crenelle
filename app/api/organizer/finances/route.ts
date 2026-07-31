import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import * as Sentry from '@sentry/nextjs'

/**
 * GET /api/organizer/finances
 *
 * Top-level finances overview for the authenticated organiser.
 *
 * Returns:
 *   - lifetime:    total gross, platform fees, net earnings, payment counts
 *   - by_event:    per-event revenue breakdown (sorted by gross revenue desc)
 *   - subaccount:  their connected bank account / Paystack subaccount details
 *
 * Use this for the main "Finances" dashboard page.
 * For paginated transaction list  → GET /api/organizer/finances/payments
 * For payout / settlement history → GET /api/organizer/finances/payouts
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  try {
    // 1. Fetch all events owned by this organiser so we have the full event list
    //    and can restrict payment queries to only their events.
    const { data: events, error: eventsError } = await admin
      .from('events')
      .select('id, name, date, status, registration_slug')
      .eq('organizer_id', user.id)
      .order('date', { ascending: false })

    if (eventsError) {
      Sentry.captureException(eventsError, { extra: { context: 'organizer_finances_events' } })
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    const eventIds = (events ?? []).map(e => e.id)

    // Run payment fetch and payment-settings fetch in parallel
    const [paymentsResult, paymentSettingsResult] = await Promise.all([
      // 2. All non-pending payments across all organiser events
      eventIds.length > 0
        ? admin
            .from('payments')
            .select('id, event_id, amount_kobo, platform_fee_kobo, organiser_amount_kobo, currency, status')
            .in('event_id', eventIds)
            .in('status', ['paid', 'refunded', 'disputed'])
        : Promise.resolve({
            data: [] as { id: string; event_id: string; amount_kobo: number; platform_fee_kobo: number; organiser_amount_kobo: number; currency: string; status: string }[],
            error: null,
          }),

      // 3. Paystack subaccount / bank connection info
      admin
        .from('organizer_payment_settings')
        .select('paystack_subaccount_code, bank_name, account_number, account_name, platform_fee_percent, is_verified, connected_at')
        .eq('organizer_id', user.id)
        .maybeSingle(),
    ])

    if (paymentsResult.error) {
      Sentry.captureException(paymentsResult.error, { extra: { context: 'organizer_finances_payments' } })
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    const allPayments     = paymentsResult.data ?? []
    const paymentSettings = paymentSettingsResult.data ?? null

    // ── Lifetime totals ──────────────────────────────────────────
    const paidPayments     = allPayments.filter(p => p.status === 'paid')
    const refundedPayments = allPayments.filter(p => p.status === 'refunded')
    const disputedPayments = allPayments.filter(p => p.status === 'disputed')

    const lifetimeGrossKobo    = paidPayments.reduce((s, p) => s + (p.amount_kobo ?? 0), 0)
    const lifetimePlatformKobo = paidPayments.reduce((s, p) => s + (p.platform_fee_kobo ?? 0), 0)
    const lifetimeNetKobo      = paidPayments.reduce((s, p) => s + (p.organiser_amount_kobo ?? 0), 0)

    const lifetime = {
      paid_count:         paidPayments.length,
      refunded_count:     refundedPayments.length,
      disputed_count:     disputedPayments.length,
      gross_revenue_kobo: lifetimeGrossKobo,
      platform_fees_kobo: lifetimePlatformKobo,
      net_earnings_kobo:  lifetimeNetKobo,
      gross_revenue_ngn:  lifetimeGrossKobo    / 100,
      platform_fees_ngn:  lifetimePlatformKobo / 100,
      net_earnings_ngn:   lifetimeNetKobo      / 100,
      currency:           'NGN',
    }

    // ── Per-event revenue rollup ─────────────────────────────────
    // Index payments by event_id for O(n) aggregation
    const paymentsByEvent = new Map<string, { paid: typeof paidPayments; all: typeof allPayments }>()
    for (const evt of events ?? []) {
      paymentsByEvent.set(evt.id, { paid: [], all: [] })
    }
    for (const p of allPayments) {
      if (!p.event_id || !paymentsByEvent.has(p.event_id)) continue
      const bucket = paymentsByEvent.get(p.event_id)!
      bucket.all.push(p)
      if (p.status === 'paid') bucket.paid.push(p)
    }

    const by_event = (events ?? []).map(event => {
      const { paid: evtPaid, all: evtAll } = paymentsByEvent.get(event.id) ?? { paid: [], all: [] }
      const grossKobo    = evtPaid.reduce((s, p) => s + (p.amount_kobo ?? 0), 0)
      const platformKobo = evtPaid.reduce((s, p) => s + (p.platform_fee_kobo ?? 0), 0)
      const netKobo      = evtPaid.reduce((s, p) => s + (p.organiser_amount_kobo ?? 0), 0)

      return {
        event_id:           event.id,
        event_name:         event.name,
        event_date:         event.date,
        event_status:       event.status,
        registration_slug:  event.registration_slug,
        paid_count:         evtPaid.length,
        refunded_count:     evtAll.filter(p => p.status === 'refunded').length,
        disputed_count:     evtAll.filter(p => p.status === 'disputed').length,
        gross_revenue_kobo: grossKobo,
        platform_fees_kobo: platformKobo,
        net_earnings_kobo:  netKobo,
        gross_revenue_ngn:  grossKobo    / 100,
        platform_fees_ngn:  platformKobo / 100,
        net_earnings_ngn:   netKobo      / 100,
        currency:           'NGN',
      }
    }).sort((a, b) => b.gross_revenue_kobo - a.gross_revenue_kobo)

    return NextResponse.json({
      lifetime,
      by_event,
      subaccount: paymentSettings,
    })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'organizer_finances_overview' } })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
