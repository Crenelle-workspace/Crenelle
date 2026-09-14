import { createAdminClient } from '@/lib/supabase/admin'
import type { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js'
import type { AgendaItem, SpeakerInfo, FAQItem, RegistrationQuestion } from '@/lib/types'

/** Public event payload powering the registration page. */
export interface RegisterEventInfo {
  id: string
  name: string
  date: string
  time: string | null
  timezone: string
  venue: string
  description: string | null
  status: string
  max_registrations: number | null
  auto_approve_registrations?: boolean
  registration_count: number
  banner_url: string | null
  agenda: AgendaItem[]
  speakers: SpeakerInfo[]
  faqs: FAQItem[]
  registration_questions: RegistrationQuestion[]
  location_url: string | null
  tiers: Array<{ id: string; name: string; price: number; currency: string }>
  platform_fee_percent: number
}

export type RegisterEventResult =
  | { event: RegisterEventInfo; error?: undefined }
  | { event?: undefined; error: 'not_found' | 'upstream_error' }

/**
 * Fetch the public registration payload for an event by its slug.
 *
 * Shared by the `/api/register/[slug]` route and the server-rendered
 * `/register/[slug]` page so both stay in sync. The registration count, ticket
 * tiers, and organiser payment settings are all independent of one another once
 * the event row is known, so they're fetched in a single parallel round-trip.
 */
interface EventRow {
  id: string
  organizer_id: string
  name: string
  date: string
  time: string | null
  timezone: string | null
  venue: string
  description: string | null
  status: string
  event_type: string
  max_registrations: number | null
  auto_approve_registrations?: boolean | null
  banner_url: string | null
  agenda: AgendaItem[] | null
  speakers: SpeakerInfo[] | null
  faqs: FAQItem[] | null
  registration_questions: RegistrationQuestion[] | null
  location_url: string | null
}

/** Milliseconds before a Supabase query is aborted and retried. */
const QUERY_TIMEOUT_MS = 5_000

/**
 * Run the events slug lookup with a real abort timeout.
 * Uses AbortSignal.timeout() fed into Supabase's .abortSignal() so the
 * underlying fetch is genuinely cancelled — not just ignored.
 * Retries once on timeout or transient error before giving up.
 */
async function fetchEventBySlug(
  supabase: ReturnType<typeof createAdminClient>,
  slug: string
): Promise<PostgrestSingleResponse<EventRow>> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await supabase
        .from('events')
        .select('id, organizer_id, name, date, time, timezone, venue, description, status, event_type, max_registrations, auto_approve_registrations, banner_url, agenda, speakers, faqs, registration_questions, location_url')
        .eq('registration_slug', slug)
        .abortSignal(AbortSignal.timeout(QUERY_TIMEOUT_MS))
        .single()

      // Success or genuine not-found — stop retrying.
      if (!result.error || result.error.code === 'PGRST116') {
        return result as PostgrestSingleResponse<EventRow>
      }
    } catch (err) {
      // AbortError = timeout; only propagate after both attempts exhausted.
      if (attempt === 1) throw err
    }
  }
  // Unreachable, but satisfies TS.
  throw new Error('fetchEventBySlug: exhausted retries')
}

export async function getRegisterEvent(slug: string): Promise<RegisterEventResult> {
  const supabase = createAdminClient()

  let eventData: EventRow | null = null
  let eventError: PostgrestError | null = null

  try {
    const result = await fetchEventBySlug(supabase, slug)
    eventData = result.data
    eventError = result.error
  } catch {
    // Timeout or network failure after both attempts — retryable upstream error.
    return { error: 'upstream_error' }
  }

  if (eventError) {
    // PGRST116 = "no rows returned" — event genuinely doesn't exist.
    if (eventError.code === 'PGRST116') return { error: 'not_found' }
    // Any other error (5xx, network, SSL) — transient, not a permanent 404.
    return { error: 'upstream_error' }
  }

  const event = eventData

  // Draft events are not publicly accessible.
  if (!event || event.status === 'draft') {
    return { error: 'not_found' }
  }

  const [{ count }, { data: tiers }, { data: paymentSettings }] = await Promise.all([
    supabase
      .from('attendees')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('source', 'public_registration')
      .neq('registration_status', 'rejected'),
    supabase
      .from('ticket_tiers')
      .select('id, name, price, currency')
      .eq('event_id', event.id)
      .is('deleted_at', null)
      .eq('is_public', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('organizer_payment_settings')
      .select('platform_fee_percent')
      .eq('organizer_id', event.organizer_id)
      .maybeSingle(),
  ])

  return {
    event: {
      id: event.id,
      name: event.name,
      date: event.date,
      time: event.time,
      timezone: event.timezone || 'Africa/Lagos',
      venue: event.venue,
      description: event.description,
      status: event.status,
      max_registrations: event.max_registrations,
      auto_approve_registrations: event.auto_approve_registrations ?? false,
      registration_count: count ?? 0,
      banner_url: event.banner_url,
      agenda: (event.agenda as AgendaItem[]) || [],
      speakers: (event.speakers as SpeakerInfo[]) || [],
      faqs: (event.faqs as FAQItem[]) || [],
      registration_questions: (event.registration_questions as RegistrationQuestion[]) || [],
      location_url: event.location_url || null,
      tiers: tiers ?? [],
      platform_fee_percent: paymentSettings?.platform_fee_percent ?? 5,
    },
  }
}
