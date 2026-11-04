import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getEventAccess } from '@/lib/team-access'
import LiveDashboardPage from './dashboard-client'

export const metadata: Metadata = { title: 'Live Dashboard' }

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const access = await getEventAccess(id)

  if (!access.role) {
    notFound()
  }

  return <LiveDashboardPage role={access.role} />
}
