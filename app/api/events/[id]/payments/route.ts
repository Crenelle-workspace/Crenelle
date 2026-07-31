import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import * as Sentry from '@sentry/nextjs'

/**
 * GET /api/events/[id]/payments
 *
 * Per-Event Revenue Summary — §7 View 1 ("Per-Event Micro Dashboard")
 *
 * Returns:
 *   - summary: gross revenue, platform fees, net organizer earnings, paid count
 *   - payments: itemized list of paid transactions (for the attendee table)
 *
 * Auth: must be the event organizer or a co-organizer/viewer team member.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params

  if (!eventId) {
    return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Authenticate the requesting user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminSupabase = createAdminClient()

  try {
    // 1. Verify the event exists and the user has access
    const { data: event, error: eventError } = await adminSupabase
      .from('events')
      .select('id, organizer_id, name, date, status')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if user is organizer or team member
    const isOrganizer = event.organizer_id === user.id
    if (!isOrganizer) {
      const { data: membership } = await adminSupabase
        .from('event_members')
        .select('id')
        .eq('event_id', eventId)
        .eq('member_id', user.id)
        .maybeSingle()

      if (!membership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // 2. Fetch all paid payments for this event
    const { data: payments, error: paymentsError } = await adminSupabase
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
        metadata
      `)
      .eq('event_id', eventId)
      .in('status', ['paid', 'refunded', 'disputed'])
      .order('paid_at', { ascending: false })

    if (paymentsError) {
      Sentry.captureException(paymentsError, {
        extra: { eventId, context: 'event_payments_fetch' },
      })
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    const paidPayments = (payments ?? []).filter(p => p.status === 'paid')

    // 3. Compute summary metrics
    const grossRevenueKobo = paidPayments.reduce((sum, p) => sum + (p.amount_kobo ?? 0), 0)
    const platformFeesKobo = paidPayments.reduce((sum, p) => sum + (p.platform_fee_kobo ?? 0), 0)
    const netOrganizerKobo = paidPayments.reduce((sum, p) => sum + (p.organiser_amount_kobo ?? 0), 0)

    const summary = {
      event_id:           eventId,
      event_name:         event.name,
      paid_count:         paidPayments.length,
      refunded_count:     (payments ?? []).filter(p => p.status === 'refunded').length,
      disputed_count:     (payments ?? []).filter(p => p.status === 'disputed').length,
      gross_revenue_kobo: grossRevenueKobo,
      platform_fees_kobo: platformFeesKobo,
      net_organizer_kobo: netOrganizerKobo,
      // Convenience NGN values (kobo / 100)
      gross_revenue_ngn:  grossRevenueKobo / 100,
      platform_fees_ngn:  platformFeesKobo / 100,
      net_organizer_ngn:  netOrganizerKobo / 100,
      currency:           'NGN',
    }

    return NextResponse.json({ summary, payments: payments ?? [] })
  } catch (err) {
    Sentry.captureException(err, { extra: { eventId, context: 'event_payments_route' } })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
