import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  initializeTransaction,
  generatePaystackReference,
  calculatePaymentBreakdown,
} from '@/lib/paystack'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import * as Sentry from '@sentry/nextjs'

/**
 * POST /api/payments/initialize
 *
 * Starts a Paystack payment for a ticket tier on a public registration.
 * Returns the Paystack authorization_url to redirect the guest to.
 *
 * Body:
 *   event_id        — UUID of the event
 *   ticket_tier_id  — UUID of the selected tier
 *   payer_email     — guest's email
 *   payer_name      — guest's full name
 *   payer_phone     — guest's phone (optional)
 *
 * Returns:
 *   { authorization_url, reference } — redirect the guest to authorization_url
 */
export async function POST(request: NextRequest) {
  let body: {
    event_id?: string
    ticket_tier_id?: string
    payer_email?: string
    payer_name?: string
    payer_phone?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { event_id, ticket_tier_id, payer_email, payer_name, payer_phone } = body

  // Validate required fields
  if (!event_id || !ticket_tier_id || !payer_email || !payer_name) {
    return NextResponse.json(
      { error: 'event_id, ticket_tier_id, payer_email, and payer_name are required' },
      { status: 400 }
    )
  }

  // ── Rate limiting (IP & Email) ─────────────────────────────────
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const ipLimit = await checkRateLimitAsync({
    key: `pay_init_ip:${ip}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  })
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many payment initialization attempts. Please try again later.' },
      { status: 429 }
    )
  }

  const normalizedEmail = payer_email.trim().toLowerCase()
  const emailLimit = await checkRateLimitAsync({
    key: `pay_init_email:${normalizedEmail}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  })
  if (!emailLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many payment initialization attempts for this email address. Please wait before trying again.' },
      { status: 429 }
    )
  }

  const supabase = createAdminClient()

  // 1 & 2. Fetch event and tier concurrently — both are keyed on request inputs
  // and independent of each other.
  const [
    { data: event, error: eventError },
    { data: tier, error: tierError },
  ] = await Promise.all([
    supabase
      .from('events')
      .select('id, organizer_id, name, event_type, status, max_registrations, registration_slug')
      .eq('id', event_id)
      .single(),
    supabase
      .from('ticket_tiers')
      .select('id, name, price, currency, capacity')
      .eq('id', ticket_tier_id)
      .eq('event_id', event_id)
      .eq('is_public', true)
      .is('deleted_at', null)
      .single(),
  ])

  // Validate event
  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }
  if (event.event_type !== 'open') {
    return NextResponse.json({ error: 'This event does not accept public registrations' }, { status: 400 })
  }
  if (event.status === 'draft') {
    return NextResponse.json({ error: 'Registration is not yet open' }, { status: 400 })
  }
  if (event.status === 'ended') {
    return NextResponse.json({ error: 'This event has ended' }, { status: 400 })
  }

  // Validate ticket tier
  if (tierError || !tier) {
    return NextResponse.json({ error: 'Ticket tier not found or unavailable' }, { status: 404 })
  }

  // 3. Free tiers should not go through payment — use the standard registration flow
  if (tier.price === 0) {
    return NextResponse.json(
      { error: 'This ticket is free — use the standard registration flow' },
      { status: 400 }
    )
  }

  // 4/5/6. The two capacity counts and the organiser payment-settings lookup are
  // all independent once we have the event + tier — batch them in one round-trip.
  // (Counts are only issued when their capacity limit is set; skipped ones resolve null.)
  const [
    { count: registrationCount },
    { count: tierCount },
    { data: paymentSettings },
  ] = await Promise.all([
    event.max_registrations
      ? supabase
          .from('attendees')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event_id)
          .eq('source', 'public_registration')
          .not('registration_status', 'in', '(rejected,waitlist)')
      : Promise.resolve({ count: null as number | null }),
    tier.capacity !== null
      ? supabase
          .from('invitations')
          .select('*', { count: 'exact', head: true })
          .eq('ticket_tier_id', ticket_tier_id)
          .in('status', ['active', 'checked_in'])
      : Promise.resolve({ count: null as number | null }),
    supabase
      .from('organizer_payment_settings')
      .select('paystack_subaccount_code, platform_fee_percent, is_verified')
      .eq('organizer_id', event.organizer_id)
      .maybeSingle(),
  ])

  // Check registration capacity (soft check — DB trigger is the hard guard)
  if (event.max_registrations && (registrationCount ?? 0) >= event.max_registrations) {
    return NextResponse.json({ error: 'This event is at capacity' }, { status: 409 })
  }

  // Check tier capacity (soft check)
  if (tier.capacity !== null && (tierCount ?? 0) >= tier.capacity) {
    return NextResponse.json({ error: 'This ticket tier is sold out' }, { status: 409 })
  }

  // Allow payment without subaccount (Crenelle collects full amount)
  // but warn in logs so ops can follow up
  if (!paymentSettings?.paystack_subaccount_code) {
    console.warn(
      `[Paystack Init] Organiser ${event.organizer_id} has no subaccount — full amount goes to Crenelle main account`
    )
  }

  const platformFeePercent =
    paymentSettings?.platform_fee_percent ??
    parseFloat(process.env.PAYSTACK_PLATFORM_FEE_PERCENT ?? '5')

  const breakdown = calculatePaymentBreakdown(tier.price, platformFeePercent)

  // 7. Create or reuse the attendee record (pending, will be accepted on payment success)
  const { data: existingPendingAttendee } = await supabase
    .from('attendees')
    .select('id')
    .eq('event_id', event_id)
    .eq('email', normalizedEmail)
    .eq('registration_status', 'pending')
    .maybeSingle()

  let attendeeId = existingPendingAttendee?.id
  let isNewAttendee = false

  if (!attendeeId) {
    const { data: attendee, error: attendeeError } = await supabase
      .from('attendees')
      .insert({
        event_id,
        name: payer_name,
        email: normalizedEmail,
        phone: payer_phone ?? null,
        source: 'public_registration',
        registration_status: 'pending',
        ticket_tier_id,
      })
      .select('id')
      .single()

    if (attendeeError) {
      // Handle duplicate registration (e.g. they are already accepted or waitlisted)
      if (attendeeError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already registered for this event with this email' },
          { status: 409 }
        )
      }
      Sentry.captureException(attendeeError, {
        extra: { event_id, context: 'payment_initialize_attendee_insert' },
      })
      return NextResponse.json({ error: 'Failed to create registration' }, { status: 500 })
    }
    attendeeId = attendee.id
    isNewAttendee = true
  } else {
    // Update existing pending attendee with potentially new details
    const { error: attendeeUpdateError } = await supabase
      .from('attendees')
      .update({
        name: payer_name,
        phone: payer_phone ?? null,
        ticket_tier_id,
      })
      .eq('id', attendeeId)

    if (attendeeUpdateError) {
      Sentry.captureException(attendeeUpdateError, {
        extra: { event_id, attendeeId, context: 'payment_initialize_attendee_update' },
      })
      return NextResponse.json({ error: 'Failed to update registration' }, { status: 500 })
    }
  }

  // 8. Generate a unique payment reference
  const reference = generatePaystackReference(event_id)

  // 9. Create the pending payment record in our DB
  const { error: paymentInsertError } = await supabase
    .from('payments')
    .insert({
      event_id,
      attendee_id: attendeeId,
      ticket_tier_id,
      paystack_reference: reference,
      amount_kobo: breakdown.totalAmountKobo,
      platform_fee_kobo: breakdown.crenelleChargeKobo,
      organiser_amount_kobo: breakdown.organiserPayoutKobo,
      currency: tier.currency,
      status: 'pending',
      payer_email,
      payer_name,
      metadata: {
        event_name: event.name,
        event_slug: event.registration_slug,
        tier_name: tier.name,
        organiser_id: event.organizer_id,
        ticket_fee_kobo: breakdown.ticketFeeKobo,
        crenelle_charge_kobo: breakdown.crenelleChargeKobo,
        paystack_fee_kobo: breakdown.paystackFeeKobo,
      },
    })

  if (paymentInsertError) {
    Sentry.captureException(paymentInsertError, {
      extra: { event_id, reference, context: 'payment_initialize_insert' },
    })
    // Clean up the attendee record ONLY if created in this request
    if (isNewAttendee && attendeeId) {
      await supabase.from('attendees').delete().eq('id', attendeeId)
    }
    return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 })
  }

  // 10. Initialize the transaction with Paystack
  // Derive the base URL from the request origin — NEXT_PUBLIC_APP_URL is a client-side
  // env var and may be undefined in an API route. An empty appUrl produces a relative
  // callback_url that Paystack cannot redirect back to.
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.APP_URL || request.nextUrl.origin)
  const { data: paystackData, error: paystackError } = await initializeTransaction({
    email: payer_email,
    amount: breakdown.totalAmountKobo,
    reference,
    subaccount: paymentSettings?.paystack_subaccount_code ?? undefined,
    bearer: 'account', // Crenelle main account explicitly bears the Paystack processing fee
    // transaction_charge sets the flat kobo amount Crenelle retains.
    // Crenelle retains breakdown.crenelleChargeKobo so subaccount receives totalAmountKobo - crenelleChargeKobo = 100% of ticket price.
    transaction_charge: paymentSettings?.paystack_subaccount_code
      ? breakdown.crenelleChargeKobo
      : undefined,
    callback_url: `${appUrl}/api/payments/verify?reference=${reference}`,
    channels: ['card', 'bank', 'ussd', 'bank_transfer'],
    metadata: {
      event_id,
      event_name: event.name,
      tier_id: ticket_tier_id,
      tier_name: tier.name,
      attendee_id: attendeeId,
      payer_name,
    },
  })

  if (paystackError || !paystackData) {
    // Roll back: mark payment as failed and clean up attendee if newly created
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('paystack_reference', reference)
    if (isNewAttendee && attendeeId) {
      await supabase.from('attendees').delete().eq('id', attendeeId)
    }

    Sentry.captureMessage('[Paystack Init] Failed to initialize Paystack transaction', {
      level: 'error',
      extra: { event_id, reference, error: paystackError },
    })
    return NextResponse.json(
      { error: paystackError ?? 'Failed to initialize payment. Please try again.' },
      { status: 502 }
    )
  }

  return NextResponse.json({
    authorization_url: paystackData.authorization_url,
    reference,
    amount_kobo: breakdown.totalAmountKobo,
    currency: tier.currency,
  })
}
