import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/webhooks/resend
 *
 * Deliverability feedback loop. Hard bounces and spam complaints are added to
 * `email_unsubscribes` so we never send to that address again — this is what
 * keeps our bounce/complaint rates (and therefore sender reputation) in check.
 *
 * Engagement tracking (delivered / opened / clicked, and the `email_events`
 * table from migration 031) was deliberately removed — we don't use it. Those
 * event types are acknowledged and discarded without touching the database.
 * The 031 table and columns remain in the schema but are intentionally unused.
 */

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

/** Event types that suppress an address. Everything else is acked and ignored. */
const SUPPRESSING_EVENTS = new Set(['email.bounced', 'email.complained'])

/** Mask an address for logging — we don't want full PII in the log stream. */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  return `${local.slice(0, 2)}***@${domain}`
}

export async function POST(request: NextRequest) {
  // Read raw body for signature verification
  const rawBody = await request.text()

  const isValid = await verifyResendSignature(request, rawBody)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: { type?: string; data?: { email_id?: string } }
  try {
    payload = JSON.parse(rawBody) as { type?: string; data?: { email_id?: string } }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = payload.type ?? ''

  // Delivered / opened / clicked and test pings: ack without any DB work.
  if (!SUPPRESSING_EVENTS.has(eventType)) {
    return NextResponse.json({ received: true })
  }

  // Resend email ID lives at payload.data.email_id — it's our join key back to
  // the send that produced this bounce.
  const resendEmailId = payload.data?.email_id
  if (!resendEmailId) {
    return NextResponse.json({ received: true })
  }

  const supabase = createAdminClient()

  const { data: log } = await supabase
    .from('email_logs')
    .select('recipient_email')
    .eq('resend_email_id', resendEmailId)
    .maybeSingle()

  if (!log?.recipient_email) {
    // No matching send on record, so there's no address to suppress. Ack so
    // Resend doesn't retry a delivery we can never act on.
    console.warn(`[webhook/resend] ${eventType} for unknown resend_email_id ${resendEmailId}`)
    return NextResponse.json({ received: true })
  }

  const email = log.recipient_email.toLowerCase()

  const { error } = await supabase
    .from('email_unsubscribes')
    .upsert(
      { email, unsubscribed_at: new Date().toISOString() },
      { onConflict: 'email', ignoreDuplicates: false }
    )

  if (error) {
    // Suppression is the whole point of this endpoint — if it fails, return 500
    // so Resend retries rather than silently dropping the bounce.
    console.error('[webhook/resend] Failed to suppress address:', error)
    return NextResponse.json({ error: 'Failed to record suppression' }, { status: 500 })
  }

  console.log(`[webhook/resend] ${eventType} — suppressed ${maskEmail(email)}`)

  return NextResponse.json({ received: true })
}
