import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getEventAccess } from '@/lib/team-access'
import CardsPageClient from './cards-client'

export const metadata: Metadata = { title: 'Passes' }

export default async function CardsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const access = await getEventAccess(id)

  if (!access.role) {
    notFound()
  }

  return <CardsPageClient />
}
