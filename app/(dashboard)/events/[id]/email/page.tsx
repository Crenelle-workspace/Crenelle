import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getEventAccess } from '@/lib/team-access'
import EmailClient from './email-client'

export const metadata: Metadata = { title: 'Email' }

export default async function EmailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const access = await getEventAccess(id)

  if (!access.role) {
    notFound()
  }

  return <EmailClient eventId={id} canEdit={access.canEdit} />
}
