import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getRegisterEvent } from '@/lib/register-event'
import RegistrationClient from './registration-client'

// Registration state (capacity, tiers) changes over time, so render per-request.
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const result = await getRegisterEvent(slug)

  if (result.error || !result.event) {
    return {
      title: 'Event Not Found | Crenelle',
    }
  }

  const { event } = result
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

  const imageUrl = event.banner_url || '/og-image.png'

  return {
    title,
    description: truncatedDescription,
    openGraph: {
      title,
      description: truncatedDescription,
      type: 'website',
      siteName: 'Crenelle',
      images: [
        {
          url: imageUrl,
          alt: `${event.name} banner`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: truncatedDescription,
      images: [imageUrl],
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

