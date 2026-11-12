import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET / HEAD /api/webhooks/zoho
 *
 * Lightweight reachability check for Zoho CPaaS webhook registration.
 */
export async function GET() {
  return NextResponse.json({ ok: true })
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}

/**
 * POST /api/webhooks/zoho
 *
 * Deliverability feedback loop for Zoho CPaaS (ZeptoMail).
 * Hard bounces (`hardbounce`) and spam complaints (`feedbackloop`) are added
 * to `email_unsubscribes` so we never send to that address again.
 *
 * Engagement events (`email_open`, `email_link_click`, `softbounce`, etc.)
 * are acknowledged and discarded without touching the database.
 */

const REPLAY_WINDOW_MS = 5 * 60 * 1000
const SUPPRESSING_EVENTS = new Set(['hardbounce', 'feedbackloop'])

interface ZohoWebhookSignatureParts {
  ts?: string
  s?: string
  's-algorithm'?: string
}

interface ZohoWebhookMessage {
  request_id?: string
  email_info?: {
    to?: Array<{
      email_address?: {
        address?: string
      }
    }>
  }
}

interface ZohoWebhookPayload {
  event_name?: string[] | string
  event_message?: ZohoWebhookMessage[]
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function parseProducerSignature(header: string): ZohoWebhookSignatureParts {
  const parts: ZohoWebhookSignatureParts = {}
  for (const segment of header.split(';')) {
    const eqIndex = segment.indexOf('=')
    if (eqIndex <= 0) continue
    const key = segment.slice(0, eqIndex).trim().toLowerCase()
    const rawValue = segment.slice(eqIndex + 1).trim()
    const value = safeDecodeURIComponent(rawValue)
    if (key === 'ts' || key === 's' || key === 's-algorithm') {
      parts[key] = value
    }
  }
  return parts
}

function normalizeAlgorithm(alg?: string): 'sha256' | null {
  if (!alg) return 'sha256'
  const lower = alg.trim().toLowerCase()
  if (lower === 'hmacsha256' || lower === 'hmac-sha256' || lower === 'sha256') {
    return 'sha256'
  }
  return null
}

function extractSignedPayload(request: NextRequest, rawBody: string): string {
  const contentType = (request.headers.get('content-type') ?? '').toLowerCase()
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(rawBody)
    const bodyParam = params.get('body')
    if (bodyParam !== null) return bodyParam
  }
  return rawBody
}

function verifyZohoSignature(
  header: string | null,
  signedPayload: string
): boolean {
  const secret = process.env.ZOHO_CPAAS_WEBHOOK_SECRET?.trim()
  if (!secret) {
    console.error('[webhook/zoho] ZOHO_CPAAS_WEBHOOK_SECRET is not set — rejecting all requests')
    return false
  }

  if (!header) {
    console.warn('[webhook/zoho] Missing producer-signature header')
    return false
  }

  const parts = parseProducerSignature(header)
  if (!parts.ts || !parts.s) {
    console.warn('[webhook/zoho] Malformed producer-signature header')
    return false
  }

  const tsMs = Number(parts.ts)
  if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > REPLAY_WINDOW_MS) {
    console.warn('[webhook/zoho] Timestamp out of acceptable range')
    return false
  }

  const algorithm = normalizeAlgorithm(parts['s-algorithm'])
  if (!algorithm) {
    console.warn(`[webhook/zoho] Unsupported signature algorithm: ${parts['s-algorithm']}`)
    return false
  }

  const computed = createHmac(algorithm, secret)
    .update(signedPayload)
    .digest('base64')

  const sigBuffer = Buffer.from(parts.s, 'utf8')
  const computedBuffer = Buffer.from(computed, 'utf8')

  if (sigBuffer.length !== computedBuffer.length || !timingSafeEqual(sigBuffer, computedBuffer)) {
    console.warn('[webhook/zoho] Signature mismatch')
    return false
  }

  return true
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  return `${local.slice(0, 2)}***@${domain}`
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signedPayload = extractSignedPayload(request, rawBody)

  const isValid = verifyZohoSignature(
    request.headers.get('producer-signature'),
    signedPayload
  )
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: ZohoWebhookPayload
  try {
    payload = JSON.parse(signedPayload) as ZohoWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rawEvents = Array.isArray(payload.event_name)
    ? payload.event_name
    : typeof payload.event_name === 'string'
      ? [payload.event_name]
      : []

  const normalizedEvents = rawEvents.map(e => String(e).trim().toLowerCase())
  const matchedSuppressing = normalizedEvents.filter(e => SUPPRESSING_EVENTS.has(e))

  if (matchedSuppressing.length === 0) {
    return NextResponse.json({ received: true })
  }

  const messages = Array.isArray(payload.event_message) ? payload.event_message : []
  const emailsToSuppress = new Set<string>()
  const fallbackRequestIds: string[] = []

  for (const msg of messages) {
    const recipients = Array.isArray(msg.email_info?.to) ? msg.email_info.to : []
    let foundDirectAddress = false
    for (const r of recipients) {
      const addr = r?.email_address?.address?.trim().toLowerCase()
      if (addr) {
        emailsToSuppress.add(addr)
        foundDirectAddress = true
      }
    }
    if (!foundDirectAddress && msg.request_id) {
      fallbackRequestIds.push(msg.request_id)
    }
  }

  const supabase = createAdminClient()

  for (const requestId of fallbackRequestIds) {
    const { data: log } = await supabase
      .from('email_logs')
      .select('recipient_email')
      .eq('zoho_request_id', requestId)
      .maybeSingle()

    if (log?.recipient_email) {
      emailsToSuppress.add(log.recipient_email.trim().toLowerCase())
    } else {
      console.warn(`[webhook/zoho] ${matchedSuppressing.join(',')} for unknown zoho_request_id ${requestId}`)
    }
  }

  if (emailsToSuppress.size === 0) {
    return NextResponse.json({ received: true })
  }

  const nowIso = new Date().toISOString()
  const rows = Array.from(emailsToSuppress).map(email => ({
    email,
    unsubscribed_at: nowIso,
  }))

  const { error } = await supabase
    .from('email_unsubscribes')
    .upsert(rows, { onConflict: 'email', ignoreDuplicates: false })

  if (error) {
    console.error('[webhook/zoho] Failed to suppress address(es):', error)
    return NextResponse.json({ error: 'Failed to record suppression' }, { status: 500 })
  }

  const maskedList = Array.from(emailsToSuppress).map(maskEmail).join(', ')
  console.log(`[webhook/zoho] ${matchedSuppressing.join(',')} — suppressed ${maskedList}`)

  return NextResponse.json({ received: true })
}

