import type { RegisterEventInfo } from '@/lib/register-event'
import type { FAQItem } from '@/lib/types'

/**
 * Combine a `YYYY-MM-DD` date, optional `HH:MM(:SS)` time, and IANA timezone
 * into an ISO 8601 string with an explicit UTC offset
 * (e.g. `2025-11-15T19:00:00+01:00`).
 *
 * The offset is derived from the target timezone at that instant so the value
 * is unambiguous for crawlers. Falls back to the bare local string if the
 * runtime can't resolve the zone.
 */
function toSchemaDate(date: string, time: string | null, tz: string): string {
  const timeStr = (time ?? '00:00').slice(0, 5)
  const local = `${date}T${timeStr}:00`
  try {
    const approxUtc = new Date(`${local}Z`)
    const tzName = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'longOffset',
    })
      .formatToParts(approxUtc)
      .find((p) => p.type === 'timeZoneName')?.value

    // `longOffset` yields "GMT+01:00" or plain "GMT" for UTC.
    const offset = !tzName || tzName === 'GMT' ? '+00:00' : tzName.replace('GMT', '')
    return `${local}${offset}`
  } catch {
    return local
  }
}

const EVENT_STATUS_MAP: Record<string, string> = {
  published: 'https://schema.org/EventScheduled',
  active: 'https://schema.org/EventScheduled',
  open: 'https://schema.org/EventScheduled',
  sold_out: 'https://schema.org/EventScheduled',
  cancelled: 'https://schema.org/EventCancelled',
  canceled: 'https://schema.org/EventCancelled',
  postponed: 'https://schema.org/EventPostponed',
  rescheduled: 'https://schema.org/EventRescheduled',
}

/**
 * Build a schema.org `Event` object for an event registration page.
 * Enables Google event rich results (date, venue, ticket pricing).
 */
export function buildEventSchema(
  event: RegisterEventInfo,
  canonicalUrl: string,
  absoluteImageUrl: string,
): Record<string, unknown> {
  const location: Record<string, unknown> = {
    '@type': 'Place',
    name: event.venue,
  }
  if (event.location_url) {
    location.url = event.location_url
  }

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    startDate: toSchemaDate(event.date, event.time, event.timezone),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: EVENT_STATUS_MAP[event.status] ?? 'https://schema.org/EventScheduled',
    location,
    image: [absoluteImageUrl],
    url: canonicalUrl,
    organizer: {
      '@type': 'Organization',
      name: 'Crenelle',
      url: 'https://crenelle.org',
    },
  }

  if (event.description) {
    schema.description = event.description
  }

  if (event.max_registrations !== null) {
    schema.maximumAttendeeCapacity = event.max_registrations
  }

  // Ticket tiers → Offer nodes. Prices are stored in minor units (kobo).
  if (event.tiers.length > 0) {
    schema.offers = event.tiers.map((tier) => ({
      '@type': 'Offer',
      name: tier.name,
      price: (tier.price / 100).toFixed(2),
      priceCurrency: tier.currency,
      availability: 'https://schema.org/InStock',
      url: canonicalUrl,
    }))
  }

  return schema
}

/** Build a schema.org `FAQPage` object from an event's FAQ list. */
export function buildFaqSchema(faqs: FAQItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}
