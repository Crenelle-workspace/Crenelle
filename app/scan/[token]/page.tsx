import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import ScannerClient from '@/components/scanner/ScannerClient'

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950 p-6 select-none">
        <div className="text-center text-foreground max-w-md w-full bg-card/40 backdrop-blur-xl border border-border/40 p-8 rounded-3xl shadow-2xl">
          <p className="font-display text-8xl mb-6 opacity-40">🔒</p>
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full inline-block mb-3">
            Access Revoked
          </span>
          <h1 className="font-display text-4xl uppercase text-foreground leading-none mb-3">Link Deactivated</h1>
          <p className="font-sans text-xs text-muted-foreground leading-relaxed">
            This scanner link has been deactivated by the event organizer.
            Please contact them to re-enable access for this gate.
          </p>
        </div>
      </div>
    )
  }

  // --- Event not yet live (draft or published) ---
  if (eventStatus === 'draft' || eventStatus === 'published') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950 p-6 select-none">
        <div className="text-center text-foreground max-w-md w-full bg-card/40 backdrop-blur-xl border border-border/40 p-8 rounded-3xl shadow-2xl">
          <p className="font-display text-8xl mb-6 opacity-40">⏳</p>
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-copper bg-copper/10 border border-copper/20 px-2.5 py-1 rounded-full inline-block mb-3">
            Standby Mode
          </span>
          <h1 className="font-display text-4xl uppercase text-foreground leading-none mb-3">Not Yet Open</h1>
          <p className="font-sans text-xs text-muted-foreground leading-relaxed">
            Scanning for{' '}
            <span className="text-foreground font-bold">{event?.name}</span>{' '}
            has not opened yet. The organizer will set the event status to{' '}
            <span className="text-copper font-bold">Live</span> when admission begins.
          </p>
          <div className="mt-6 border border-copper/30 bg-copper/10 rounded-2xl p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-copper">
              Stand by — this page will activate automatically when live.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // --- Event has ended ---
  if (eventStatus === 'ended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950 p-6 select-none">
        <div className="text-center text-foreground max-w-md w-full bg-card/40 backdrop-blur-xl border border-border/40 p-8 rounded-3xl shadow-2xl">
          <p className="font-display text-8xl mb-6 opacity-40">🏁</p>
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400 bg-stone-500/10 border border-border/30 px-2.5 py-1 rounded-full inline-block mb-3">
            Event Closed
          </span>
          <h1 className="font-display text-4xl uppercase text-foreground leading-none mb-3">Event Ended</h1>
          <p className="font-sans text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-bold">{event?.name}</span> has ended.
            This scanner link is closed and no further admissions can be scanned.
          </p>
        </div>
      </div>
    )
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
