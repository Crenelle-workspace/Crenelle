import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPaystackSignature } from '@/lib/paystack'
import { sendInvitationEmail } from '@/lib/email'
import { sendInvitationWhatsApp } from '@/lib/whatsapp'
import type { PaystackWebhookEvent } from '@/lib/types'
import * as Sentry from '@sentry/nextjs'

/**
 * POST /api/webhooks/paystack
 *
 * Receives Paystack webhook events and processes payment confirmations.
 *
 * Security:
 *   - HMAC-SHA512 signature verified on every request
 *   - Idempotent: duplicate events for the same reference are skipped
 *   - Amount verified against our DB record (prevents price tampering)
 *
 * Paystack expects a 200 response within 30 seconds.
 * Heavy work (email/WhatsApp) is awaited inline — fast enough in practice.
 * If latency becomes an issue, move to a background queue.
 */
export async function POST(request: NextRequest) {
  // 1. Read raw body for HMAC verification (must be done before parsing JSON)
  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature')

  // 2. Verify HMAC-SHA512 signature
  let isValid: boolean
  try {
    isValid = verifyPaystackSignature(rawBody, signature)
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'paystack_webhook_hmac_check' } })
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 500 })
  }

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // 3. Parse the event payload
  let event: PaystackWebhookEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 4. Route by event type
  switch (event.event) {
    case 'charge.success':
      return handleChargeSuccess(event, supabase)

    case 'charge.failed':
      return handleChargeFailed(event, supabase)

    case 'transfer.reversed':
      return handleTransferReversed(event, supabase)

    default:
      // Acknowledge all other events (Paystack retries unacknowledged ones)
      return NextResponse.json({ received: true }, { status: 200 })
  }
}

// ── charge.success ────────────────────────────────────────────

