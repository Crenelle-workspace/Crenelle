import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getEventAccess } from '@/lib/team-access'
import RegistrationsPageClient from './registrations-client'

export const metadata: Metadata = { title: 'Registrations' }

export default async function RegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const access = await getEventAccess(id)

  if (!access.role) {
    notFound()
  }

  return (
    <RegistrationsPageClient
      canManageGuests={access.canManageGuests}
      isOwner={access.isOwner}
      role={access.role}
    />
  )
}
