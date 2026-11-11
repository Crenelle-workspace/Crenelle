import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCoHostedEvents } from '@/app/actions/team'
import { EventsDashboardClient } from './events-dashboard'
import type { Event, Invitation } from '@/lib/types'
import type { DashboardAttendee, DashboardTier } from './hooks/use-dashboard-data'

export default async function EventsPage() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: false })

  const ownedEvents = (events as Event[]) || []
  const ownedIds = new Set(ownedEvents.map((e) => e.id))

  // Co-hosted events (events this user has been invited to as a member, excluding owned events)
  const { memberships } = await getCoHostedEvents()
  const uniqueMemberships = memberships.filter((m) => !ownedIds.has(m.event_id))
  let coHostedEvents: Array<Event & { memberRole: string }> = []

  if (uniqueMemberships.length > 0) {
    const { data: memberEvents } = await supabase
      .from('events')
      .select('*')
      .in(
        'id',
        uniqueMemberships.map((m) => m.event_id)
      )
      .order('date', { ascending: false })

    coHostedEvents = (memberEvents ?? []).map((ev) => ({
      ...(ev as Event),
      memberRole:
        uniqueMemberships.find((m) => m.event_id === ev.id)?.role ?? 'viewer',
    }))
  }

  // Gather all workspace event IDs across owned and co-hosted events
  const allEventIds = [
    ...ownedEvents.map((e) => e.id),
    ...coHostedEvents.map((e) => e.id),
  ]

  // Scoped parallel queries for invitations, attendees, and ticket tiers
  const [invitationsRes, attendeesRes, tiersRes] =
    allEventIds.length > 0
      ? await Promise.all([
          supabase
            .from('invitations')
            .select('id, event_id, party_size, status')
            .in('event_id', allEventIds)
            .limit(10000),
          supabase
            .from('attendees')
            .select('id, event_id, registration_status, source')
            .in('event_id', allEventIds)
            .limit(10000),
          supabase
            .from('ticket_tiers')
            .select('id, event_id, capacity')
            .in('event_id', allEventIds)
            .is('deleted_at', null),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }]

  const invitations = (invitationsRes.data as Invitation[]) || []
  const attendees = (attendeesRes.data as DashboardAttendee[]) || []
  const tiers = (tiersRes.data as DashboardTier[]) || []

  // Scoped entry logs for these invitations
  const invIds = invitations.map((i) => i.id)
  const { data: logsData } =
    invIds.length > 0
      ? await supabase
          .from('entry_logs')
          .select('invitation_id')
          .in('invitation_id', invIds)
          .limit(10000)
      : { data: [] }

  const logs = (logsData as { invitation_id: string }[]) || []

  // Workspace setup status indicators.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user?.id ?? ''

  const [
    { data: profilesData },
    { data: paymentData },
    { data: orgSettingsData },
  ] = await Promise.all([
    supabase.from('sender_profiles').select('id').limit(1),
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
    hasPaymentSubaccount:
      !!paymentData?.is_verified && !!paymentData?.paystack_subaccount_code,
    hasEmailFooter: !!orgSettingsData?.email_footer,
  }

  const totalEvents = ownedEvents.length + coHostedEvents.length

  return (
    <div className="w-full space-y-8">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-border/40">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-copper" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-copper">
              Event Portfolio
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase text-foreground leading-[0.95] tracking-tight">
            Event Manifest
          </h1>
          <p className="font-sans text-xs text-muted-foreground pt-0.5">
            {totalEvents} {totalEvents === 1 ? 'event' : 'events'} managed across your workspace
          </p>
        </div>

        <Link href="/events/new" className="lg:hidden self-start sm:self-auto">
          <button className="inline-flex items-center gap-2 bg-copper hover:bg-copper-dark text-white font-sans text-xs font-bold px-5 py-3 rounded-full transition-all duration-300 shadow-md shadow-copper/20 cursor-pointer">
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        </Link>
      </div>

      <EventsDashboardClient
        initialEvents={ownedEvents}
        initialInvitations={invitations}
        initialLogs={logs}
        initialAttendees={attendees}
        initialTiers={tiers}
        coHostedEvents={coHostedEvents}
        setupStatus={setupStatus}
      />
    </div>
  )
}
