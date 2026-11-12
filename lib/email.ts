import { Resend } from 'resend'
import QRCode from 'qrcode'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderTicketEmail } from './email-templates'
import { sendZohoEmail } from './zoho-cpaas'

export type EmailProvider = 'resend' | 'zoho_cpaas'

/** Returns the active transactional email provider controlled by `EMAIL_PROVIDER`. */
export function getEmailProvider(): EmailProvider {
  return process.env.EMAIL_PROVIDER?.trim().toLowerCase() === 'zoho_cpaas'
    ? 'zoho_cpaas'
    : 'resend'
}

/** Generates a PNG Buffer server-side for inline CID email attachments */
async function generateQrBuffer(qrToken: string): Promise<Buffer> {
  return await QRCode.toBuffer(qrToken, {
    type: 'png',
    width: 440,
    margin: 2,
    color: {
      dark: '#0A0A0A',
      light: '#F0EDE8',
    },
    errorCorrectionLevel: 'M',
  })
}

// Lazy init — avoids crash at build time when env var isn't set yet
let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

function getConfiguredSendingAddress(): string | null {
  // Strip whitespace so a value like "  " (all spaces) is treated as unset
  const fromAddr = (process.env.EMAIL_FROM_ADDRESS ?? '').trim()
  if (fromAddr) return fromAddr

  // Legacy: extract address from "Display Name <email@domain.com>" format
  const legacyMatch = (process.env.EMAIL_FROM ?? '').match(/<(.+)>/)
  if (legacyMatch?.[1]?.trim()) return legacyMatch[1].trim()

  return null
}

// The sending address — domain must be verified in your email provider dashboard.
// Set EMAIL_FROM_ADDRESS=noreply@yourdomain.com in .env.local.
// Falls back to the legacy EMAIL_FROM value (address part only) if not set.
// Lazy getter: reads env vars at call time (not at module import time) to avoid
// edge-runtime / Next.js static-init issues where process.env may not be ready.
function getSendingAddress(): string {
  const configured = getConfiguredSendingAddress()
  if (configured) return configured

  // Final fallback — Resend sandbox (only delivers to account owner)
  console.warn(
    '[email] WARNING: EMAIL_FROM_ADDRESS is not set. Using Resend onboarding sandbox address ' +
    '(onboarding@resend.dev). Emails will ONLY deliver to the Resend account owner email. ' +
    'Set EMAIL_FROM_ADDRESS=noreply@yourdomain.com in .env.local with a verified domain.'
  )
  return 'onboarding@resend.dev'
}