async function handleChargeSuccess(
  event: PaystackWebhookEvent,
  supabase: ReturnType<typeof createAdminClient>
): Promise<NextResponse> {
  const { reference, amount, channel, paid_at, customer, id: paystackTransactionId } = event.data

  try {
    // 1. Look up our pending payment record
    const { data: payment, error: paymentLookupError } = await supabase
      .from('payments')
      .select('*')
      .eq('paystack_reference', reference)
      .maybeSingle()

    if (paymentLookupError) {
      Sentry.captureException(paymentLookupError, {
        extra: { reference, context: 'paystack_webhook_payment_lookup' },
      })
      return NextResponse.json({ error: 'Payment lookup failed' }, { status: 500 })
    }

    if (!payment) {
      // Payment reference not found — could be a test event or a reference not created by us
      // Return 200 to prevent Paystack from retrying indefinitely
      console.warn('[Paystack Webhook] Received charge.success for unknown reference:', reference)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // 2. Idempotency: skip if already processed
    if (payment.status === 'paid') {
      return NextResponse.json({ received: true, skipped: 'already_processed' }, { status: 200 })
    }

    // 3. Fraud check: verify amount matches what we expected
    if (amount !== payment.amount_kobo) {
      Sentry.captureMessage('[Paystack Webhook] Amount mismatch — possible tampering', {
        level: 'error',
        extra: { reference, expected: payment.amount_kobo, received: amount },
      })
      // Mark as failed — do NOT activate the invitation
      await supabase
        .from('payments')
        .update({ status: 'failed', webhook_received_at: new Date().toISOString() })
        .eq('paystack_reference', reference)
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 200 }) // still 200 to stop retries
    }

    // 4. Update payment record: mark as paid
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        status: 'paid',
        paystack_transaction_id: paystackTransactionId,
        paystack_channel: channel,
        paid_at: paid_at ?? new Date().toISOString(),
        webhook_received_at: new Date().toISOString(),
      })
      .eq('paystack_reference', reference)

    if (updatePaymentError) {
      Sentry.captureException(updatePaymentError, {
        extra: { reference, context: 'paystack_webhook_update_payment' },
      })
      return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 })
    }

    // 5. Get or create the attendee
    let attendeeId = payment.attendee_id

    if (!attendeeId) {
      // Direct-purchase flow: attendee wasn't created yet (future use case)
      // For the current MVP, attendee_id is always set at payment initialization
      Sentry.captureMessage('[Paystack Webhook] Payment has no attendee_id', {
        level: 'warning',
        extra: { reference, paymentId: payment.id },
      })
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // 6. Mark attendee as accepted
    await supabase
      .from('attendees')
      .update({ registration_status: 'accepted' })
      .eq('id', attendeeId)

    // 7. Create the invitation (if not already created — idempotency guard)
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('attendee_id', attendeeId)
      .eq('event_id', payment.event_id)
      .maybeSingle()

    let invitationId: string | null = existingInvitation?.id ?? null

    if (!existingInvitation) {
      const { data: newInvitation, error: invError } = await supabase
        .from('invitations')
        .insert({
          event_id: payment.event_id,
          attendee_id: attendeeId,
          party_size: 1,
          status: 'active',
          ticket_tier_id: payment.ticket_tier_id,
          payment_reference: reference,
          payment_status: 'paid',
          amount_paid_kobo: amount,
          paid_at: paid_at ?? new Date().toISOString(),
        })
        .select('id')
        .single()

      if (invError) {
        Sentry.captureException(invError, {
          extra: { reference, attendeeId, context: 'paystack_webhook_create_invitation' },
        })
        return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
      }

      invitationId = newInvitation.id
    } else {
      // Update existing invitation with payment details
      await supabase
        .from('invitations')
        .update({
          status: 'active',
          payment_reference: reference,
          payment_status: 'paid',
          amount_paid_kobo: amount,
          paid_at: paid_at ?? new Date().toISOString(),
        })
        .eq('id', existingInvitation.id)
    }

    // 8. Fetch event + attendee details for the email
    const { data: eventData } = await supabase
      .from('events')
      .select('name, date, time, venue, description, banner_url')
      .eq('id', payment.event_id)
      .single()

    const { data: attendee } = await supabase
      .from('attendees')
      .select('name, email, phone')
      .eq('id', attendeeId)
      .single()

    // 9. Send invitation email with QR code
    if (attendee?.email && eventData && invitationId) {
      try {
        await sendInvitationEmail({
          eventId: payment.event_id,
          recipientEmail: attendee.email,
          recipientName: attendee.name,
          invitationId,
          event: eventData,
        })
      } catch (e) {
        // Non-fatal: log and continue — payment is confirmed, email can be resent
        Sentry.captureException(e, {
          extra: { reference, attendeeId, context: 'paystack_webhook_send_email' },
        })
      }
    }

    // 10. Send WhatsApp invitation (non-fatal if it fails)
    if (attendee?.phone && eventData && invitationId) {
      try {
        await sendInvitationWhatsApp({
          eventId: payment.event_id,
          recipientPhone: attendee.phone,
          recipientName: attendee.name,
          invitationId,
          event: eventData,
        })
      } catch (e) {
        Sentry.captureException(e, {
          extra: { reference, attendeeId, context: 'paystack_webhook_send_whatsapp' },
        })
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    Sentry.captureException(err, {
      extra: { reference, context: 'paystack_webhook_charge_success' },
    })
    // Return 500 so Paystack retries — payment was successful but we failed to process
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ── charge.failed ─────────────────────────────────────────────

async function handleChargeFailed(
  event: PaystackWebhookEvent,
  supabase: ReturnType<typeof createAdminClient>
): Promise<NextResponse> {
  const { reference } = event.data

  try {
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        webhook_received_at: new Date().toISOString(),
      })
      .eq('paystack_reference', reference)
      .eq('status', 'pending') // only update if still pending (idempotency)
  } catch (err) {
    Sentry.captureException(err, {
      extra: { reference, context: 'paystack_webhook_charge_failed' },
    })
  }

  return NextResponse.json({ received: true }, { status: 200 })
}

// ── transfer.reversed ─────────────────────────────────────────

async function handleTransferReversed(
  event: PaystackWebhookEvent,
  supabase: ReturnType<typeof createAdminClient>
): Promise<NextResponse> {
  const { reference } = event.data

  try {
    // Mark payment as refunded
    const { data: payment } = await supabase
      .from('payments')
      .update({
        status: 'refunded',
        webhook_received_at: new Date().toISOString(),
      })
      .eq('paystack_reference', reference)
      .select('id, event_id, attendee_id')
      .maybeSingle()

    // Cancel the associated invitation if one exists
    if (payment?.attendee_id) {
      await supabase
        .from('invitations')
        .update({
          status: 'cancelled',
          payment_status: 'refunded',
        })
        .eq('attendee_id', payment.attendee_id)
        .eq('event_id', payment.event_id)
    }
  } catch (err) {
    Sentry.captureException(err, {
      extra: { reference, context: 'paystack_webhook_transfer_reversed' },
    })
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
