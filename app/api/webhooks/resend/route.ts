import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Signature verification ───────────────────────────────────────────────────

/**
 * Resend signs every webhook delivery with an HMAC-SHA256 signature.
 * The signature is in the `svix-signature` header as a comma-separated list of
 * `v1,<base64-encoded-mac>` values (Resend uses the Svix webhook format).
 *
 * We verify against the raw request body so the signature can't be forged.
 */
async function verifyResendSignature(request: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[webhook/resend] RESEND_WEBHOOK_SECRET is not set — rejecting all requests')
    return false
  }

  // Svix headers
  const svixId        = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignature = request.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn('[webhook/resend] Missing Svix signature headers')
    return false
  }

  // Reject timestamps more than 5 minutes old (replay-attack protection)
  const ts = parseInt(svixTimestamp, 10)
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    console.warn('[webhook/resend] Timestamp out of acceptable range')
    return false
  }

  // Signature input: "<id>.<timestamp>.<body>"
  const toSign = `${svixId}.${svixTimestamp}.${body}`

  // The secret may be prefixed with "whsec_" — strip it to get raw base64
  const rawSecret = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
  const secretBytes = Buffer.from(rawSecret, 'base64')

  const computed = createHmac('sha256', secretBytes)
    .update(toSign)
    .digest('base64')

  // svix-signature can be a comma-separated list of "v1,<sig>" pairs
  const signatures = svixSignature.split(' ')
  for (const sig of signatures) {
    const [version, value] = sig.split(',')
    if (version !== 'v1' || !value) continue

    try {
      const sigBuffer      = Buffer.from(value, 'base64')
      const computedBuffer = Buffer.from(computed, 'base64')
      if (sigBuffer.length === computedBuffer.length && timingSafeEqual(sigBuffer, computedBuffer)) {
        return true
      }
    } catch {
      // ignore malformed base64
    }
  }

  console.warn('[webhook/resend] No valid signature found')
  return false
}

// ─── Event handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Read raw body for signature verification
  const rawBody = await request.text()

  const isValid = await verifyResendSignature(request, rawBody)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: { type?: string; data?: { email_id?: string; click?: { link?: string } } }
  try {
    payload = JSON.parse(rawBody) as { type?: string; data?: { email_id?: string; click?: { link?: string } } }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType: string = payload.type ?? ''
  // Resend email ID lives at payload.data.email_id
  const resendEmailId: string | undefined = payload.data?.email_id

  if (!resendEmailId) {
    // Some test pings have no email_id — just ack them
    return NextResponse.json({ received: true })
  }

  const supabase = createAdminClient()

  // ── Look up the matching email_log row ────────────────────────────────────
  const { data: log } = await supabase
    .from('email_logs')
    .select('id, event_id, recipient_email, opened_count, clicked_count')
    .eq('resend_email_id', resendEmailId)
    .maybeSingle()

  // ── Record the granular event regardless of whether we found a log row ────
  // (The log row may have been created before we started storing resend_email_id,
  //  or it may be a test send. We still capture the raw event.)
  await supabase.from('email_events').insert({
    email_log_id:    log?.id ?? null,
    resend_email_id: resendEmailId,
    event_type:      eventType,
    click_url:       payload.data?.click?.link ?? null,
    raw_payload:     payload,
  })

  if (!log) {
    // Nothing more to update — ack and move on
    return NextResponse.json({ received: true })
  }

  // ── Upsert tracking columns on email_logs ─────────────────────────────────
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {}

  switch (eventType) {
    case 'email.delivered':
      updates.delivered_at = now
      break

    case 'email.opened': {
      updates.opened_count   = (log.opened_count ?? 0) + 1
      if (!log.opened_count || log.opened_count === 0) {
        updates.first_opened_at = now
      }
      break
    }

    case 'email.clicked': {
      updates.clicked_count = (log.clicked_count ?? 0) + 1
      if (!log.clicked_count || log.clicked_count === 0) {
        updates.first_clicked_at = now
      }
      break
    }

    case 'email.bounced':
      updates.bounced_at = now
      // Hard bounce → add to unsubscribe list so we never email this address again
      if (log.recipient_email) {
        await supabase
          .from('email_unsubscribes')
          .upsert(
            { email: log.recipient_email.toLowerCase(), unsubscribed_at: now },
            { onConflict: 'email', ignoreDuplicates: false }
          )
        console.log(`[webhook/resend] Bounce — added ${log.recipient_email} to unsubscribe list`)
      }
      break

    case 'email.complained':
      updates.complained_at = now
      // Spam complaint → also unsubscribe
      if (log.recipient_email) {
        await supabase
          .from('email_unsubscribes')
          .upsert(
            { email: log.recipient_email.toLowerCase(), unsubscribed_at: now },
            { onConflict: 'email', ignoreDuplicates: false }
          )
        console.log(`[webhook/resend] Complaint — added ${log.recipient_email} to unsubscribe list`)
      }
      break

    default:
      // Unrecognised event type — we already recorded it in email_events, nothing else to do
      return NextResponse.json({ received: true })
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('email_logs')
      .update(updates)
      .eq('id', log.id)

    if (error) {
      console.error('[webhook/resend] Failed to update email_logs:', error)
      // Still return 200 so Resend doesn't retry — the email_events row is already saved
    }
  }

  return NextResponse.json({ received: true })
}