function sanitizeDisplayName(displayName: string): string {
  return displayName.replace(/["\r\n]/g, '').replace(/\s+/g, ' ').trim() || 'Crenelle'
}

/**
 * Escapes the five HTML-significant characters so untrusted, user-supplied
 * strings (custom reminder messages, event/venue names, guest names, tier
 * labels, seat info, …) cannot break out of their text context and inject
 * markup into the email body.
 *
 * Emails are a stored-XSS sink just like a web page: many clients render HTML,
 * and even those that sandbox scripts will honour injected links/images.
 * Interpolating raw user input into these template literals is unsafe.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Sanitises a banner image URL for safe interpolation into an `<img src="…">`
 * attribute. The banner URL is organiser-supplied (it can be any arbitrary URL
 * — see getOptimizedBannerUrl's fallback branch), so two guards apply:
 *
 *   1. Scheme allowlist — only http(s) URLs are permitted. This blocks
 *      `javascript:` and `data:` payloads from ever reaching the markup.
 *   2. HTML-attribute escaping — a value like `x" onerror="…` would otherwise
 *      break out of the src attribute and inject an event handler.
 *
 * Returns '' for anything that is not a well-formed http(s) URL, which callers
 * treat as "no banner" (the banner block is omitted entirely).
 */
export function safeImageUrl(value: unknown): string {
  if (value === null || value === undefined) return ''
  const raw = String(value).trim()
  if (!/^https?:\/\//i.test(raw)) return ''
  return escapeHtml(raw)
}

/** Formats display name into a valid RFC 5322 From header: "Display Name" <address@domain.com> */
export function formatFromHeader(displayName: string): string {
  return `"${sanitizeDisplayName(displayName)}" <${getSendingAddress()}>`
}

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000

async function claimZohoIdempotencyKey(
  supabase: ReturnType<typeof createAdminClient>,
  key: string
): Promise<boolean> {
  try {
    const cutoffIso = new Date(Date.now() - IDEMPOTENCY_TTL_MS).toISOString()
    await supabase
      .from('email_idempotency_keys')
      .delete()
      .eq('key', key)
      .lt('created_at', cutoffIso)

    const { error } = await supabase
      .from('email_idempotency_keys')
      .insert({ key, created_at: new Date().toISOString() })

    if (!error) return true
    if (error.code === '23505') return false

    // Fail open on unexpected DB issues (e.g. unmigrated preview DB) rather than blocking ticket delivery
    console.warn('[email] Idempotency claim error (failing open):', error.message)
    return true
  } catch (err) {
    console.warn('[email] Idempotency claim exception (failing open):', err)
    return true
  }
}

async function releaseZohoIdempotencyKey(
  supabase: ReturnType<typeof createAdminClient>,
  key: string
): Promise<void> {
  try {
    await supabase.from('email_idempotency_keys').delete().eq('key', key)
  } catch (err) {
    console.warn('[email] Failed to release idempotency key:', err)
  }
}

interface DispatchEmailParams {
  fromName: string
  toEmail: string
  toName?: string
  replyToEmail?: string
  replyToName?: string
  subject: string
  html: string
  headers?: Record<string, string>
  inlineQrBuffer?: Buffer
  idempotencyKey?: string
  clientReference?: string
}

async function dispatchProviderEmail(params: DispatchEmailParams): Promise<{
  provider: EmailProvider
  messageId: string | null
  error?: string
}> {
  const provider = getEmailProvider()

  if (provider === 'zoho_cpaas') {
    const fromAddress = getConfiguredSendingAddress()
    if (!fromAddress) {
      return {
        provider,
        messageId: null,
        error: 'EMAIL_FROM_ADDRESS is not configured for Zoho CPaaS.',
      }
    }

    const cleanToName = params.toName?.replace(/[\r\n]/g, ' ').trim()
    const cleanReplyTo = params.replyToEmail?.trim()
    const cleanReplyName = params.replyToName ? sanitizeDisplayName(params.replyToName) : undefined

    const { requestId, error } = await sendZohoEmail({
      from: {
        address: fromAddress,
        name: sanitizeDisplayName(params.fromName),
      },
      to: [
        {
          email_address: {
            address: params.toEmail,
            ...(cleanToName ? { name: cleanToName } : {}),
          },
        },
      ],
      ...(cleanReplyTo
        ? {
            reply_to: [
              {
                address: cleanReplyTo,
                ...(cleanReplyName ? { name: cleanReplyName } : {}),
              },
            ],
          }
        : {}),
      subject: params.subject,
      htmlbody: params.html,
      ...(params.clientReference ? { client_reference: params.clientReference.slice(0, 100) } : {}),
      ...(params.headers ? { mime_headers: params.headers } : {}),
      ...(params.inlineQrBuffer
        ? {
            inline_images: [
              {
                cid: 'qrcode',
                name: 'qrcode.png',
                content: params.inlineQrBuffer.toString('base64'),
                mime_type: 'image/png',
              },
            ],
          }
        : {}),
    })

    return { provider, messageId: requestId, error }
  }

  const { data: sendData, error: sendError } = await getResend().emails.send(
    {
      from: formatFromHeader(params.fromName),
      ...(params.replyToEmail ? { replyTo: params.replyToEmail } : {}),
      to: params.toEmail,
      subject: params.subject,
      html: params.html,
      ...(params.headers ? { headers: params.headers } : {}),
      ...(params.inlineQrBuffer
        ? {
            attachments: [
              {
                filename: 'qrcode.png',
                content: params.inlineQrBuffer,
                contentId: 'qrcode',
              },
            ],
          }
        : {}),
    },
    params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined
  )

  if (sendError) {
    const errObj = sendError as unknown as { message?: string; name?: string }
    const errMsg = sendError.message || errObj.name || JSON.stringify(sendError)
    return { provider, messageId: null, error: errMsg }
  }

  return { provider, messageId: sendData?.id ?? null }
}

/** Organisation/organiser identity used to personalise the From header and Reply-To. */
export interface OrganizerDetails {
  /** Display name shown in the From field, e.g. "Acme Events" */
  name: string
  /** Organiser's own email address — used as Reply-To */
  email: string
}

/**
 * Looks up the organiser of an event via the Supabase auth admin client.
 * Tries linked sender profile → organizer's default sender profile → organizer_settings.org_name → user_metadata.full_name → user_metadata.name → email prefix.
 * Returns a safe fallback if the user record cannot be retrieved.
 */
export async function fetchOrganizerForEvent(eventId: string): Promise<OrganizerDetails> {
  const admin = createAdminClient()

  // Fetch the event together with its linked sender profile in one round-trip
  const { data: event } = await admin
    .from('events')
    .select('organizer_id, sender_profile_id, sender_profiles(display_name, reply_to)')
    .eq('id', eventId)
    .single()

  // ── Tier 1: event has an explicit sender profile linked ────────
  const rawProfile = event?.sender_profiles
  const profile = (Array.isArray(rawProfile) ? rawProfile[0] : rawProfile) as
    | { display_name: string; reply_to: string }
    | null
    | undefined
  if (profile?.display_name && profile?.reply_to) {
    return { name: profile.display_name, email: profile.reply_to }
  }

  // ── Tier 2: organizer's default sender profile ─────────────────
  if (event?.organizer_id) {
    const { data: defaultProfile } = await admin
      .from('sender_profiles')
      .select('display_name, reply_to')
      .eq('organizer_id', event.organizer_id)
      .eq('is_default', true)
      .maybeSingle()

    if (defaultProfile?.display_name && defaultProfile?.reply_to) {
      return { name: defaultProfile.display_name, email: defaultProfile.reply_to }
    }

    // ── Tier 3: organizer's general settings org_name ──────────────
    const { data: settings } = await admin
      .from('organizer_settings')
      .select('org_name')
      .eq('organizer_id', event.organizer_id)
      .maybeSingle()

    if (settings?.org_name) {
      try {
        const { data: { user } } = await admin.auth.admin.getUserById(event.organizer_id)
        return { name: settings.org_name, email: user?.email ?? '' }
      } catch {
        return { name: settings.org_name, email: '' }
      }
    }
  }

  // ── Tier 4: auth user metadata (original fallback) ─────────────
  // Must be OUTSIDE the organizer_id block — it is only reachable when
  // the organizer has no sender profiles and no org_name setting.
  if (!event?.organizer_id) return { name: 'Crenelle', email: '' }

  try {
    const { data: { user } } = await admin.auth.admin.getUserById(event.organizer_id)
    const name =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split('@')[0] ||
      'Crenelle'
    return { name, email: user?.email ?? '' }
  } catch {
    return { name: 'Crenelle', email: '' }
  }
}

/**
 * Gets an existing unsubscribe token for an email address, or creates one.
 * Returns the full unsubscribe URL to embed in email footers.
 */
async function getUnsubscribeUrl(email: string): Promise<string> {
  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://crenelle.org'

  // Try to fetch an existing token first
  const { data: existing } = await admin
    .from('email_unsubscribes')
    .select('token')
    .ilike('email', email)
    .maybeSingle()

  if (existing?.token) {
    return `${appUrl}/api/unsubscribe?token=${existing.token}`
  }

  // Create a new token row (token is auto-generated by DB default)
  const { data: created } = await admin
    .from('email_unsubscribes')
    .insert({ email: email.toLowerCase() })
    .select('token')
    .single()

  if (created?.token) {
    return `${appUrl}/api/unsubscribe?token=${created.token}`
  }

  // Fallback — if DB insert failed, omit gracefully
  return `${appUrl}/api/unsubscribe`
}

/**
 * Formats a 24-hour time string (e.g. "14:30:00" or "09:15") into a 12-hour format (e.g. "2:30 PM" or "9:15 AM").
 */
function formatTimeTo12Hour(timeStr: string | null | undefined): string {
  if (!timeStr) return ''
  const parts = timeStr.split(':')
  if (parts.length < 2) return timeStr
  let hour = parseInt(parts[0], 10)
  const minute = parts[1]
  if (isNaN(hour)) return timeStr
  const ampm = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12
  if (hour === 0) hour = 12
  return `${hour}:${minute} ${ampm}`
}

export interface EventDetails {
  name: string
  date: string
  time: string | null
  timezone?: string | null
  venue: string
  description?: string | null
  banner_url?: string | null
  email_theme?: string | null
}

export interface InvitationEmailOptions {
  eventId: string
  recipientEmail: string
  recipientName: string
  invitationId: string
  event: EventDetails
  idempotencyKey?: string
}

export interface ReminderEmailRecipient {
  email: string
  name: string
  invitationId: string
}

export interface ReminderEmailsOptions {
  eventId: string
  recipients: ReminderEmailRecipient[]
  event: EventDetails
  customMessage: string
}

/**
 * Sends a single unique invitation email containing the entry QR code.
 */
export async function sendInvitationEmail({
  eventId,
  recipientEmail,
  recipientName,
  invitationId,
  event,
  idempotencyKey,
}: InvitationEmailOptions) {
  const supabase = createAdminClient()

  // Check unsubscribe list before sending.
  const { data: unsub } = await supabase
    .from('email_unsubscribes')
    .select('id')
    .ilike('email', recipientEmail)
    .not('unsubscribed_at', 'is', null)
    .maybeSingle()

  if (unsub) {
    console.log(`[email] Skipping invitation — ${recipientEmail} is unsubscribed`)
    return { success: true, skipped: true }
  }

  // Fetch invitation with attendee and ticket_tier
  const { data: invitation, error: invFetchError } = await supabase
    .from('invitations')
    .select('*, attendee:attendees(name, email), ticket_tier:ticket_tiers(id, name, price)')
    .eq('id', invitationId)
    .eq('event_id', eventId)
    .single()

  if (invFetchError || !invitation) {
    console.error('[email] Failed to fetch invitation for email:', invFetchError)
    return { error: 'Failed to fetch invitation details' }
  }

  const actualRecipientName = invitation.attendee?.name || recipientName
  const actualRecipientEmail = invitation.attendee?.email || recipientEmail
  if (!actualRecipientEmail) {
    return { error: 'Recipient email is missing' }
  }
  if (actualRecipientEmail.toLowerCase() !== (recipientEmail ?? '').toLowerCase()) {
    const { data: actualUnsub } = await supabase
      .from('email_unsubscribes')
      .select('id')
      .ilike('email', actualRecipientEmail)
      .not('unsubscribed_at', 'is', null)
      .maybeSingle()
    if (actualUnsub) {
      console.log(`[email] Skipping invitation — ${actualRecipientEmail} is unsubscribed`)
      return { success: true, skipped: true }
    }
  }
  const qrToken = invitation.qr_token
  const partySize = invitation.party_size || 1
  const partySizeText = partySize === 1 ? '1 PERSON' : `${partySize} PEOPLE`

  // Resolve organiser identity for From header and Reply-To
  const organizer = await fetchOrganizerForEvent(eventId)

  // Generate unsubscribe URL for this recipient
  const unsubscribeUrl = await getUnsubscribeUrl(actualRecipientEmail)

  // Generate QR code PNG buffer server-side (no third-party data leak)
  const qrBuffer = await generateQrBuffer(qrToken)

  const eventDate = new Date(event.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  // Fetch tier perks if assigned
  let tierHtml = ''
  let tierPerksList: string[] = []
  if (invitation.ticket_tier_id && invitation.ticket_tier) {
    const { data: perks } = await supabase
      .from('tier_perks')
      .select('label')
      .eq('tier_id', invitation.ticket_tier_id)
      .order('sort_order', { ascending: true })

    tierPerksList = perks ? perks.map(p => p.label) : []
    const perksText = tierPerksList.length > 0
      ? `<div style="margin-top:4px;font-size:11px;color:#9E9890;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">PERKS: ${tierPerksList.map(p => escapeHtml(p)).join(' · ')}</div>`
      : ''

    tierHtml = `
          <tr>
            <td style="padding:10px 0;font-size:10px;letter-spacing:2.5px;color:#BF8430;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;width:120px;font-weight:600;">TICKET TIER</td>
            <td class="text-primary" style="padding:10px 0;font-size:15px;color:#0C0B09;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              ${escapeHtml(invitation.ticket_tier.name)}
              ${perksText}
            </td>
          </tr>`
  }

  // Add seat details if assigned
  let seatHtml = ''
  if (invitation.seat_info) {
    seatHtml = `
          <tr>
            <td style="padding:10px 0;font-size:10px;letter-spacing:2.5px;color:#BF8430;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;width:120px;font-weight:600;">SEAT</td>
            <td class="text-primary" style="padding:10px 0;font-size:15px;color:#0C0B09;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              ${escapeHtml(invitation.seat_info)}
            </td>
          </tr>`
  }

  let theme = event.email_theme
  if (!theme) {
    const { data: dbEvent } = await supabase.from('events').select('email_theme').eq('id', eventId).single()
    if (dbEvent?.email_theme) theme = dbEvent.email_theme
  }

  const html = renderTicketEmail({
    theme,
    emailType: 'invitation',
    event,
    recipientName: actualRecipientName,
    partySizeText,
    eventDateFormatted: eventDate,
    timeFormatted: formatTimeTo12Hour(event.time),
    seatHtml,
    tierHtml,
    unsubscribeUrl,
    qrCidOrSrc: 'cid:qrcode',
    qrToken,
    seatInfo: invitation.seat_info,
    tierName: invitation.ticket_tier?.name,
    tierPerks: tierPerksList,
  })

  const effectiveIdempotencyKey = idempotencyKey || `invitation-${invitationId}`
  const provider = getEmailProvider()
  let claimedZohoKey = false

  try {
    if (provider === 'zoho_cpaas') {
      claimedZohoKey = await claimZohoIdempotencyKey(supabase, effectiveIdempotencyKey)
      if (!claimedZohoKey) {
        console.log(`[email] Skipping duplicate invitation send for key=${effectiveIdempotencyKey}`)
        return { success: true, skipped: true }
      }
    }

    const result = await dispatchProviderEmail({
      fromName: organizer.name,
      toEmail: actualRecipientEmail,
      toName: actualRecipientName,
      replyToEmail: organizer.email || undefined,
      replyToName: organizer.name,
      subject: `You're confirmed — ${event.name}`,
      html,
      headers: {
        'X-Entity-Ref-ID': invitationId,
      },
      inlineQrBuffer: qrBuffer,
      idempotencyKey: effectiveIdempotencyKey,
      clientReference: effectiveIdempotencyKey,
    })

    if (result.error) {
      if (claimedZohoKey) await releaseZohoIdempotencyKey(supabase, effectiveIdempotencyKey)
      console.error(`${result.provider} error:`, result.error)
      return { error: result.error || 'Failed to send email' }
    }

    // Log the email — store provider message ID for webhook correlation.
    const logRow =
      result.provider === 'zoho_cpaas'
        ? {
            event_id: eventId,
            recipient_email: actualRecipientEmail,
            email_type: 'invitation' as const,
            subject: `You're confirmed — ${event.name}`,
            provider: 'zoho_cpaas' as const,
            zoho_request_id: result.messageId,
            resend_email_id: null,
          }
        : {
            event_id: eventId,
            recipient_email: actualRecipientEmail,
            email_type: 'invitation' as const,
            subject: `You're confirmed — ${event.name}`,
            provider: 'resend' as const,
            resend_email_id: result.messageId,
            zoho_request_id: null,
          }

    const conflictCol = result.provider === 'zoho_cpaas' ? 'zoho_request_id' : 'resend_email_id'
    const { error: logError } = result.messageId
      ? await supabase.from('email_logs').upsert(logRow, { onConflict: conflictCol, ignoreDuplicates: true })
      : await supabase.from('email_logs').insert(logRow)

    if (logError) {
      console.error('[email] Failed to insert email_logs row:', logError)
    }

    return { success: true }
  } catch (e: unknown) {
    if (claimedZohoKey) await releaseZohoIdempotencyKey(supabase, effectiveIdempotencyKey)
    const err = e as Error
    console.error('Email send error:', err)
    return { error: err.message || 'Failed to send email' }
  }
}

/**
 * Sends bulk reminders to a list of recipients sequentially.
 */
export async function sendReminderEmailsDirect({
  eventId,
  recipients,
  event,
  customMessage,
}: ReminderEmailsOptions) {
  const supabase = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://crenelle.org'

  // Resolve organiser identity once
  const organizer = await fetchOrganizerForEvent(eventId)

  // Fetch all email_unsubscribes rows once (both unsubscribed status and existing tokens)
  const { data: unsubRows } = await supabase
    .from('email_unsubscribes')
    .select('email, token, unsubscribed_at')

  const unsubSet = new Set<string>()
  const tokenMap = new Map<string, string>()
  for (const row of (unsubRows ?? []) as Array<{ email: string; token?: string; unsubscribed_at?: string | null }>) {
    const lower = row.email.toLowerCase()
    if (row.unsubscribed_at) unsubSet.add(lower)
    if (row.token) tokenMap.set(lower, row.token)
  }

  const filteredRecipients = recipients.filter(r => !unsubSet.has(r.email.toLowerCase()))

  if (filteredRecipients.length === 0) {
    return { success: true, sent: 0, skipped: recipients.length, errors: undefined }
  }

  const eventDate = new Date(event.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  let theme = event.email_theme
  if (!theme) {
    const { data: dbEvent } = await supabase.from('events').select('email_theme').eq('id', eventId).single()
    if (dbEvent?.email_theme) theme = dbEvent.email_theme
  }

  // Batch-fetch all invitations for the filtered recipients in a single query
  const invitationIds = Array.from(new Set(filteredRecipients.map(r => r.invitationId).filter(Boolean)))
  type InvitationWithDetails = {
    id: string
    qr_token?: string
    party_size?: number
    seat_info?: string | null
    ticket_tier_id?: string | null
    attendee?: { name?: string; email?: string } | null
    ticket_tier?: { id: string; name: string; price: number } | null
  }
  const invitationMap = new Map<string, InvitationWithDetails>()
  if (invitationIds.length > 0) {
    const { data: invitationsData } = await supabase
      .from('invitations')
      .select('*, attendee:attendees(name, email), ticket_tier:ticket_tiers(id, name, price)')
      .in('id', invitationIds)
      .eq('event_id', eventId)

    for (const inv of (invitationsData ?? []) as InvitationWithDetails[]) {
      invitationMap.set(inv.id, inv)
    }
  }

  // Batch-fetch all tier perks for any referenced ticket tiers in a single query
  const uniqueTierIds = Array.from(
    new Set(
      Array.from(invitationMap.values())
        .map(inv => inv.ticket_tier_id)
        .filter((tid): tid is string => Boolean(tid))
    )
  )
  const perksByTierMap = new Map<string, string[]>()
  if (uniqueTierIds.length > 0) {
    const { data: allPerks } = await supabase
      .from('tier_perks')
      .select('tier_id, label, sort_order')
      .in('tier_id', uniqueTierIds)
      .order('sort_order', { ascending: true })

    for (const perk of (allPerks ?? []) as Array<{ tier_id: string; label: string }>) {
      const list = perksByTierMap.get(perk.tier_id) ?? []
      list.push(perk.label)
      perksByTierMap.set(perk.tier_id, list)
    }
  }

  let sent = 0
  const errors: string[] = []
  const logsToInsert: Array<{
    event_id: string
    recipient_email: string
    email_type: 'reminder'
    subject: string
    provider: EmailProvider
    resend_email_id: string | null
    zoho_request_id: string | null
  }> = []

  // Process recipients in concurrent batches of 4 (staying safely under provider rate limits
  // while cutting total execution time by ~4x and eliminating 3*N sequential DB queries).
  const BATCH_SIZE = 4
  for (let i = 0; i < filteredRecipients.length; i += BATCH_SIZE) {
    const chunk = filteredRecipients.slice(i, i + BATCH_SIZE)

    await Promise.all(
      chunk.map(async (recipient) => {
        const lowerEmail = recipient.email.toLowerCase()
        const existingToken = tokenMap.get(lowerEmail)
        const unsubscribeUrl = existingToken
          ? `${appUrl}/api/unsubscribe?token=${existingToken}`
          : await getUnsubscribeUrl(recipient.email)

        const invitation = invitationMap.get(recipient.invitationId)
        const qrToken = invitation?.qr_token || recipient.invitationId
        const partySize = invitation?.party_size || 1
        const partySizeText = partySize === 1 ? '1 PERSON' : `${partySize} PEOPLE`
        const actualRecipientName = invitation?.attendee?.name || recipient.name

        // Generate QR code PNG buffer server-side
        const qrBuffer = await generateQrBuffer(qrToken)

        let tierHtml = ''
        let tierPerksList: string[] = []
        if (invitation?.ticket_tier_id && invitation?.ticket_tier) {
          tierPerksList = perksByTierMap.get(invitation.ticket_tier_id) ?? []
          const perksText = tierPerksList.length > 0
            ? `<div style="margin-top:4px;font-size:11px;color:#9E9890;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">PERKS: ${tierPerksList.map(p => escapeHtml(p)).join(' · ')}</div>`
            : ''

          tierHtml = `
          <tr>
            <td style="padding:10px 0;font-size:10px;letter-spacing:2.5px;color:#BF8430;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;width:120px;font-weight:600;">TICKET TIER</td>
            <td class="text-primary" style="padding:10px 0;font-size:15px;color:#0C0B09;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              ${escapeHtml(invitation.ticket_tier.name)}
              ${perksText}
            </td>
          </tr>`
        }

        let seatHtml = ''
        if (invitation?.seat_info) {
          seatHtml = `
          <tr>
            <td style="padding:10px 0;font-size:10px;letter-spacing:2.5px;color:#BF8430;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;width:120px;font-weight:600;">SEAT</td>
            <td class="text-primary" style="padding:10px 0;font-size:15px;color:#0C0B09;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              ${escapeHtml(invitation.seat_info)}
            </td>
          </tr>`
        }

        const html = renderTicketEmail({
          theme,
          emailType: 'reminder',
          event,
          recipientName: actualRecipientName,
          partySizeText,
          eventDateFormatted: eventDate,
          timeFormatted: formatTimeTo12Hour(event.time),
          seatHtml,
          tierHtml,
          unsubscribeUrl,
          customMessage,
          qrCidOrSrc: 'cid:qrcode',
          qrToken,
          seatInfo: invitation?.seat_info,
          tierName: invitation?.ticket_tier?.name,
          tierPerks: tierPerksList,
        })

        try {
          const result = await dispatchProviderEmail({
            fromName: organizer.name,
            toEmail: recipient.email,
            toName: actualRecipientName,
            replyToEmail: organizer.email || undefined,
            replyToName: organizer.name,
            subject: `Reminder — ${event.name}`,
            html,
            inlineQrBuffer: qrBuffer,
            clientReference: recipient.invitationId ? `reminder-${recipient.invitationId}` : undefined,
          })

          if (result.error) {
            console.error(`${result.provider} error for ${recipient.email}:`, result.error)
            errors.push(`${recipient.email}: ${result.error}`)
          } else {
            sent++
            console.log(`[email] Reminder sent via ${result.provider} to ${recipient.email}, id=${result.messageId}`)
            logsToInsert.push({
              event_id: eventId,
              recipient_email: recipient.email,
              email_type: 'reminder',
              subject: `Reminder — ${event.name}`,
              provider: result.provider,
              resend_email_id: result.provider === 'resend' ? result.messageId : null,
              zoho_request_id: result.provider === 'zoho_cpaas' ? result.messageId : null,
            })
          }
        } catch (e: unknown) {
          const err = e as Error
          const errMsg = err.message || err.name || JSON.stringify(e)
          console.error(`Exception sending reminder to ${recipient.email}:`, errMsg)
          errors.push(`${recipient.email}: ${errMsg}`)
        }
      })
    )

    if (i + BATCH_SIZE < filteredRecipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }

  if (logsToInsert.length > 0) {
    const { error: logError } = await supabase.from('email_logs').insert(logsToInsert)
    if (logError) {
      console.error('[email] Failed to insert reminder email_logs:', logError)
    }
  }

  return {
    success: errors.length === 0,
    sent,
    errors: errors.length > 0 ? errors : undefined,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Co-host invite notification
// ─────────────────────────────────────────────────────────────────────────────

const roleDescriptions: Record<string, string> = {
  viewer:          'view-only access (guests, registrations, and entry logs)',
  scanner_manager: 'Scanner Manager access (view everything + manage usher scanner links)',
  co_organiser:    'Co-Organiser access (manage guests, send invitations, and manage scanner links)',
}

/**
 * Sends a notification email to a newly invited co-host.
 * Called immediately after the event_members row is inserted.
 */
export async function sendCoHostInviteEmail({
  inviteeEmail,
  inviteeName,
  inviterName,
  inviterEmail,
  eventName,
  eventDate,
  eventId,
  role,
}: {
  inviteeEmail: string
  inviteeName: string
  inviterName: string
  inviterEmail: string
  eventName: string
  eventDate: string
  eventId: string
  role: string
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://crenelle.org'
  const eventUrl = `${appUrl}/events/${eventId}`
  const roleDesc = roleDescriptions[role] ?? role

  const formattedDate = new Date(eventDate).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to co-host ${escapeHtml(eventName)}</title>
</head>
<body style="margin:0;padding:0;background:#F4F1EC;font-family:'Courier New',Courier,monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EC;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid rgba(12,11,9,0.12);max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid rgba(12,11,9,0.1);">
              <p style="margin:0;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#BF8430;">
                CRENELLE // TEAM_ACCESS
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:28px;font-weight:600;color:#0C0B09;line-height:1.1;letter-spacing:-0.5px;">
                You've been invited to co-host
              </h1>
              <h2 style="margin:0 0 32px;font-family:Georgia,serif;font-size:22px;font-weight:400;color:#BF8430;line-height:1.2;">
                ${escapeHtml(eventName)}
              </h2>

              <p style="margin:0 0 24px;font-size:13px;color:#5C5850;line-height:1.7;">
                <strong style="color:#0C0B09;">${escapeHtml(inviterName)}</strong> has invited you to collaborate on this event.
                You have been granted <strong style="color:#0C0B09;">${escapeHtml(roleDesc)}</strong>.
              </p>

              <!-- Event details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EC;border-left:3px solid #BF8430;margin:0 0 32px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#BF8430;">EVENT</p>
                    <p style="margin:0 0 12px;font-size:16px;font-family:Georgia,serif;font-weight:600;color:#0C0B09;">${escapeHtml(eventName)}</p>
                    <p style="margin:0;font-size:12px;color:#5C5850;">${formattedDate}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#0C0B09;">
                    <a href="${eventUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:11px;font-family:'Courier New',Courier,monospace;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#F4F1EC;text-decoration:none;">
                      VIEW EVENT →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#5C5850;line-height:1.6;">
                If you did not expect this invitation, you can safely ignore this email.
                Contact <a href="mailto:${escapeHtml(inviterEmail)}" style="color:#BF8430;">${escapeHtml(inviterEmail)}</a> if you have questions.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(12,11,9,0.08);">
              <p style="margin:0;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#BF8430;text-align:center;">
                CRENELLE // EVENT MANAGEMENT
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    const result = await dispatchProviderEmail({
      fromName: inviterName ? `${inviterName} via Crenelle` : 'Crenelle',
      toEmail: inviteeEmail,
      toName: inviteeName,
      replyToEmail: inviterEmail,
      replyToName: inviterName,
      subject: `You've been invited to co-host "${eventName}"`,
      html,
      clientReference: `cohost-${eventId}`,
    })
    if (result.error) {
      console.error(`[email] Failed to send co-host invite email via ${result.provider}:`, result.error)
    } else {
      console.log(`[email] Co-host invite sent via ${result.provider} to ${inviteeEmail} for event ${eventId}`)
    }
  } catch (e) {
    console.error('[email] Exception sending co-host invite email:', e)
  }
}
