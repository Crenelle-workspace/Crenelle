import { Resend } from 'resend'
import QRCode from 'qrcode'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderTicketEmail } from './email-templates'

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

// The sending address — domain must be verified in your Resend dashboard.
// Set EMAIL_FROM_ADDRESS=noreply@yourdomain.com in .env.local.
// Falls back to the legacy EMAIL_FROM value (address part only) if not set.
const SENDING_ADDRESS = (
  process.env.EMAIL_FROM_ADDRESS ||
  process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] ||
  'onboarding@resend.dev'
)

// Warn loudly at startup if using the Resend onboarding sandbox address.
// With this address, Resend only delivers to the account owner's email —
// all other recipients are silently dropped or rewritten.
if (SENDING_ADDRESS === 'onboarding@resend.dev') {
  console.warn(
    '[email] WARNING: EMAIL_FROM_ADDRESS is not set. Using Resend onboarding sandbox address ' +
    '(onboarding@resend.dev). Emails will ONLY deliver to the Resend account owner email. ' +
    'Set EMAIL_FROM_ADDRESS=noreply@yourdomain.com in .env.local with a verified Resend domain.'
  )
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

/** Organisation/organiser identity used to personalise the From header and Reply-To. */
export interface OrganizerDetails {
  /** Display name shown in the From field, e.g. "Acme Events" */
  name: string
  /** Organiser's own email address — used as Reply-To */
  email: string
}

/**
 * Looks up the organiser of an event via the Supabase auth admin client.
 * Tries user_metadata.full_name → user_metadata.name → email prefix as display name.
 * Returns a safe fallback if the user record cannot be retrieved.
 */
async function fetchOrganizerForEvent(eventId: string): Promise<OrganizerDetails> {
  const admin = createAdminClient()

  // Fetch the event together with its linked sender profile in one round-trip
  const { data: event } = await admin
    .from('events')
    .select('organizer_id, sender_profile_id, sender_profiles(display_name, reply_to)')
    .eq('id', eventId)
    .single()

  // ── Tier 1: event has an explicit sender profile linked ────────
  const profile = event?.sender_profiles as
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
      .single()

    if (defaultProfile?.display_name && defaultProfile?.reply_to) {
      return { name: defaultProfile.display_name, email: defaultProfile.reply_to }
    }
  }

  // ── Tier 3: auth user metadata (original fallback) ─────────────
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
    .single()

  if (invFetchError || !invitation) {
    console.error('[email] Failed to fetch invitation for email:', invFetchError)
    return { error: 'Failed to fetch invitation details' }
  }

  const actualRecipientName = invitation.attendee?.name || recipientName
  const actualRecipientEmail = invitation.attendee?.email || recipientEmail
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

  try {
    const { data: sendData, error: sendError } = await getResend().emails.send({
      from: `${organizer.name} <${SENDING_ADDRESS}>`,
      ...(organizer.email ? { replyTo: organizer.email } : {}),
      to: actualRecipientEmail,
      subject: `You're confirmed — ${event.name}`,
      html,
      attachments: [
        {
          filename: 'qrcode.png',
          content: qrBuffer,
          contentId: 'qrcode',
        },
      ],
    })

    if (sendError) {
      console.error('Resend error:', sendError)
      return { error: sendError.message || 'Failed to send email' }
    }

    // Log the email — store Resend message ID for webhook correlation
    await supabase.from('email_logs').insert({
      event_id: eventId,
      recipient_email: actualRecipientEmail,
      email_type: 'invitation',
      subject: `You're confirmed — ${event.name}`,
      resend_email_id: sendData?.id ?? null,
    })

    return { success: true }
  } catch (e: unknown) {
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

  // Resolve organiser identity once
  const organizer = await fetchOrganizerForEvent(eventId)

  // Filter out unsubscribed recipients
  const { data: unsubList } = await supabase
    .from('email_unsubscribes')
    .select('email')
    .not('unsubscribed_at', 'is', null)
  const unsubSet = new Set((unsubList ?? []).map((r: { email: string }) => r.email.toLowerCase()))
  const filteredRecipients = recipients.filter(r => !unsubSet.has(r.email.toLowerCase()))

  if (filteredRecipients.length === 0) {
    return { success: true, sent: 0, skipped: recipients.length, errors: undefined }
  }

  const eventDate = new Date(event.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  let theme = event.email_theme
  if (!theme) {
    const { data: dbEvent } = await supabase.from('events').select('email_theme').eq('id', eventId).single()
    if (dbEvent?.email_theme) theme = dbEvent.email_theme
  }

  let sent = 0
  const errors: string[] = []

  for (const recipient of filteredRecipients) {
    // Generate per-recipient unsubscribe URL
    const unsubscribeUrl = await getUnsubscribeUrl(recipient.email)

    // Fetch invitation details to get qr_token, party_size, ticket_tier
    const { data: invitation } = await supabase
      .from('invitations')
      .select('*, attendee:attendees(name, email), ticket_tier:ticket_tiers(id, name, price)')
      .eq('id', recipient.invitationId)
      .single()

    const qrToken = invitation?.qr_token || recipient.invitationId
    const partySize = invitation?.party_size || 1
    const partySizeText = partySize === 1 ? '1 PERSON' : `${partySize} PEOPLE`
    const actualRecipientName = invitation?.attendee?.name || recipient.name

    // Generate QR code PNG buffer server-side
    const qrBuffer = await generateQrBuffer(qrToken)

    let tierHtml = ''
    let tierPerksList: string[] = []
    if (invitation?.ticket_tier_id && invitation?.ticket_tier) {
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
      const { data: sendData, error: sendError } = await getResend().emails.send({
        from: `${organizer.name} <${SENDING_ADDRESS}>`,
        ...(organizer.email ? { replyTo: organizer.email } : {}),
        to: recipient.email,
        subject: `Reminder — ${event.name}`,
        html,
        attachments: [
          {
            filename: 'qrcode.png',
            content: qrBuffer,
            contentId: 'qrcode',
          },
        ],
      })

      if (sendError) {
        // Resend SDK error object has name + message; log the full object for debugging
        const errObj = sendError as unknown as { message?: string; name?: string }
        const errMsg = sendError.message || errObj.name || JSON.stringify(sendError)
        console.error(`Resend error for ${recipient.email}:`, JSON.stringify(sendError))
        errors.push(`${recipient.email}: ${errMsg}`)
      } else {
        sent++
        console.log(`[email] Reminder sent to ${recipient.email}, id=${sendData?.id}`)
        // Log the email — store Resend message ID for webhook correlation
        await supabase.from('email_logs').insert({
          event_id: eventId,
          recipient_email: recipient.email,
          email_type: 'reminder',
          subject: `Reminder — ${event.name}`,
          resend_email_id: sendData?.id ?? null,
        })
      }
    } catch (e: unknown) {
      const err = e as Error
      const errMsg = err.message || err.name || JSON.stringify(e)
      console.error(`Exception sending reminder to ${recipient.email}:`, errMsg)
      errors.push(`${recipient.email}: ${errMsg}`)
    }

    // Rate-limit throttling: Resend free tier allows 5 requests/second.
    // Sleep 250ms between sequential emails to comfortably stay under this limit.
    await new Promise((resolve) => setTimeout(resolve, 250))
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
    const { error } = await getResend().emails.send({
      from: `Crenelle <${SENDING_ADDRESS}>`,
      replyTo: inviterEmail,
      to: inviteeEmail,
      subject: `You've been invited to co-host "${eventName}"`,
      html,
    })
    if (error) {
      console.error('[email] Failed to send co-host invite email:', JSON.stringify(error))
    } else {
      console.log(`[email] Co-host invite sent to ${inviteeEmail} for event ${eventId}`)
    }
  } catch (e) {
    console.error('[email] Exception sending co-host invite email:', e)
  }
}
