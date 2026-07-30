import { notFound } from 'next/navigation'
import { getRegisterEvent } from '@/lib/register-event'
import RegistrationClient from './registration-client'

// Registration state (capacity, tiers) changes over time, so render per-request.
export const dynamic = 'force-dynamic'

export default async function PublicRegistrationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const result = await getRegisterEvent(slug)

  // Missing / draft / closed event → Next.js not-found page.
  if (result.error) {
    notFound()
  }

  // Event data is server-fetched and passed as a prop — no client-side loading spinner.
  return <RegistrationClient event={result.event} />
}
