'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils/slug'



export async function createEvent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const eventType = (formData.get('event_type') as string) || 'closed'
  const name = formData.get('name') as string
  const emailTheme = (formData.get('email_theme') as string) || 'classic'
  const eventDate = formData.get('date') as string
  const eventTz = (formData.get('timezone') as string) || 'Africa/Lagos'

  let todayStr: string
  try {
    todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: eventTz }).format(new Date())
  } catch {
    todayStr = new Date().toISOString().split('T')[0]
  }

  if (eventDate && eventDate < todayStr) {
    return { error: 'Event date cannot be in the past. Please select today or a future date.' }
  }

  let agenda: unknown[] = []
  if (formData.has('agenda')) {
    try { agenda = JSON.parse(formData.get('agenda') as string) } catch {}
  }
  let speakers: unknown[] = []
  if (formData.has('speakers')) {
    try { speakers = JSON.parse(formData.get('speakers') as string) } catch {}
  }
  let faqs: unknown[] = []
  if (formData.has('faqs')) {
    try { faqs = JSON.parse(formData.get('faqs') as string) } catch {}
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      organizer_id: user.id,
      name,
      date: formData.get('date') as string,
      time: (formData.get('time') as string) || null,
      timezone: (formData.get('timezone') as string) || 'Africa/Lagos',
      venue: formData.get('venue') as string,
      description: (formData.get('description') as string) || null,
      capacity: formData.get('capacity') ? Number(formData.get('capacity')) : null,
      event_type: eventType,
      registration_slug: eventType === 'open' ? generateSlug(name) : null,
      max_registrations: formData.get('max_registrations') ? Number(formData.get('max_registrations')) : null,
      auto_approve_registrations: formData.get('auto_approve_registrations') === 'true' || formData.get('auto_approve_registrations') === 'on',
      banner_url: (formData.get('banner_url') as string) || null,
      sender_profile_id: (formData.get('sender_profile_id') as string) || null,
      location_url: (formData.get('location_url') as string) || null,
      email_theme: emailTheme,
      agenda,
      speakers,
      faqs,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/events')
  if (data.registration_slug) {
    revalidatePath(`/register/${data.registration_slug}`)
  }
  redirect(`/events/${data.id}`)
}

function getStorageFilename(url: string | null | undefined): string | null {
  if (!url) return null
  if (!url.includes('/storage/v1/object/public/banners/')) return null
  try {
    const parts = url.split('/storage/v1/object/public/banners/')
    if (parts.length < 2) return null
    const filename = parts[1].split('?')[0].split('#')[0]
    return filename || null
  } catch {
    return null
  }
}

export async function updateEvent(id: string, formData: FormData) {
  const supabase = await createClient()

  // Fetch current event to check the current banner_url before updating
  const { data: currentEvent } = await supabase
    .from('events')
    .select('banner_url, registration_slug')
    .eq('id', id)
    .single()

  const eventType = (formData.get('event_type') as string) || 'closed'
  const name = formData.get('name') as string
  const newBannerUrl = (formData.get('banner_url') as string) || null

  // If switching to open and no slug exists, generate one
  let registrationSlug: string | null = (formData.get('registration_slug') as string) || null
  if (eventType === 'open' && !registrationSlug) {
    registrationSlug = generateSlug(name)
  }
  if (eventType === 'closed') {
    registrationSlug = null
  }

  const eventDate = formData.get('date') as string
  const eventTz = (formData.get('timezone') as string) || 'Africa/Lagos'

  if (eventDate) {
    let todayStr: string
    try {
      todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: eventTz }).format(new Date())
    } catch {
      todayStr = new Date().toISOString().split('T')[0]
    }

    if (eventDate < todayStr) {
      return { error: 'Event date cannot be in the past. Please select today or a future date.' }
    }
  }

  const updateData: Record<string, unknown> = {
    name,
    date: eventDate,
    time: (formData.get('time') as string) || null,
    timezone: eventTz,
    venue: formData.get('venue') as string,
    description: (formData.get('description') as string) || null,
    capacity: formData.get('capacity') ? Number(formData.get('capacity')) : null,
    status: formData.get('status') as string,
    event_type: eventType,
    registration_slug: registrationSlug,
    max_registrations: formData.get('max_registrations') ? Number(formData.get('max_registrations')) : null,
    auto_approve_registrations: formData.get('auto_approve_registrations') === 'true' || formData.get('auto_approve_registrations') === 'on',
    banner_url: newBannerUrl,
    sender_profile_id: (formData.get('sender_profile_id') as string) || null,
    location_url: (formData.get('location_url') as string) || null,
  }

  if (formData.has('email_theme')) {
    updateData.email_theme = formData.get('email_theme') as string
  }

  if (formData.has('agenda')) {
    try {
      updateData.agenda = JSON.parse(formData.get('agenda') as string)
    } catch {
      // invalid json fallback
    }
  }

  if (formData.has('speakers')) {
    try {
      updateData.speakers = JSON.parse(formData.get('speakers') as string)
    } catch {
      // invalid json fallback
    }
  }

  if (formData.has('faqs')) {
    try {
      updateData.faqs = JSON.parse(formData.get('faqs') as string)
    } catch {
      // invalid json fallback
    }
  }

  const { error } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', id)

  if (error) return { error: error.message }

  // Clean up old banner from storage if it has changed
  if (currentEvent && currentEvent.banner_url !== newBannerUrl) {
    const oldFilename = getStorageFilename(currentEvent.banner_url)
    if (oldFilename) {
      await supabase.storage.from('banners').remove([oldFilename])
    }
  }

  revalidatePath('/events')
  revalidatePath(`/events/${id}`)
  const slugToRevalidate = registrationSlug || currentEvent?.registration_slug
  if (slugToRevalidate) {
    revalidatePath(`/register/${slugToRevalidate}`)
  }

  return { success: true }
}

export async function updateEventEmailTheme(id: string, theme: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('events')
    .update({ email_theme: theme })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/events/${id}`)
  revalidatePath(`/events/${id}/email`)
  return { success: true }
}

export async function deleteEvent(id: string) {
  const supabase = await createClient()

  // Fetch current event to check for banner_url before deletion
  const { data: currentEvent } = await supabase
    .from('events')
    .select('banner_url')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('events').delete().eq('id', id)

  if (error) return { error: error.message }

  // Clean up physical banner file if it exists in Supabase Storage
  if (currentEvent?.banner_url) {
    const filename = getStorageFilename(currentEvent.banner_url)
    if (filename) {
      await supabase.storage.from('banners').remove([filename])
    }
  }

  revalidatePath('/events')
  redirect('/events')
}

/** Lightweight status-only update — used from the quick-change status pill on event cards */
export async function updateEventStatus(id: string, status: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/events')
  revalidatePath(`/events/${id}`)
  return { success: true }
}

/** Lightweight toggle for auto-approve registrations setting */
export async function toggleAutoApprove(id: string, autoApprove: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('events')
    .update({ auto_approve_registrations: autoApprove })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/events/${id}`)
  revalidatePath(`/events/${id}/registrations`)
  return { success: true }
}

