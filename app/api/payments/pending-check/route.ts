import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyTransaction } from '@/lib/paystack'
import { sendInvitationEmail } from '@/lib/email'
import { sendInvitationWhatsApp } from '@/lib/whatsapp'
import * as Sentry from '@sentry/nextjs'

/**
 * POST /api/payments/pending-check
 *
 * Pending Order Fallback Job — §9 Production Readiness Checklist:
 *   "A fallback job calls /transaction/verify for any order stuck PENDING
 *    past normal webhook latency."
 *
 * Triggered by Vercel Cron every 15 minutes (see vercel.json).
 *
 * Scalability fix applied:
 *   FIX 3: Paystack verify calls are now parallelized in batches of 10
 *   instead of sequential. 50 payments: was ~15s sequential, now ~2-3s.
 */
export async function POST(request: NextRequest) {
  // ── Auth: Vercel Cron or manual admin trigger ────────────────
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // 1. Find stuck pending payments (older than 15 minutes)
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString()

  const { data: stuckPayments, error: fetchError } = await supabase
    .from('payments')
    .select('id, paystack_reference, amount_kobo, currency, attendee_id, event_id, ticket_tier_id, metadata')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(50)

  if (fetchError) {
    Sentry.captureException(fetchError, { extra: { context: 'pending_check_fetch' } })
    return NextResponse.json({ error: 'Failed to fetch pending payments' }, { status: 500 })
  }

  if (!stuckPayments || stuckPayments.length === 0) {
    return NextResponse.json({ message: 'No stuck pending payments found', processed: 0 })
  }

  // ── FIX 3: Process in parallel batches of 10 ─────────────────────────────
  // Previously: sequential for-loop — 50 payments × ~300ms = ~15s total.
  // Now: 5 batches of 10 running concurrently — ~300ms per batch = ~1.5s total.
  // Batch size 10 is intentional: avoids overwhelming Paystack's rate limit
  // while still getting ~5× speedup over fully sequential processing.
  const BATCH_SIZE = 10
  const results: { reference: string; outcome: string }[] = []

  const batches = chunk(stuckPayments, BATCH_SIZE)

  for (const batch of batches) {
    const batchResults = await Promise.allSettled(
      batch.map(payment => processOnePayment(payment, supabase))
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        // Promise.allSettled never rejects — each payment has its own try/catch
        // This path is only reached if processOnePayment itself throws unexpectedly
        Sentry.captureException(result.reason, {
          extra: { context: 'pending_check_batch_unhandled' },
        })
        results.push({ reference: 'unknown', outcome: 'batch_error' })
      }
    }
  }

  return NextResponse.json({
    message: 'Pending check complete',
    total: stuckPayments.length,
    results,
  })
}

// ── Per-payment processor ─────────────────────────────────────

type StuckPayment = {
  id: string
  paystack_reference: string
  attendee_id: string | null
  event_id: string
  ticket_tier_id: string | null
  metadata: Record<string, unknown> | null
}

async function processOnePayment(
  payment: StuckPayment,
  supabase: ReturnType<typeof createAdminClient>
): Promise<{ reference: string; outcome: string }> {
  const { paystack_reference: reference } = payment

  try {
    // Verify current status with Paystack
    const { data: txn, error: verifyError } = await verifyTransaction(reference)

    if (verifyError || !txn) {
      Sentry.captureMessage('[Pending Check] Paystack verify failed', {
        level: 'warning',
        extra: { reference, error: verifyError },
      })
      return { reference, outcome: 'verify_error' }
    }

    if (txn.status === 'success') {
      // Process via the atomic RPC (same path as the webhook handler)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('process_charge_success', {
        p_reference:               reference,
        p_paystack_transaction_id: txn.id,
        p_channel:                 txn.channel,
        p_paid_at:                 txn.paid_at ?? new Date().toISOString(),
        p_amount_kobo:             txn.amount,
      })

      if (rpcError) {
        Sentry.captureException(rpcError, {
          extra: { reference, context: 'pending_check_rpc' },
        })
        return { reference, outcome: 'rpc_error' }
      }

      const result = rpcResult as {
        outcome: string
        invitation_id?: string
        attendee_id?: string
        event_id?: string
      }

      // Send notifications only for payments newly confirmed by this job
      if ((result.outcome === 'created' || result.outcome === 'updated')
        && result.invitation_id && result.attendee_id && result.event_id) {
        await sendNotifications({
          supabase,
          reference,
          invitationId: result.invitation_id,
          attendeeId:   result.attendee_id,
          eventId:      result.event_id,
        })
      }

      return { reference, outcome: `confirmed_${result.outcome}` }
    }

    if (txn.status === 'failed' || txn.status === 'abandoned') {
      await supabase
        .from('payments')
        .update({
          status:              txn.status === 'abandoned' ? 'abandoned' : 'failed',
          webhook_received_at: new Date().toISOString(),
        })
        .eq('paystack_reference', reference)
        .eq('status', 'pending') // idempotency guard

      return { reference, outcome: txn.status }
    }

    // Still pending (e.g. bank transfer awaiting bank confirmation)
    return { reference, outcome: 'still_pending' }
  } catch (err) {
    Sentry.captureException(err, { extra: { reference, context: 'pending_check_per_payment' } })
    return { reference, outcome: 'error' }
  }
}

// ── Notification helper ───────────────────────────────────────

async function sendNotifications({
  supabase,
  reference,
  invitationId,
  attendeeId,
  eventId,
}: {
  supabase: ReturnType<typeof createAdminClient>
  reference: string
  invitationId: string
  attendeeId: string
  eventId: string
}) {
  const [{ data: eventData }, { data: attendee }] = await Promise.all([
    supabase.from('events').select('name, date, time, venue, description, banner_url').eq('id', eventId).single(),
    supabase.from('attendees').select('name, email, phone').eq('id', attendeeId).single(),
  ])

  // Awaited. This job exists specifically to rescue guests whose pass was never
  // delivered, so a detached promise here — killed when the response returns —
  // would make the recovery path silently useless.
  if (attendee?.email && eventData) {
    try {
      await sendInvitationEmail({
        eventId,
        recipientEmail: attendee.email,
        recipientName:  attendee.name,
        invitationId,
        event:          eventData,
      })
    } catch (e) {
      console.error('[Pending Check] invitation email failed', { reference, attendeeId }, e)
      Sentry.captureException(e, { extra: { reference, context: 'pending_check_email' } })
    }
  }

  if (attendee?.phone && eventData) {
    try {
      await sendInvitationWhatsApp({
        eventId,
        recipientPhone: attendee.phone,
        recipientName:  attendee.name,
        invitationId,
        event:          eventData,
      })
    } catch (e) {
      console.error('[Pending Check] invitation WhatsApp failed', { reference, attendeeId }, e)
      Sentry.captureException(e, { extra: { reference, context: 'pending_check_whatsapp' } })
    }
  }
}

// ── Utils ─────────────────────────────────────────────────────

/** Split an array into chunks of a given size */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}
