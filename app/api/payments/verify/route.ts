import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyTransaction } from '@/lib/paystack'
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

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
  if (payment?.status === 'paid') {
    const eventId = payment.event_id
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
    // Webhook may not have fired yet — process the payment here as a fallback
    // This mirrors the webhook handler logic
    if (payment && payment.status === 'pending') {
      // Fraud check: verify amount and currency match
      if (txn.amount !== payment.amount_kobo || txn.currency !== payment.currency) {
        Sentry.captureMessage('[Payment Verify] Amount or currency mismatch during verify fallback', {
          level: 'error',
          extra: {
            reference,
            expectedAmount: payment.amount_kobo,
            receivedAmount: txn.amount,
            expectedCurrency: payment.currency,
            receivedCurrency: txn.currency,
          },
        })

        await supabase
          .from('payments')
          .update({
            status: 'failed',
            webhook_received_at: new Date().toISOString(),
          })
          .eq('paystack_reference', reference)

        const meta = payment.metadata as Record<string, string> | null
        const slug = meta?.event_slug ?? null
        const failUrl = slug
          ? `${appUrl}/register/${slug}?payment=failed&reason=amount_mismatch`
          : `${appUrl}/?payment=failed&reason=amount_mismatch`
        return NextResponse.redirect(failUrl)
      }

      try {
        // Update payment record
        await supabase
          .from('payments')
          .update({
            status: 'paid',
            paystack_transaction_id: txn.id,
            paystack_channel: txn.channel,
            paid_at: txn.paid_at ?? new Date().toISOString(),
            webhook_received_at: new Date().toISOString(),
          })
          .eq('paystack_reference', reference)

        // Accept attendee and create invitation
        if (payment.attendee_id) {
          await supabase
            .from('attendees')
            .update({ registration_status: 'accepted' })
            .eq('id', payment.attendee_id)

          // Check if invitation already exists
          const { data: existing } = await supabase
            .from('invitations')
            .select('id')
            .eq('attendee_id', payment.attendee_id)
            .eq('event_id', payment.event_id)
            .maybeSingle()

          if (!existing) {
            await supabase.from('invitations').insert({
              event_id: payment.event_id,
              attendee_id: payment.attendee_id,
              party_size: 1,
              status: 'active',
              ticket_tier_id: payment.ticket_tier_id,
              payment_reference: reference,
              payment_status: 'paid',
              amount_paid_kobo: txn.amount,
              paid_at: txn.paid_at ?? new Date().toISOString(),
            })
          }
        }
      } catch (err) {
        Sentry.captureException(err, {
          extra: { reference, context: 'payment_verify_fallback_processing' },
        })
        // Non-fatal: payment IS confirmed, invitation will be created by webhook when it arrives
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
