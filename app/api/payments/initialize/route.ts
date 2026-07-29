import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  initializeTransaction,
  generatePaystackReference,
  calculateSplit,
} from '@/lib/paystack'
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

  const supabase = createAdminClient()

  // 1. Verify the event exists, is open, and is published/live
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, organizer_id, name, event_type, status, max_registrations, registration_slug')
    .eq('id', event_id)
    .single()

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

  // 2. Verify the ticket tier exists, is public, and is not deleted
  const { data: tier, error: tierError } = await supabase
    .from('ticket_tiers')
    .select('id, name, price, currency, capacity')
    .eq('id', ticket_tier_id)
    .eq('event_id', event_id)
    .eq('is_public', true)
    .is('deleted_at', null)
    .single()

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

  // 4. Check registration capacity (soft check — DB trigger is the hard guard)
  if (event.max_registrations) {
    const { count } = await supabase
      .from('attendees')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event_id)
      .eq('source', 'public_registration')
      .not('registration_status', 'in', '(rejected,waitlist)')

    if ((count ?? 0) >= event.max_registrations) {
      return NextResponse.json({ error: 'This event is at capacity' }, { status: 409 })
    }
  }

  // 5. Check tier capacity (soft check)
  if (tier.capacity !== null) {
    const { count: tierCount } = await supabase
      .from('invitations')
      .select('*', { count: 'exact', head: true })
      .eq('ticket_tier_id', ticket_tier_id)
      .in('status', ['active', 'checked_in'])

    if ((tierCount ?? 0) >= tier.capacity) {
      return NextResponse.json({ error: 'This ticket tier is sold out' }, { status: 409 })
    }
  }

  // 6. Lookup organiser's Paystack subaccount
  const { data: paymentSettings } = await supabase
    .from('organizer_payment_settings')
    .select('paystack_subaccount_code, platform_fee_percent, is_verified')
    .eq('organizer_id', event.organizer_id)
    .maybeSingle()

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

  const { platformFeeKobo, organiserAmountKobo } = calculateSplit(tier.price, platformFeePercent)

  // 7. Create or reuse the attendee record (pending, will be accepted on payment success)
  const normalizedEmail = payer_email.trim().toLowerCase()
  const { data: existingPendingAttendee } = await supabase
    .from('attendees')
    .select('id')
    .eq('event_id', event_id)
    .eq('email', normalizedEmail)
    .eq('registration_status', 'pending')
    .maybeSingle()

  let attendeeId = existingPendingAttendee?.id

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
      amount_kobo: tier.price,
      platform_fee_kobo: platformFeeKobo,
      organiser_amount_kobo: organiserAmountKobo,
      currency: tier.currency,
      status: 'pending',
      payer_email,
      payer_name,
      metadata: {
        event_name: event.name,
        event_slug: event.registration_slug,
        tier_name: tier.name,
        organiser_id: event.organizer_id,
      },
    })

  if (paymentInsertError) {
    Sentry.captureException(paymentInsertError, {
      extra: { event_id, reference, context: 'payment_initialize_insert' },
    })
    // Clean up the attendee record we just created
    await supabase.from('attendees').delete().eq('id', attendeeId)
    return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 })
  }

  // 10. Initialize the transaction with Paystack
  // Derive the base URL from the request origin — NEXT_PUBLIC_APP_URL is a client-side
  // env var and may be undefined in an API route. An empty appUrl produces a relative
  // callback_url that Paystack cannot redirect back to.
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.APP_URL || request.nextUrl.origin)
  const { data: paystackData, error: paystackError } = await initializeTransaction({
    email: payer_email,
    amount: tier.price,
    reference,
    subaccount: paymentSettings?.paystack_subaccount_code ?? undefined,
    bearer: 'account', // Crenelle bears the Paystack processing fee
    // transaction_charge explicitly sets the flat kobo amount Crenelle retains.
    // This overrides the subaccount's default percentage_charge for this transaction,
    // guaranteeing the correct split (Crenelle gets platformFeeKobo, organiser gets the rest).
    // Only set when there is a subaccount — no split needed if organiser has no subaccount.
    transaction_charge: paymentSettings?.paystack_subaccount_code ? platformFeeKobo : undefined,
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
    // Roll back: mark payment as failed and clean up attendee
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('paystack_reference', reference)
    await supabase.from('attendees').delete().eq('id', attendeeId)

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
    amount_kobo: tier.price,
    currency: tier.currency,
  })
}
