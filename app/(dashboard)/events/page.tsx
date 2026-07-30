import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCoHostedEvents } from '@/app/actions/team'
import { EventsDashboardClient } from './events-dashboard'
import type { Event, Invitation } from '@/lib/types'

export default async function EventsPage() {
  const supabase = await createClient()
  
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: false })

  const { data: invitations } = await supabase
    .from('invitations')
    .select('id, event_id, party_size, status')

  const { data: logs } = await supabase
    .from('entry_logs')
    .select('invitation_id')

  // Co-hosted events (events this user has been invited to as a member)
  const { memberships } = await getCoHostedEvents()
  let coHostedEvents: Array<Event & { memberRole: string }> = []

  if (memberships.length > 0) {
    const { data: memberEvents } = await supabase
      .from('events')
      .select('*')
      .in('id', memberships.map(m => m.event_id))
      .order('date', { ascending: false })

    coHostedEvents = (memberEvents ?? []).map(ev => ({
      ...(ev as Event),
      memberRole: memberships.find(m => m.event_id === ev.id)?.role ?? 'viewer',
    }))
  }

  // Workspace setup status indicators.
  // Resolve the user once and reuse the id — previously getUser() ran twice here.
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? ''

  const [
    { data: profilesData },
    { data: paymentData },
    { data: orgSettingsData }
  ] = await Promise.all([
    supabase
      .from('sender_profiles')
      .select('id')
      .limit(1),
    supabase
      .from('organizer_payment_settings')
      .select('is_verified, paystack_subaccount_code')
      .eq('organizer_id', userId)
      .maybeSingle(),
    supabase
      .from('organizer_settings')
      .select('org_name, email_footer')
      .eq('organizer_id', userId)
      .maybeSingle(),
  ])

  const setupStatus = {
    hasOrgName: !!orgSettingsData?.org_name,
    hasSenderProfile: (profilesData ?? []).length > 0,
    hasPaymentSubaccount: !!paymentData?.is_verified && !!paymentData?.paystack_subaccount_code,
    hasEmailFooter: !!orgSettingsData?.email_footer,
  }

  const totalEvents = (events?.length ?? 0) + coHostedEvents.length
  const hasEvents = totalEvents > 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* ── Page header ── */}
      <div className={`${hasEvents ? 'hidden md:flex' : 'flex'} flex-col md:flex-row md:items-end justify-between mb-10 gap-6 pb-8 border-b border-border/40`}>
        <div className="space-y-1">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-copper bg-copper/10 border border-copper/20 px-2.5 py-1 rounded-full inline-block mb-2">
            Your Dashboard
          </span>
          <h1 className="font-display text-4xl sm:text-6xl font-bold uppercase text-foreground leading-[0.95] tracking-tight">
            Event Manifest
          </h1>
          <p className="font-sans text-xs text-muted-foreground pt-1">
            {totalEvents} {totalEvents === 1 ? 'event' : 'events'} currently managed
          </p>
        </div>
        
        <Link href="/events/new">
          <button className="inline-flex items-center gap-2 bg-copper hover:bg-copper-dark text-white font-sans text-xs font-bold px-6 py-3.5 rounded-full transition-all duration-300 shadow-md shadow-copper/20 cursor-pointer">
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        </Link>
      </div>

      <EventsDashboardClient 
        initialEvents={(events as Event[]) || []} 
        initialInvitations={(invitations as Invitation[]) || []}
        initialLogs={(logs as { invitation_id: string }[]) || []}
        coHostedEvents={coHostedEvents}
        setupStatus={setupStatus}
      />
    </div>
  )
}
