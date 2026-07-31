import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import ScannerClient from '@/components/scanner/ScannerClient'
import ScannerStatusView from '@/components/scanner/ScannerStatusView'

export default async function ScannerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  // Validate the scanner token server-side; also join the event to check its status
  const { data: scannerLink } = await supabase
    .from('scanner_links')
    .select('id, label, event_id, is_active, event:events(name, date, venue, status)')
    .eq('token', token)
    .single()

  if (!scannerLink) notFound()

  const event = scannerLink.event as unknown as { name?: string; date?: string; venue?: string; status?: string } | null
  const eventStatus: string = event?.status ?? 'draft'

  // --- Link deactivated by organiser ---
  if (!scannerLink.is_active) {
    return <ScannerStatusView status="deactivated" eventName={event?.name} />
  }

  // --- Event not yet live (draft or published) ---
  if (eventStatus === 'draft' || eventStatus === 'published') {
    return <ScannerStatusView status="standby" eventName={event?.name} />
  }

  // --- Event has ended ---
  if (eventStatus === 'ended') {
    return <ScannerStatusView status="ended" eventName={event?.name} />
  }

  // --- Event is live — show scanner ---
  return (
    <ScannerClient
      token={token}
      gate={scannerLink.label}
      eventName={event?.name ?? ''}
      eventDate={event?.date ?? ''}
      eventVenue={event?.venue ?? ''}
      eventId={scannerLink.event_id}
    />
  )
}
