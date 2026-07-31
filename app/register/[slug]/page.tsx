import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRegisterEvent } from '@/lib/register-event'
import { getOptimizedBannerUrl } from '@/lib/images'
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

  // Query events table directly for metadata so link previews work even when previewing/drafting
  const supabase = createAdminClient()
  const { data: event } = await supabase
    .from('events')
    .select('name, date, venue, description, banner_url, event_type')
    .eq('registration_slug', slug)
    .maybeSingle()

  if (!event) {
    return {
      title: 'Event Not Found | Crenelle',
      description: 'The requested event registration link could not be found.',
    }
  }

  const title = `Register for ${event.name} | Crenelle`

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

  // Missing / draft / closed event → Next.js not-found page.
  if (result.error) {
    notFound()
  }

  // Event data is server-fetched and passed as a prop — no client-side loading spinner.
  return <RegistrationClient event={result.event} />
}

