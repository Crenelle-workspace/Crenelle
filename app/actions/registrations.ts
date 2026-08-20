'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInvitationEmail, sendReminderEmailsDirect, type ReminderEmailRecipient } from '@/lib/email'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { sendInvitationWhatsApp } from '@/lib/whatsapp'
import { RegistrationInputSchema } from '@/lib/validations/registration'
import type { RegistrationQuestion } from '@/lib/types'
import * as Sentry from '@sentry/nextjs'

export type SubmitRegistrationResult =
  | { success: true; waitlisted: boolean; autoApproved?: boolean; error?: undefined }
  | { success?: false; error: string; waitlisted?: undefined; autoApproved?: undefined }

/**
 * Public registration — called from the public registration form.
 * Uses admin client to bypass RLS (no user session exists for public visitors).
 */
export async function submitRegistration(eventId: string, formData: FormData): Promise<SubmitRegistrationResult> {
  const supabase = createAdminClient()

  // ── Rate limiting (CAN-SPAM / anti-spam) ──────────────────────
  const headerStore = await headers()
  const ip =
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headerStore.get('x-real-ip') ??
    'unknown'

  // IP rate limit runs first — it is the cheapest gate and does not depend on
  // any user-supplied field, so a garbage payload can't bypass it.
  const ipLimit = await checkRateLimitAsync({ key: `reg_ip:${ip}`, limit: 10, windowMs: 15 * 60 * 1000 })
  if (!ipLimit.allowed) {
    return { error: 'Too many registration attempts from your network. Please try again later.' }
  }

  // ── Validate & normalise the visitor-supplied fields ──────────────
  //
  // These arrive unauthenticated from the public form. Validate the email
  // FORMAT and length-cap every field BEFORE using any of them — in
  // particular before `email` becomes a rate-limit key below. An unbounded or
  // malformed value must never reach the key space or the DB insert.
  const parsed = RegistrationInputSchema.safeParse({
    name: (formData.get('full_name') as string) ?? '',
    email: (formData.get('email') as string) ?? '',
    phone: (formData.get('phone') as string) ?? undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check your details and try again.' }
  }

  const { name, email, phone } = parsed.data

  const emailLimit = await checkRateLimitAsync({ key: `reg_email:${email}`, limit: 3, windowMs: 60 * 60 * 1000 })
  if (!emailLimit.allowed) {
    return { error: 'Too many registrations for this email address. Please wait before trying again.' }
  }

  // 1. Verify the event exists, is open, and is published
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, event_type, status, max_registrations, auto_approve_registrations, registration_questions')
    .eq('id', eventId)
    .single()

  if (eventError || !event) return { error: 'Event not found' }
  if (event.event_type !== 'open') return { error: 'This event does not accept public registrations' }
  if (event.status === 'draft') return { error: 'Registration is not yet open for this event' }
  if (event.status === 'ended') return { error: 'This event has ended' }

  // 2. Check registration cap — route to waitlist if full
  let routeToWaitlist = false
  if (event.max_registrations) {
    const { count } = await supabase
      .from('attendees')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('source', 'public_registration')
      .not('registration_status', 'in', '(rejected,waitlist)')

    if ((count ?? 0) >= event.max_registrations) {
      routeToWaitlist = true
    }
  }

  // 3. Check unsubscribe list
  const { data: unsub } = await supabase
    .from('email_unsubscribes')
    .select('id')
    .ilike('email', email)
    .not('unsubscribed_at', 'is', null)
    .maybeSingle()

  if (unsub) {
    return {
      error: 'This email address has unsubscribed or experienced delivery issues. Please contact support or the organizer to resubscribe.',
    }
  }

  // 4. Insert attendee with source = 'public_registration'
  //    (name / email / phone were validated & normalised above)
  const rawTierId = (formData.get('ticket_tier_id') as string) || null

  // 4a. Validate the ticket tier server-side.
  let ticketTierId: string | null = null
  if (rawTierId) {
    const { data: tier } = await supabase
      .from('ticket_tiers')
      .select('id, price, is_public, deleted_at')
      .eq('id', rawTierId)
      .eq('event_id', eventId)
      .maybeSingle()

    if (!tier || tier.deleted_at !== null || tier.is_public !== true) {
      return { error: 'Selected ticket tier is not available' }
    }

    if (tier.price > 0) {
      return { error: 'This ticket tier requires payment. Please complete checkout to register.' }
    }

    ticketTierId = tier.id
  }

  // 4b. Validate and parse custom question answers (server-side enforcement)
  const questions = (event.registration_questions ?? []) as RegistrationQuestion[]
  let parsedAnswers: Record<string, string | string[]> = {}
  if (questions.length > 0) {
    const rawAnswers = formData.get('custom_answers') as string | null
    if (rawAnswers) {
      try {
        parsedAnswers = JSON.parse(rawAnswers) as Record<string, string | string[]>
      } catch {
        return { error: 'Invalid form submission. Please try again.' }
      }
    }
    // Enforce required questions
    for (const q of questions) {
      if (!q.required) continue
      const val = parsedAnswers[q.id]
      const isEmpty =
        val === undefined ||
        val === null ||
        (typeof val === 'string' && val.trim() === '') ||
        (Array.isArray(val) && val.length === 0)
      if (isEmpty) {
        return { error: `Please answer the required question: "${q.label}"` }
      }
    }
  }

  const isAutoApprove = Boolean(event.auto_approve_registrations) && !routeToWaitlist
  const initialStatus = routeToWaitlist ? 'waitlist' : (isAutoApprove ? 'accepted' : 'pending')

  let insertError: { message?: string; code?: string } | null = null
  let insertedAttendee: { id: string } | null = null

  if (isAutoApprove) {
    const res = await supabase
      .from('attendees')
      .insert({
        event_id: eventId,
        name,
        email,
        phone,
        source: 'public_registration',
        registration_status: initialStatus,
        ticket_tier_id: ticketTierId,
      })
      .select()
      .single()

    insertError = res.error
    insertedAttendee = res.data
  } else {
    const res = await supabase
      .from('attendees')
      .insert({
        event_id: eventId,
        name,
        email,
        phone,
        source: 'public_registration',
        registration_status: initialStatus,
        ticket_tier_id: ticketTierId,
      })
      .select()
      .single()

    insertError = res.error
    insertedAttendee = res.data
  }

  if (insertError) {
    if (insertError.message?.includes('duplicate') || insertError.code === '23505') {
      return { error: 'You have already registered for this event with this email' }
    }
    // DB trigger fired — cap was hit between our check and the insert
    if (insertError.code === 'P0001' && insertError.message?.includes('REGISTRATION_CAP_REACHED')) {
      routeToWaitlist = true
      const { data: waitlistAttendee, error: waitlistError } = await supabase
        .from('attendees')
        .insert({
          event_id: eventId,
          name,
          email,
          phone,
          source: 'public_registration',
          registration_status: 'waitlist',
          ticket_tier_id: ticketTierId,
        })
        .select()
        .single()
      if (waitlistError) {
        Sentry.captureException(waitlistError, { extra: { eventId, context: 'waitlist_insert_after_cap' } })
        return { error: waitlistError.message }
      }
      insertedAttendee = waitlistAttendee
    } else {
      Sentry.captureException(insertError, { extra: { eventId, context: 'submit_registration_insert' } })
      return { error: insertError.message || 'Registration failed. Please try again.' }
    }
  }

  // 5. Persist custom question answers (non-blocking — answers failing should not block registration)
  if (insertedAttendee && questions.length > 0 && Object.keys(parsedAnswers).length > 0) {
    supabase
      .from('registration_answers')
      .insert({
        attendee_id: insertedAttendee.id,
        event_id: eventId,
        answers: parsedAnswers,
      })
      .then(({ error: answerErr }) => {
        if (answerErr) {
          Sentry.captureException(answerErr, { extra: { eventId, attendeeId: insertedAttendee!.id, context: 'save_registration_answers' } })
        }
      })
  }

  // 6. If auto-approved, create invitation and dispatch pass code notifications
  if (isAutoApprove && insertedAttendee) {
    const { data: invitation, error: invError } = await supabase
      .from('invitations')
      .insert({
        event_id: eventId,
        attendee_id: insertedAttendee.id,
        party_size: 1,
        status: 'active',
        ticket_tier_id: ticketTierId,
      })
      .select()
      .single()

    if (invitation && !invError) {
      const { data: eventDetails } = await supabase
        .from('events')
        .select('name, date, time, venue, description, banner_url')
        .eq('id', eventId)
        .single()

      if (eventDetails) {
        await Promise.all([
          email
            ? sendInvitationEmail({
                eventId,
                recipientEmail: email,
                recipientName: name,
                invitationId: invitation.id,
                event: eventDetails,
              }).catch((e: unknown) => {
                Sentry.captureException(e, { extra: { eventId, attendeeId: insertedAttendee.id, context: 'auto_approve_email' } })
              })
            : Promise.resolve(),
          phone
            ? sendInvitationWhatsApp({
                eventId,
                recipientPhone: phone,
                recipientName: name,
                invitationId: invitation.id,
                event: eventDetails,
              }).catch((e: unknown) => {
                Sentry.captureException(e, { extra: { eventId, attendeeId: insertedAttendee.id, context: 'auto_approve_whatsapp' } })
              })
            : Promise.resolve(),
        ])
      }
    }
  }

  return { success: true, waitlisted: routeToWaitlist, ...(isAutoApprove ? { autoApproved: true } : {}) }
}

/**
 * Accept a registration — marks the attendee as accepted, creates an active invitation,
 * and triggers the invitation email with QR code.
 */
export async function acceptRegistration(attendeeId: string, eventId: string, selectedTierId?: string | null) {
  const supabase = await createClient()

  // 1. Get the attendee
  const { data: attendee, error: attendeeError } = await supabase
    .from('attendees')
    .select('*')
    .eq('id', attendeeId)
    .single()

  if (attendeeError || !attendee) return { error: 'Registrant not found' }
  if (attendee.registration_status === 'accepted') return { error: 'Already accepted' }

  // 2. Mark the attendee as accepted
  const { error: updateError } = await supabase
    .from('attendees')
    .update({ registration_status: 'accepted' })
    .eq('id', attendeeId)

  if (updateError) return { error: updateError.message }

  // 3. Create invitation for accepted attendee (party_size = 1 for open events)
  const tierIdToUse = selectedTierId !== undefined ? selectedTierId : attendee.ticket_tier_id

  const { data: invitation, error: invError } = await supabase
    .from('invitations')
    .insert({
      event_id: eventId,
      attendee_id: attendeeId,
      party_size: 1,
      status: 'active',
      ticket_tier_id: tierIdToUse ?? null,
    })
    .select()
    .single()

  if (invError) return { error: invError.message }

  // 4. Get event details for the email
  const { data: event } = await supabase
    .from('events')
    .select('name, date, time, venue, description, banner_url')
    .eq('id', eventId)
    .single()

  if (!event) return { error: 'Event not found' }

  // 5. Trigger invitation email and WhatsApp — independent, so run concurrently.
  // Each task resolves to a warning string (or undefined) rather than throwing,
  // so one failing send never blocks the other and both warnings surface.
  const [emailWarning, whatsappWarning] = await Promise.all([
    attendee.email
      ? (async (): Promise<string | undefined> => {
          try {
            const emailResult = await sendInvitationEmail({
              eventId,
              recipientEmail: attendee.email,
              recipientName: attendee.name,
              invitationId: invitation.id,
              event,
            })
            if (emailResult && 'error' in emailResult && emailResult.error) {
              console.error('Failed to send invitation email:', emailResult.error)
              return emailResult.error
            }
          } catch (e: unknown) {
            console.error('Failed to send invitation email:', e)
            Sentry.captureException(e, { extra: { attendeeId, eventId, context: 'accept_registration_email' } })
            return e instanceof Error ? e.message : 'Unknown email dispatch error'
          }
          return undefined
        })()
      : Promise.resolve<string | undefined>(undefined),
    attendee.phone
      ? (async (): Promise<string | undefined> => {
          try {
            const whatsappResult = await sendInvitationWhatsApp({
              eventId,
              recipientPhone: attendee.phone,
              recipientName: attendee.name,
              invitationId: invitation.id,
              event,
            })
            if (whatsappResult && 'error' in whatsappResult && whatsappResult.error) {
              console.error('Failed to send WhatsApp invitation:', whatsappResult.error)
              return whatsappResult.error
            }
          } catch (e: unknown) {
            console.error('Failed to send WhatsApp invitation:', e)
            Sentry.captureException(e, { extra: { attendeeId, eventId, context: 'accept_registration_whatsapp' } })
            return e instanceof Error ? e.message : 'Unknown WhatsApp dispatch error'
          }
          return undefined
        })()
      : Promise.resolve<string | undefined>(undefined),
  ])

  revalidatePath(`/events/${eventId}/registrations`)
  revalidatePath(`/events/${eventId}/guests`)

  const warnings: string[] = []
  if (emailWarning) {
    warnings.push(`Email failed: ${emailWarning}`)
  }
  if (whatsappWarning) {
    warnings.push(`WhatsApp failed: ${whatsappWarning}`)
  }

  if (warnings.length > 0) {
    return {
      success: true,
      warning: `Registrant accepted, but some notifications failed to send: ${warnings.join('; ')}.`,
    }
  }

  return { success: true }
}

/**
 * Reject a registration — and auto-promote the next waitlisted person if one exists.
 */
export async function rejectRegistration(attendeeId: string, eventId: string) {
  const supabase = await createClient()

  // 1. Verify target attendee is not already accepted
  const { data: attendee, error: fetchError } = await supabase
    .from('attendees')
    .select('registration_status')
    .eq('id', attendeeId)
    .single()

  if (fetchError || !attendee) return { error: 'Registrant not found' }
  if (attendee.registration_status === 'accepted') {
    return { error: 'Cannot reject an attendee who has already been accepted' }
  }

  const { error } = await supabase
    .from('attendees')
    .update({ registration_status: 'rejected' })
    .eq('id', attendeeId)
    .neq('registration_status', 'accepted')

  if (error) return { error: error.message }

  // Auto-promote first waitlist entry if event has a cap and a spot just opened
  const { data: event } = await supabase
    .from('events')
    .select('max_registrations')
    .eq('id', eventId)
    .single()

  if (event?.max_registrations) {
    const { data: next } = await supabase
      .from('attendees')
      .select('id')
      .eq('event_id', eventId)
      .eq('source', 'public_registration')
      .eq('registration_status', 'waitlist')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (next) {
      await supabase
        .from('attendees')
        .update({ registration_status: 'pending' })
        .eq('id', next.id)
    }
  }

  revalidatePath(`/events/${eventId}/registrations`)
  return { success: true }
}

/**
 * Manually promote a waitlisted registration to pending for organiser review.
 */
export async function promoteFromWaitlist(attendeeId: string, eventId: string) {
  const supabase = await createClient()

  // Verify there is capacity before promoting
  const { data: event } = await supabase
    .from('events')
    .select('max_registrations')
    .eq('id', eventId)
    .single()

  if (event?.max_registrations) {
    const { count } = await supabase
      .from('attendees')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('source', 'public_registration')
      .not('registration_status', 'in', '(rejected,waitlist)')

    if ((count ?? 0) >= event.max_registrations) {
      return { error: 'No capacity available — reject or accept another registration first.' }
    }
  }

  const { error } = await supabase
    .from('attendees')
    .update({ registration_status: 'pending' })
    .eq('id', attendeeId)
    .eq('registration_status', 'waitlist') // safety guard

  if (error) return { error: error.message }

  revalidatePath(`/events/${eventId}/registrations`)
  return { success: true }
}

/**
 * Send reminder emails to all accepted registrants / confirmed guests.
 */
export async function sendReminderEmails(eventId: string, customMessage: string) {
  const supabase = await createClient()

  // Get event
  const { data: event } = await supabase
    .from('events')
    .select('name, date, time, venue, event_type, banner_url')
    .eq('id', eventId)
    .single()

  if (!event) return { error: 'Event not found' }

  // Get all non-cancelled invitations with attendee details
  const { data: invitations } = await supabase
    .from('invitations')
    .select('id, status, attendee:attendees(email, name)')
    .eq('event_id', eventId)
    .neq('status', 'cancelled')

  const invList = (invitations ?? []) as unknown as { id: string; status: string; attendee: { email?: string; name?: string } | { email?: string; name?: string }[] }[]
  const recipients = invList
    .map(inv => {
      const attendee = Array.isArray(inv.attendee) ? inv.attendee[0] : inv.attendee
      return { email: attendee?.email, name: attendee?.name ?? 'Guest', invitationId: inv.id }
    })
    .filter((r): r is ReminderEmailRecipient => Boolean(r.email))

  if (recipients.length === 0) return { error: 'No confirmed guests with emails to send to' }

  try {
    const res = await sendReminderEmailsDirect({
      eventId,
      recipients,
      event,
      customMessage,
    })

    revalidatePath(`/events/${eventId}`)

    const resRecord = res as Record<string, unknown>
    if (res.sent === 0 && Number(resRecord.skipped) > 0 && !res.errors?.length) {
      return { error: 'No emails sent — all guests have unsubscribed from emails.' }
    }

    if (res.sent === 0 && res.errors?.length) {
      return { error: `Failed to send reminders: ${res.errors.join(', ')}` }
    }

    return {
      success: true,
      count: res.sent,
      warning: res.errors?.length
        ? `Sent to ${res.sent} guest(s). Failed for: ${res.errors.join(', ')}`
        : undefined,
    }
  } catch (e: unknown) {
    Sentry.captureException(e, { extra: { eventId, context: 'send_reminder_emails' } })
    return { error: e instanceof Error ? e.message : 'Failed to send reminder emails' }
  }
}

/**
 * Bulk accept registrations — marks multiple attendees as accepted, creates active invitations,
 * and sends invitation emails / WhatsApp messages.
 */
export async function bulkAcceptRegistrations(attendeeIds: string[], eventId: string) {
  if (!attendeeIds || attendeeIds.length === 0) {
    return { error: 'No registrations selected' }
  }

  const supabase = await createClient()

  // 1. Verify capacity if max_registrations is set
  const { data: event } = await supabase
    .from('events')
    .select('name, date, time, venue, description, banner_url, max_registrations')
    .eq('id', eventId)
    .single()

  if (!event) return { error: 'Event not found' }

  let targetIds = [...attendeeIds]
  if (event.max_registrations) {
    const { count } = await supabase
      .from('attendees')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('source', 'public_registration')
      .not('registration_status', 'in', '(rejected,waitlist)')

    const currentCount = count ?? 0
    const available = Math.max(0, event.max_registrations - currentCount)
    if (available === 0) {
      return { error: 'Event registration capacity limit reached. Cannot accept more attendees.' }
    }
    if (targetIds.length > available) {
      targetIds = targetIds.slice(0, available)
    }
  }

  // 2. Fetch pending / waitlisted target attendees
  const { data: attendees, error: fetchError } = await supabase
    .from('attendees')
    .select('*')
    .eq('event_id', eventId)
    .in('id', targetIds)
    .neq('registration_status', 'accepted')

  if (fetchError || !attendees || attendees.length === 0) {
    return { error: 'No eligible registrations found to accept' }
  }

  const acceptedIds: string[] = []
  const failedNotifications: string[] = []

  // 3. Process acceptance for each attendee
  for (const attendee of attendees) {
    const { error: updateError } = await supabase
      .from('attendees')
      .update({ registration_status: 'accepted' })
      .eq('id', attendee.id)

    if (updateError) continue

    acceptedIds.push(attendee.id)

    const { data: invitation, error: invError } = await supabase
      .from('invitations')
      .insert({
        event_id: eventId,
        attendee_id: attendee.id,
        party_size: 1,
        status: 'active',
        ticket_tier_id: attendee.ticket_tier_id ?? null,
      })
      .select()
      .single()

    if (!invError && invitation) {
      const [emailRes, whatsappRes] = await Promise.all([
        attendee.email
          ? sendInvitationEmail({
              eventId,
              recipientEmail: attendee.email,
              recipientName: attendee.name,
              invitationId: invitation.id,
              event,
            }).catch((e: unknown) => {
              Sentry.captureException(e, { extra: { attendeeId: attendee.id, eventId, context: 'bulk_accept_email' } })
              return { error: e instanceof Error ? e.message : 'Email dispatch error' }
            })
          : Promise.resolve(undefined),
        attendee.phone
          ? sendInvitationWhatsApp({
              eventId,
              recipientPhone: attendee.phone,
              recipientName: attendee.name,
              invitationId: invitation.id,
              event,
            }).catch((e: unknown) => {
              Sentry.captureException(e, { extra: { attendeeId: attendee.id, eventId, context: 'bulk_accept_whatsapp' } })
              return { error: e instanceof Error ? e.message : 'WhatsApp dispatch error' }
            })
          : Promise.resolve(undefined),
      ])

      if (emailRes && 'error' in emailRes && emailRes.error) {
        failedNotifications.push(`${attendee.name} (email: ${emailRes.error})`)
      }
      if (whatsappRes && 'error' in whatsappRes && whatsappRes.error) {
        failedNotifications.push(`${attendee.name} (WhatsApp: ${whatsappRes.error})`)
      }
    }
  }

  revalidatePath(`/events/${eventId}/registrations`)
  revalidatePath(`/events/${eventId}/guests`)

  let warning: string | undefined
  if (failedNotifications.length > 0) {
    warning = `Accepted ${acceptedIds.length} registrant(s), but notification dispatches failed for: ${failedNotifications.join('; ')}`
  }

  const isTruncated = targetIds.length < attendeeIds.length
  if (isTruncated) {
    const cappedMsg = `Accepted ${acceptedIds.length} registrant(s) (capped at available capacity).`
    warning = warning ? `${cappedMsg} ${warning}` : cappedMsg
  }

  return {
    success: true,
    count: acceptedIds.length,
    warning,
  }
}

/**
 * Bulk reject registrations — marks multiple attendees as rejected and auto-promotes waitlisted entries if capacity allows.
 */
export async function bulkRejectRegistrations(attendeeIds: string[], eventId: string) {
  if (!attendeeIds || attendeeIds.length === 0) {
    return { error: 'No registrations selected' }
  }

  const supabase = await createClient()

  const { data: updatedData, error } = await supabase
    .from('attendees')
    .update({ registration_status: 'rejected' })
    .eq('event_id', eventId)
    .in('id', attendeeIds)
    .neq('registration_status', 'accepted')
    .select('id')

  if (error) return { error: error.message }

  const rejectedCount = updatedData?.length ?? 0

  if (rejectedCount === 0) {
    return { error: 'Selected registrants have already been accepted and cannot be rejected' }
  }

  // Auto-promote waitlisted entries if event has a max capacity cap
  const { data: event } = await supabase
    .from('events')
    .select('max_registrations')
    .eq('id', eventId)
    .single()

  if (event?.max_registrations && rejectedCount > 0) {
    const { data: nextWaitlisted } = await supabase
      .from('attendees')
      .select('id')
      .eq('event_id', eventId)
      .eq('source', 'public_registration')
      .eq('registration_status', 'waitlist')
      .order('created_at', { ascending: true })
      .limit(rejectedCount)

    if (nextWaitlisted && nextWaitlisted.length > 0) {
      const waitlistIds = nextWaitlisted.map(w => w.id)
      await supabase
        .from('attendees')
        .update({ registration_status: 'pending' })
        .in('id', waitlistIds)
    }
  }

  revalidatePath(`/events/${eventId}/registrations`)
  return { success: true, count: rejectedCount }
}

