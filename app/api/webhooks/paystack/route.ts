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
 * Audit:
 *   - Every inbound payload is stored in webhook_events BEFORE processing
 *   - This enables replay, debugging, and compliance auditing
 *
 * Paystack expects a 200 response within 30 seconds.
 * Heavy work (email/WhatsApp) is awaited inline — fast enough in practice.
 * If latency becomes an issue, move to a background queue.
 */
export async function POST(request: NextRequest) {
  // 1. Read raw body for HMAC verification (must be done before parsing JSON)
  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature')
  const idempotencyKey = request.headers.get('x-paystack-idempotency-key') ?? undefined

  const supabase = createAdminClient()

  // 2. Verify HMAC-SHA512 signature
  let isValid: boolean
  try {
    isValid = verifyPaystackSignature(rawBody, signature)
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'paystack_webhook_hmac_check' } })
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 500 })
  }

  // 3. Parse the event payload (even if invalid — we want to log everything)
  let event: PaystackWebhookEvent | null = null
  try {
    event = JSON.parse(rawBody) as PaystackWebhookEvent
  } catch {
    // Store the unparseable payload before rejecting
    await logWebhookEvent(supabase, {
      rawPayload: rawBody,
      signatureValid: isValid,
      idempotencyKey,
    })
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  // 4. Store raw payload in audit log (BEFORE processing — survivable even if handler crashes)
  const reference = event.data?.reference ?? null
  const eventType = event.event ?? null
  await logWebhookEvent(supabase, {
    eventType,
    reference,
    rawPayload: rawBody,
    signatureValid: isValid,
    idempotencyKey,
  })

  // 5. Reject invalid signatures after logging (so we have a record of the attempt)
  if (!isValid) {
    Sentry.captureMessage('[Paystack Webhook] Invalid signature received', {
      level: 'warning',
      extra: { eventType, reference },
    })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // 6. Route by event type
  switch (event.event) {
    case 'charge.success':
      return handleChargeSuccess(event, supabase)

    case 'charge.failed':
      return handleChargeFailed(event, supabase)

    case 'refund.processed':
      return handleRefundProcessed(event, supabase)

    case 'charge.dispute.create':
      return handleDisputeCreated(event, supabase)

    case 'charge.dispute.resolve':
      return handleDisputeResolved(event, supabase)

    case 'transfer.reversed':
      // Log the reversed transfer, but do NOT cancel guest tickets (payout failures only)
      console.warn('[Paystack Webhook] Payout transfer reversed:', event.data.reference)
      return NextResponse.json({ received: true }, { status: 200 })

    default:
      // Acknowledge all other events (Paystack retries unacknowledged ones)
      return NextResponse.json({ received: true }, { status: 200 })
  }
}

// ── Audit logger ──────────────────────────────────────────────

/**
 * Store every inbound webhook payload in the webhook_events audit table.
 * This is non-fatal — if it fails, we log to Sentry but continue processing.
 */
async function logWebhookEvent(
  supabase: ReturnType<typeof createAdminClient>,
  opts: {
    eventType?: string | null
    reference?: string | null
    rawPayload: string
    signatureValid: boolean
    idempotencyKey?: string
  }
) {
  try {
    await supabase.from('webhook_events').insert({
      source: 'paystack',
      event_type: opts.eventType ?? null,
      paystack_reference: opts.reference ?? null,
      raw_payload: JSON.parse(opts.rawPayload),
      signature_valid: opts.signatureValid,
      idempotency_key: opts.idempotencyKey ?? null,
    })
  } catch (err) {
    // Non-fatal: losing an audit log entry is bad but must not block payment processing
    Sentry.captureException(err, {
      extra: { context: 'paystack_webhook_audit_log', eventType: opts.eventType },
    })
  }
}

// ── charge.success ────────────────────────────────────────────

async function handleChargeSuccess(
  event: PaystackWebhookEvent,
  supabase: ReturnType<typeof createAdminClient>
): Promise<NextResponse> {
  const { reference, amount, channel, paid_at, id: paystackTransactionId } = event.data

  try {
    // ── Atomic DB writes via Postgres RPC ─────────────────────────────────────
    // process_charge_success runs in a single BEGIN/COMMIT transaction block.
    // It handles: idempotency, payment update, attendee accept, invitation upsert.
    // No more sequential writes that can leave partial state on server crash.
    const { data: rpcResult, error: rpcError } = await supabase.rpc('process_charge_success', {
      p_reference:               reference,
      p_paystack_transaction_id: paystackTransactionId,
      p_channel:                 channel,
      p_paid_at:                 paid_at ?? new Date().toISOString(),
      p_amount_kobo:             amount,
    })

    if (rpcError) {
      Sentry.captureException(rpcError, {
        extra: { reference, context: 'paystack_webhook_rpc_process_charge_success' },
      })
      // Return 500 so Paystack retries this webhook
      return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 })
    }

    const result = rpcResult as {
      outcome: 'created' | 'updated' | 'already_processed' | 'not_found' | 'amount_mismatch' | 'error'
      invitation_id?: string | null
      attendee_id?: string | null
      event_id?: string | null
      message?: string
      sqlstate?: string
    }

    // Handle each outcome from the RPC
    switch (result.outcome) {
      case 'not_found':
        console.warn('[Paystack Webhook] Received charge.success for unknown reference:', reference)
        return NextResponse.json({ received: true }, { status: 200 })

      case 'already_processed': {
        // The DB was already updated (payment = 'paid') but Paystack retried because it
        // never received a 200 (e.g. our first handler run timed out after the RPC commit).
        // We must still attempt to send the invitation if it hasn't gone out yet.
        // Note: the pending-check cron also covers this case (runs every 15 min) — this
        // handler closes the gap for webhook retries that arrive before the cron fires.
        const attendeeId = result.attendee_id ?? null
        const eventId    = result.event_id ?? null

        if (!attendeeId || !eventId) {
          return NextResponse.json({ received: true, skipped: 'already_processed' }, { status: 200 })
        }

        // Look up invitation + attendee in parallel (attendee email needed for dedup check)
        const [{ data: existingInv }, { data: attendee }] = await Promise.all([
          supabase
            .from('invitations')
            .select('id')
            .eq('attendee_id', attendeeId)
            .eq('event_id', eventId)
            .maybeSingle(),
          supabase
            .from('attendees')
            .select('name, email, phone')
            .eq('id', attendeeId)
            .single(),
        ])

        if (!existingInv?.id || !attendee?.email) {
          // No invitation or no email address — nothing to send
          return NextResponse.json({ received: true, skipped: 'already_processed' }, { status: 200 })
        }

        // Dedup: check if an invitation email has already been sent to this specific recipient.
        // Must filter by recipient_email (not just event_id) — events have multiple attendees.
        const { data: existingLog } = await supabase
          .from('email_logs')
          .select('id')
          .eq('event_id', eventId)
          .eq('email_type', 'invitation')
          .ilike('recipient_email', attendee.email)
          .maybeSingle()

        if (existingLog) {
          // Email already sent to this attendee — safe to skip
          console.log('[Paystack Webhook] already_processed — invitation email already sent, skipping')
          return NextResponse.json({ received: true, skipped: 'already_processed' }, { status: 200 })
        }

        // Email hasn't been sent yet — fetch event details and send now
        console.log('[Paystack Webhook] already_processed — resending missed invitation notifications')

        const { data: eventData } = await supabase
          .from('events')
          .select('name, date, time, venue, description, banner_url')
          .eq('id', eventId)
          .single()

        if (attendee.email && eventData) {
          sendInvitationEmail({
            eventId,
            recipientEmail: attendee.email,
            recipientName: attendee.name,
            invitationId: existingInv.id,
            event: eventData,
          }).catch((e) =>
            Sentry.captureException(e, {
              extra: { reference, attendeeId, context: 'paystack_webhook_resend_email_on_retry' },
            })
          )
        }

        if (attendee.phone && eventData) {
          sendInvitationWhatsApp({
            eventId,
            recipientPhone: attendee.phone,
            recipientName: attendee.name,
            invitationId: existingInv.id,
            event: eventData,
          }).catch((e) =>
            Sentry.captureException(e, {
              extra: { reference, attendeeId, context: 'paystack_webhook_resend_whatsapp_on_retry' },
            })
          )
        }

        return NextResponse.json({ received: true, skipped: 'already_processed' }, { status: 200 })
      }

      case 'amount_mismatch':
        Sentry.captureMessage('[Paystack Webhook] Amount mismatch detected by RPC — possible tampering', {
          level: 'error',
          extra: { reference, expected: result.message },
        })
        return NextResponse.json({ error: 'Amount mismatch' }, { status: 200 }) // 200 stops retries

      case 'error':
        Sentry.captureMessage('[Paystack Webhook] RPC returned DB error', {
          level: 'error',
          extra: { reference, sqlstate: result.sqlstate, message: result.message },
        })
        // 500 tells Paystack to retry
        return NextResponse.json({ error: 'DB error during processing' }, { status: 500 })

      case 'created':
      case 'updated':
        // Fall through to send notifications
        break
    }

    // Invitation was upserted — now send notifications
    const invitationId = result.invitation_id ?? null
    const attendeeId   = result.attendee_id ?? null
    const eventId      = result.event_id ?? null

    if (!invitationId || !attendeeId || !eventId) {
      // Shouldn't happen for 'created'/'updated', but guard anyway
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Fetch event + attendee details for email/WhatsApp (outside the transaction — read-only)
    const [{ data: eventData }, { data: attendee }] = await Promise.all([
      supabase
        .from('events')
        .select('name, date, time, venue, description, banner_url')
        .eq('id', eventId)
        .single(),
      supabase
        .from('attendees')
        .select('name, email, phone')
        .eq('id', attendeeId)
        .single(),
    ])

    // Send invitation email (non-fatal)
    if (attendee?.email && eventData) {
      sendInvitationEmail({
        eventId,
        recipientEmail: attendee.email,
        recipientName: attendee.name,
        invitationId,
        event: eventData,
      }).catch((e) =>
        Sentry.captureException(e, {
          extra: { reference, attendeeId, context: 'paystack_webhook_send_email' },
        })
      )
    }

    // Send WhatsApp invitation (non-fatal)
    if (attendee?.phone && eventData) {
      sendInvitationWhatsApp({
        eventId,
        recipientPhone: attendee.phone,
        recipientName: attendee.name,
        invitationId,
        event: eventData,
      }).catch((e) =>
        Sentry.captureException(e, {
          extra: { reference, attendeeId, context: 'paystack_webhook_send_whatsapp' },
        })
      )
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

// ── refund.processed ──────────────────────────────────────────

/**
 * Handles Paystack refund confirmation.
 * Updates the payment and invitation to 'refunded' status.
 * The guide (§9 checklist): "refund.processed ... webhooks are handled, signature-verified"
 */
async function handleRefundProcessed(
  event: PaystackWebhookEvent,
  supabase: ReturnType<typeof createAdminClient>
): Promise<NextResponse> {
  const { reference } = event.data

  try {
    // 1. Look up the original payment
    const { data: payment, error: lookupError } = await supabase
      .from('payments')
      .select('id, attendee_id, event_id, status')
      .eq('paystack_reference', reference)
      .maybeSingle()

    if (lookupError) {
      Sentry.captureException(lookupError, {
        extra: { reference, context: 'paystack_webhook_refund_lookup' },
      })
      return NextResponse.json({ error: 'Payment lookup failed' }, { status: 500 })
    }

    if (!payment) {
      console.warn('[Paystack Webhook] Received refund.processed for unknown reference:', reference)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // 2. Idempotency: skip if already refunded
    if (payment.status === 'refunded') {
      return NextResponse.json({ received: true, skipped: 'already_refunded' }, { status: 200 })
    }

    // 3. Update payment status to refunded
    await supabase
      .from('payments')
      .update({
        status: 'refunded',
        webhook_received_at: new Date().toISOString(),
      })
      .eq('paystack_reference', reference)

    // 4. Update the linked invitation's payment status
    if (payment.attendee_id && payment.event_id) {
      await supabase
        .from('invitations')
        .update({ payment_status: 'refunded' })
        .eq('attendee_id', payment.attendee_id)
        .eq('event_id', payment.event_id)
    }

    Sentry.captureMessage('[Paystack Webhook] Refund processed', {
      level: 'info',
      extra: { reference, paymentId: payment.id },
    })

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    Sentry.captureException(err, {
      extra: { reference, context: 'paystack_webhook_refund_processed' },
    })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ── charge.dispute.create ─────────────────────────────────────

/**
 * Handles a new payment dispute (chargeback initiated by cardholder).
 * Guide (§9): "alert a human for disputes"
 * Strategy: mark payment as 'disputed' and fire a high-priority Sentry alert.
 */
async function handleDisputeCreated(
  event: PaystackWebhookEvent,
  supabase: ReturnType<typeof createAdminClient>
): Promise<NextResponse> {
  const { reference } = event.data

  try {
    // 1. Look up the original payment
    const { data: payment } = await supabase
      .from('payments')
      .select('id, attendee_id, event_id, amount_kobo, payer_email, payer_name, status')
      .eq('paystack_reference', reference)
      .maybeSingle()

    if (!payment) {
      console.warn('[Paystack Webhook] Received dispute.create for unknown reference:', reference)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // 2. Idempotency
    if (payment.status === 'disputed') {
      return NextResponse.json({ received: true, skipped: 'already_disputed' }, { status: 200 })
    }

    // 3. Mark payment as disputed
    await supabase
      .from('payments')
      .update({
        status: 'disputed',
        webhook_received_at: new Date().toISOString(),
      })
      .eq('paystack_reference', reference)

    // 4. Update invitation payment status
    if (payment.attendee_id && payment.event_id) {
      await supabase
        .from('invitations')
        .update({ payment_status: 'disputed' })
        .eq('attendee_id', payment.attendee_id)
        .eq('event_id', payment.event_id)
    }

    // 5. Fire a high-priority Sentry alert for human review
    // The guide explicitly states: "alert a human for disputes"
    Sentry.captureMessage('[URGENT] Paystack dispute created — manual review required', {
      level: 'error',
      extra: {
        reference,
        paymentId: payment.id,
        payerEmail: payment.payer_email,
        payerName: payment.payer_name,
        amountKobo: payment.amount_kobo,
        eventId: payment.event_id,
        rawDisputeData: event.data,
      },
      tags: {
        dispute: 'created',
        requires_action: 'true',
      },
    })

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    Sentry.captureException(err, {
      extra: { reference, context: 'paystack_webhook_dispute_create' },
    })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ── charge.dispute.resolve ────────────────────────────────────

/**
 * Handles dispute resolution from Paystack.
 * If resolved in merchant's favour → restore 'paid'.
 * If resolved against merchant → keep 'disputed' (funds already reversed by bank).
 */
async function handleDisputeResolved(
  event: PaystackWebhookEvent,
  supabase: ReturnType<typeof createAdminClient>
): Promise<NextResponse> {
  const { reference } = event.data
  // Paystack dispute resolution data sits under event.data.resolution
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolution = (event.data as any).resolution as string | undefined

  try {
    const { data: payment } = await supabase
      .from('payments')
      .select('id, attendee_id, event_id, status')
      .eq('paystack_reference', reference)
      .maybeSingle()

    if (!payment) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const merchantWon = resolution === 'merchant-won'
    const newStatus = merchantWon ? 'paid' : 'disputed' // keep 'disputed' if merchant lost

    await supabase
      .from('payments')
      .update({
        status: newStatus,
        webhook_received_at: new Date().toISOString(),
      })
      .eq('paystack_reference', reference)

    if (payment.attendee_id && payment.event_id) {
      await supabase
        .from('invitations')
        .update({ payment_status: merchantWon ? 'paid' : 'disputed' })
        .eq('attendee_id', payment.attendee_id)
        .eq('event_id', payment.event_id)
    }

    Sentry.captureMessage(`[Paystack Webhook] Dispute resolved — ${resolution ?? 'unknown outcome'}`, {
      level: merchantWon ? 'info' : 'error',
      extra: { reference, paymentId: payment.id, resolution, newStatus },
      tags: { dispute: 'resolved' },
    })

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    Sentry.captureException(err, {
      extra: { reference, context: 'paystack_webhook_dispute_resolve' },
    })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// handleTransferReversed is deprecated and no longer used to avoid cancelling guest tickets on payout failure.
// Payout reversals are instead logged/warned at the switch-case routing level.
