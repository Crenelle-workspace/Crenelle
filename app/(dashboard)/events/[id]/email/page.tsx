import type { Metadata } from 'next'
import EmailClient from './email-client'

export const metadata: Metadata = { title: 'Email' }

export default async function EmailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <EmailClient eventId={id} />
}
