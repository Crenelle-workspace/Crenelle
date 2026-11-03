import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getEventAccess } from '@/lib/team-access'
import { RestrictedAccessView } from '@/components/restricted-access-view'
import TeamPageClient from './team-client'

export const metadata: Metadata = { title: 'Team' }

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const access = await getEventAccess(id)

  if (!access.role) {
    notFound()
  }

  if (!access.isOwner) {
    return (
      <RestrictedAccessView
        eventId={id}
        title="Organizer Access Required"
        description="Team member invitations, role assignments, and permission management are restricted exclusively to the primary event organizer."
      />
    )
  }

  return <TeamPageClient />
}
