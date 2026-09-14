import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getRegisterEvent } from '@/lib/register-event'
import { getOptimizedBannerUrl } from '@/lib/images'
import { JsonLd } from '@/components/seo/json-ld'
import { buildEventSchema, buildFaqSchema, buildBreadcrumbSchema } from '@/lib/seo/event-schema'
import RegistrationClient from './registration-client'

// Registration state (capacity, tiers) changes over time, so render per-request.
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'https://crenelle.org'
}

function getAbsoluteImageUrl(url: string | null | undefined, baseUrl: string): string {
  if (!url) return `${baseUrl}/og-image.png`
  const optimized = getOptimizedBannerUrl(url, 'web')
  if (optimized.startsWith('http://') || optimized.startsWith('https://')) {
    return optimized
  }
  return `${baseUrl}${optimized.startsWith('/') ? '' : '/'}${optimized}`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const baseUrl = getBaseUrl()

  // Reuse getRegisterEvent — same fetch the page component needs, no extra round-trip.
  // Draft events still get valid metadata so link previews work before an event goes live.
  const result = await getRegisterEvent(slug)

  if (result.error) {
    return {
      title: 'Event Not Found',
      description: 'The requested event registration link could not be found.',
    }
  }

  const { event } = result
  const title = `Register for ${event.name}`

  let formattedDetails = ''
  if (event.date) {
    try {
      formattedDetails += new Date(event.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      formattedDetails += event.date
    }
  }
  if (event.venue) {
    formattedDetails += formattedDetails ? ` at ${event.venue}` : event.venue
  }

  const baseDescription = event.description || `Register for ${event.name} on Crenelle.`
  const description = formattedDetails
    ? `${formattedDetails} — ${baseDescription}`
    : baseDescription
  const truncatedDescription =
    description.length > 160 ? `${description.slice(0, 157)}...` : description

  const absoluteImageUrl = getAbsoluteImageUrl(event.banner_url, baseUrl)
  const canonicalUrl = `${baseUrl}/register/${slug}`

  return {
    title,
    description: truncatedDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description: truncatedDescription,
      url: canonicalUrl,
      siteName: 'Crenelle',
      type: 'website',
      images: [
        {
          url: absoluteImageUrl,
          secureUrl: absoluteImageUrl,
          width: 1200,
          height: 630,
          alt: `${event.name} Banner`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: truncatedDescription,
      images: [absoluteImageUrl],
    },
  }
}

export default async function PublicRegistrationPage({ params }: PageProps) {
  const { slug } = await params
  const result = await getRegisterEvent(slug)

  // Missing / draft event → Next.js not-found page.
  // Transient upstream failure (Supabase 504/525 timeout) → error.tsx retryable state.
  if (result.error) {
    if (result.error === 'not_found') {
      notFound()
    }
    throw new Error('Service temporarily unavailable. Please try again in a moment.')
  }

  const { event } = result
  const baseUrl = getBaseUrl()
  const canonicalUrl = `${baseUrl}/register/${slug}`
  const absoluteImageUrl = getAbsoluteImageUrl(event.banner_url, baseUrl)

  const eventSchema = buildEventSchema(event, canonicalUrl, absoluteImageUrl, baseUrl)
  const faqSchema = event.faqs.length > 0 ? buildFaqSchema(event.faqs) : null
  const breadcrumbSchema = buildBreadcrumbSchema(event.name, canonicalUrl, baseUrl)

  const schemas = [eventSchema, breadcrumbSchema, ...(faqSchema ? [faqSchema] : [])]

  // Event data is server-fetched and passed as a prop — no client-side loading spinner.
  return (
    <>
      <JsonLd data={schemas} />
      <RegistrationClient event={event} />
    </>
  )
}

