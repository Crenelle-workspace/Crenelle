import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyTransaction } from '@/lib/paystack'
import { sendInvitationEmail } from '@/lib/email'
import { sendInvitationWhatsApp } from '@/lib/whatsapp'
import * as Sentry from '@sentry/nextjs'

export const dynamic = 'force-dynamic'

/**
 * GET /api/payments/verify?reference={ref}
 *
 * Fallback verification called when Paystack redirects the guest back
 * after payment (via callback_url). The webhook is the primary mechanism;
 * this route handles the case where the webhook hasn't fired yet or
 * the guest refreshes the page after being redirected back.
 *
 * Behaviour:
 *   - If payment already marked 'paid' in DB → redirect to success page
 *   - If Paystack confirms 'success' but DB still 'pending' → process it here
 *   - If payment failed → redirect to failure page
 *   - If reference unknown → redirect to generic error
 */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get('reference')
  // Use request origin as the authoritative base URL — NEXT_PUBLIC_APP_URL is a
  // client-side env var and may be undefined / empty string in an API route,
  // which would cause NextResponse.redirect() to receive a relative path and fail.
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.APP_URL || request.nextUrl.origin)

  if (!reference) {
    return NextResponse.redirect(`${appUrl}/?payment=error&reason=missing_reference`)
  }

  const supabase = createAdminClient()

  // 1. Check our DB first (fast path — webhook may have already processed it)
  const { data: payment, error: dbError } = await supabase
    .from('payments')
    .select('status, event_id, attendee_id, ticket_tier_id, amount_kobo, currency, payer_email, payer_name, metadata')
    .eq('paystack_reference', reference)
    .maybeSingle()

  if (dbError) {
    Sentry.captureException(dbError, {
      extra: { reference, context: 'payment_verify_db_lookup' },
    })
  }

  // Payment already confirmed by webhook → redirect to success
  // But first: check whether the invitation email actually went out.
  // The webhook handler sends it fire-and-forget — if it silently failed
  // (Resend error, QR timeout, etc.) we catch it here via email_logs dedup.
  if (payment?.status === 'paid') {
    // Safety net: the webhook may have recorded the payment but failed to deliver
    // the pass. This whole block is AWAITED deliberately.
    //
    // It previously ran as a detached `Promise.all(...).then(...)` so as not to
    // block the redirect — but on Vercel the function instance is frozen the
    // moment the redirect is returned, so the detached work was killed before
    // Resend was ever called. That made this safety net a no-op and left paid
    // guests without a ticket. Awaiting costs the guest ~1s on the success
    // redirect, which is a fair price for actually receiving the pass.
    if (payment.attendee_id && payment.event_id) {
      const attendeeId = payment.attendee_id
      const eventId    = payment.event_id

      try {
        const [{ data: attendee }, { data: inv }] = await Promise.all([
          supabase.from('attendees').select('name, email, phone').eq('id', attendeeId).single(),
          supabase.from('invitations').select('id').eq('attendee_id', attendeeId).eq('event_id', eventId).maybeSingle(),
        ])

        if (attendee?.email && inv?.id) {
          // Dedup: only send if no invitation email has been logged for this recipient yet
          const { data: existingLog } = await supabase
            .from('email_logs')
            .select('id')
            .eq('event_id', eventId)
            .eq('email_type', 'invitation')
            .ilike('recipient_email', attendee.email)
            .maybeSingle()

          if (!existingLog) {
            const { data: eventData } = await supabase
              .from('events')
              .select('name, date, time, venue, description, banner_url')
              .eq('id', eventId)
              .single()

            if (eventData) {
              const phone = attendee.phone
              // Email + WhatsApp are independent — run them concurrently.
              // Both stay awaited (Vercel freezes the instance on redirect),
              // and each swallows its own error so one failure can't block the other.
              await Promise.all([
                sendInvitationEmail({
                  eventId,
                  recipientEmail: attendee.email,
                  recipientName:  attendee.name,
                  invitationId:   inv.id,
                  event:          eventData,
                }).catch((e) => {
                  console.error('[Payment Verify] fast-path invitation email failed', { reference }, e)
                  Sentry.captureException(e, { extra: { reference, context: 'payment_verify_fast_path_resend_email' } })
                }),
                phone
                  ? sendInvitationWhatsApp({
                      eventId,
                      recipientPhone: phone,
                      recipientName:  attendee.name,
                      invitationId:   inv.id,
                      event:          eventData,
                    }).catch((e) => {
                      console.error('[Payment Verify] fast-path invitation WhatsApp failed', { reference }, e)
                      Sentry.captureException(e, { extra: { reference, context: 'payment_verify_fast_path_resend_whatsapp' } })
                    })
                  : Promise.resolve(),
              ])
            }
          }
        }
      } catch (e) {
        console.error('[Payment Verify] fast-path notification check failed', { reference }, e)
        Sentry.captureException(e, { extra: { reference, context: 'payment_verify_fast_path_notification_check' } })
      }
    }

    const meta = payment.metadata as Record<string, string> | null
    const slug = meta?.event_slug ?? null
    const successUrl = slug
      ? `${appUrl}/register/${slug}?payment=success&reference=${reference}`
      : `${appUrl}/?payment=success`
    return NextResponse.redirect(successUrl)
  }

  // Payment already marked failed → redirect to failure
  if (payment?.status === 'failed' || payment?.status === 'abandoned') {
    const meta = payment?.metadata as Record<string, string> | null
    const slug = meta?.event_slug ?? null
    const failUrl = slug
      ? `${appUrl}/register/${slug}?payment=failed`
      : `${appUrl}/?payment=failed`
    return NextResponse.redirect(failUrl)
  }

  // 2. Verify with Paystack (slower path — webhook not yet received)
  const { data: txn, error: paystackError } = await verifyTransaction(reference)

  if (paystackError || !txn) {
    Sentry.captureMessage('[Payment Verify] Paystack verification failed', {
      level: 'error',
      extra: { reference, error: paystackError },
    })
    return NextResponse.redirect(`${appUrl}/?payment=error&reason=verification_failed`)
  }

  // 3. Handle based on Paystack status
  if (txn.status === 'success') {
    // Webhook may not have fired yet — process the payment atomically via RPC as a fallback.
    // process_charge_success handles fraud amount check, payment status update, attendee accept,
    // tier capacity validation, and invitation creation in a single DB transaction.
    if (payment && payment.status === 'pending') {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('process_charge_success', {
        p_reference:               reference,
        p_paystack_transaction_id: txn.id,
        p_channel:                 txn.channel,
        p_paid_at:                 txn.paid_at ?? new Date().toISOString(),
        p_amount_kobo:             txn.amount,
      })

      if (rpcError) {
        Sentry.captureException(rpcError, {
          extra: { reference, context: 'payment_verify_fallback_rpc' },
        })
      } else {
        const result = rpcResult as {
          outcome: string
          invitation_id?: string
          attendee_id?: string
          event_id?: string
        }

        if (result.outcome === 'amount_mismatch') {
          const meta = payment.metadata as Record<string, string> | null
          const slug = meta?.event_slug ?? null
          const failUrl = slug
            ? `${appUrl}/register/${slug}?payment=failed&reason=amount_mismatch`
            : `${appUrl}/?payment=failed&reason=amount_mismatch`
          return NextResponse.redirect(failUrl)
        }

        if ((result.outcome === 'created' || result.outcome === 'updated')
          && result.invitation_id && result.attendee_id && result.event_id) {
          const invitationId = result.invitation_id
          const attendeeId   = result.attendee_id
          const eventId      = result.event_id

          const [{ data: eventData }, { data: attendee }] = await Promise.all([
            supabase.from('events').select('name, date, time, venue, description, banner_url').eq('id', eventId).single(),
            supabase.from('attendees').select('name, email, phone').eq('id', attendeeId).single(),
          ])

          if (eventData) {
            const email = attendee?.email
            const phone = attendee?.phone
            // Email + WhatsApp are independent — run concurrently, both awaited,
            // each swallowing its own error.
            await Promise.all([
              email
                ? sendInvitationEmail({
                    eventId,
                    recipientEmail: email,
                    recipientName:  attendee.name,
                    invitationId,
                    event:          eventData,
                  }).catch((e) => {
                    console.error('[Payment Verify] fallback invitation email failed', { reference }, e)
                    Sentry.captureException(e, {
                      extra: { reference, context: 'payment_verify_fallback_send_email' },
                    })
                  })
                : Promise.resolve(),
              phone
                ? sendInvitationWhatsApp({
                    eventId,
                    recipientPhone: phone,
                    recipientName:  attendee.name,
                    invitationId,
                    event:          eventData,
                  }).catch((e) => {
                    console.error('[Payment Verify] fallback invitation WhatsApp failed', { reference }, e)
                    Sentry.captureException(e, {
                      extra: { reference, context: 'payment_verify_fallback_send_whatsapp' },
                    })
                  })
                : Promise.resolve(),
            ])
          }
        }
      }
    }

    const meta = payment?.metadata as Record<string, string> | null
    const slug = meta?.event_slug ?? null
    const successUrl = slug
      ? `${appUrl}/register/${slug}?payment=success&reference=${reference}`
      : `${appUrl}/?payment=success`
    return NextResponse.redirect(successUrl)
  }

  // Payment failed or abandoned
  if (txn.status === 'failed' || txn.status === 'abandoned') {
    if (payment?.status === 'pending') {
      await supabase
        .from('payments')
        .update({
          status: txn.status === 'abandoned' ? 'abandoned' : 'failed',
          webhook_received_at: new Date().toISOString(),
        })
        .eq('paystack_reference', reference)
    }

    const meta = payment?.metadata as Record<string, string> | null
    const slug = meta?.event_slug ?? null
    const failUrl = slug
      ? `${appUrl}/register/${slug}?payment=failed`
      : `${appUrl}/?payment=failed`
    return NextResponse.redirect(failUrl)
  }

  // Pending status — payment not yet complete (e.g. bank transfer awaiting confirmation)
  const meta = payment?.metadata as Record<string, string> | null
  const slug = meta?.event_slug ?? null
  const pendingUrl = slug
    ? `${appUrl}/register/${slug}?payment=pending&reference=${reference}`
    : `${appUrl}/?payment=pending`
  return NextResponse.redirect(pendingUrl)
}
