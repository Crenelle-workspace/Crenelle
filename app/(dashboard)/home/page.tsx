import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCoHostedEvents } from '@/app/actions/team'
import {
  HomeClient,
  type HomeEventSummary,
  type HomeActivityItem,
  type DailyPulsePoint,
} from './home-client'
import type { Event } from '@/lib/types'
import type { SetupStatus } from '@/components/workspace-setup-card'

export const metadata = {
  title: 'Workspace Home',
  description: 'Overview of your events, registrations, revenue, and live door operations.',
}

export default async function WorkspaceHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 1. Fetch owned events, co-host memberships, and workspace setup data in parallel
  const [
    { data: ownedEventsData },
    coHostData,
    { data: profilesData },
    { data: paymentSettingsData },
    { data: orgSettingsData },
  ] = await Promise.all([
    supabase.from('events').select('*').order('date', { ascending: false }),
    getCoHostedEvents().catch(() => ({ memberships: [], error: null })),
    supabase.from('sender_profiles').select('id').limit(1),
    supabase
      .from('organizer_payment_settings')
      .select('is_verified, paystack_subaccount_code')
      .eq('organizer_id', user.id)
      .maybeSingle(),
    supabase
      .from('organizer_settings')
      .select('org_name, email_footer')
      .eq('organizer_id', user.id)
      .maybeSingle(),
  ])

  const ownedEvents = (ownedEventsData ?? []) as Event[]
  const ownedIds = new Set(ownedEvents.map((e) => e.id))

  const externalMemberships = (coHostData?.memberships ?? []).filter(
    (m) => !ownedIds.has(m.event_id)
  )

  let coHostedEvents: Array<{ event: Event; role: string }> = []
  if (externalMemberships.length > 0) {
    const { data: memberEvents } = await supabase
      .from('events')
      .select('*')
      .in(
        'id',
        externalMemberships.map((m) => m.event_id)
      )
      .order('date', { ascending: false })

    coHostedEvents = ((memberEvents ?? []) as Event[]).map((ev) => ({
      event: ev,
      role: externalMemberships.find((m) => m.event_id === ev.id)?.role ?? 'viewer',
    }))
  }

  // Deduplicate events while preserving ownership metadata
  const allEntriesMap = new Map<string, { event: Event; isOwner: boolean; role?: string }>()
  for (const ev of ownedEvents) {
    allEntriesMap.set(ev.id, { event: ev, isOwner: true })
  }
  for (const item of coHostedEvents) {
    if (!allEntriesMap.has(item.event.id)) {
      allEntriesMap.set(item.event.id, {
        event: item.event,
        isOwner: false,
        role: item.role,
      })
    }
  }

  const allEventEntries = Array.from(allEntriesMap.values())
  const allEventIds = allEventEntries.map((e) => e.event.id)

  // 2. Fetch invitations, attendees, scanner links, entry logs, and payments for these events
  const admin = createAdminClient()

  const [invitationsRes, attendeesRes, scannersRes, paymentsRes] =
    allEventIds.length > 0
      ? await Promise.all([
          supabase
            .from('invitations')
            .select('id, event_id, attendee_id, party_size, status, checked_in_at, created_at')
            .in('event_id', allEventIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('attendees')
            .select('id, event_id, name, email, source, registration_status, created_at')
            .in('event_id', allEventIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('scanner_links')
            .select('id, event_id, is_active')
            .in('event_id', allEventIds),
          admin
            .from('payments')
            .select(
              'id, event_id, amount_kobo, organiser_amount_kobo, status, payer_name, payer_email, paid_at, created_at'
            )
            .in('event_id', allEventIds)
            .eq('status', 'paid')
            .order('created_at', { ascending: false }),
        ])
      : [
          { data: [] },
          { data: [] },
          { data: [] },
          { data: [] },
        ]

  const invitations = invitationsRes.data ?? []
  const attendees = attendeesRes.data ?? []
  const scannerLinks = scannersRes.data ?? []
  const paidPayments = paymentsRes.data ?? []

  // Fetch entry logs for active invitations to accurately determine check-ins
  const invitationIds = invitations.map((i) => i.id)
  const { data: logsData } =
    invitationIds.length > 0
      ? await supabase
          .from('entry_logs')
          .select('invitation_id, scanned_at')
          .in('invitation_id', invitationIds)
          .order('scanned_at', { ascending: false })
      : { data: [] }

  const entryLogs = logsData ?? []
  const checkedInInvIds = new Set(entryLogs.map((l) => l.invitation_id))

  const setupStatus: SetupStatus = {
    hasOrgName: !!orgSettingsData?.org_name,
    hasSenderProfile: (profilesData ?? []).length > 0,
    hasPaymentSubaccount:
      !!paymentSettingsData?.is_verified && !!paymentSettingsData?.paystack_subaccount_code,
    hasEmailFooter: !!orgSettingsData?.email_footer,
  }

  // 3. Build Per-Event Summaries
  const eventNameById = new Map<string, string>()
  for (const entry of allEventEntries) {
    eventNameById.set(entry.event.id, entry.event.name)
  }

  const eventSummaries: HomeEventSummary[] = allEventEntries.map(({ event, isOwner, role }) => {
    const evInvitations = invitations.filter(
      (inv) => inv.event_id === event.id && inv.status !== 'cancelled'
    )
    const evCheckedIn = evInvitations
      .filter((inv) => inv.status === 'checked_in' || checkedInInvIds.has(inv.id))
      .reduce((sum, inv) => sum + (inv.party_size || 1), 0)

    const totalGuests = evInvitations.reduce((sum, inv) => sum + (inv.party_size || 1), 0)

    const pendingRegistrations = attendees.filter(
      (att) => att.event_id === event.id && att.registration_status === 'pending'
    ).length

    const activeScanners = scannerLinks.filter(
      (sc) => sc.event_id === event.id && sc.is_active
    ).length

    const evPayments = paidPayments.filter((p) => p.event_id === event.id)
    const netRevenueKobo = evPayments.reduce(
      (sum, p) => sum + (p.organiser_amount_kobo ?? p.amount_kobo ?? 0),
      0
    )

    // Readiness checks (4 pillars: details & venue, guest list/registrations, active scanner link, published/live status)
    const checks = [
      Boolean(event.name && event.venue && event.date),
      totalGuests > 0,
      activeScanners > 0,
      event.status === 'published' || event.status === 'live',
    ]
    const completedChecks = checks.filter(Boolean).length
    const readinessPercent = Math.round((completedChecks / checks.length) * 100)
    const readinessRemaining = checks.length - completedChecks

    return {
      event,
      isOwner,
      memberRole: role,
      totalGuests,
      checkedIn: evCheckedIn,
      pendingRegistrations,
      activeScanners,
      netRevenueNgn: netRevenueKobo / 100,
      paidOrdersCount: evPayments.length,
      readinessPercent,
      readinessRemaining,
    }
  })

  // 4. Compute 14-Day Registration Pulse
  const now = new Date()
  const pulsePoints: DailyPulsePoint[] = []
  const countsByIsoDate = new Map<string, number>()

  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    countsByIsoDate.set(iso, 0)
    pulsePoints.push({
      isoDate: iso,
      dateLabel: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      count: 0,
    })
  }

  const sevenDaysAgoMs = now.getTime() - 7 * 24 * 60 * 60 * 1000
  let addedThisWeek = 0

  for (const att of attendees) {
    if (!att.created_at) continue
    const iso = att.created_at.slice(0, 10)
    if (countsByIsoDate.has(iso)) {
      countsByIsoDate.set(iso, (countsByIsoDate.get(iso) ?? 0) + 1)
    }
    if (new Date(att.created_at).getTime() >= sevenDaysAgoMs) {
      addedThisWeek += 1
    }
  }

  for (const pt of pulsePoints) {
    pt.count = countsByIsoDate.get(pt.isoDate) ?? 0
  }

  const totalRegistrations = eventSummaries.reduce((sum, s) => sum + s.totalGuests, 0)
  const totalNetRevenueNgn = eventSummaries.reduce((sum, s) => sum + s.netRevenueNgn, 0)
  const totalActiveScanners = scannerLinks.filter((s) => s.is_active).length

  // 5. Build Chronological Recent Activity Feed
  const activityFeed: HomeActivityItem[] = []

  for (const att of attendees.slice(0, 5)) {
    const evName = eventNameById.get(att.event_id) ?? 'Event'
    const initials =
      att.name
        .split(' ')
        .map((part: string) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'G'

    activityFeed.push({
      id: `att-${att.id}`,
      type: 'registration',
      title: `${att.name} ${att.source === 'public_registration' ? 'registered' : 'added to guest list'}`,
      subtitle: evName,
      timestamp: att.created_at,
      href:
        att.source === 'public_registration'
          ? `/events/${att.event_id}/registrations`
          : `/events/${att.event_id}/guests`,
      initials,
    })
  }

  for (const pay of paidPayments.slice(0, 5)) {
    const evName = eventNameById.get(pay.event_id) ?? 'Event'
    const amountNgn = Math.ceil((pay.amount_kobo ?? 0) / 100).toLocaleString('en-NG')
    const payer = pay.payer_name || pay.payer_email?.split('@')[0] || 'Guest'

    activityFeed.push({
      id: `pay-${pay.id}`,
      type: 'payment',
      title: `Ticket payment confirmed · ₦${amountNgn}`,
      subtitle: `${payer} · ${evName}`,
      timestamp: pay.paid_at ?? pay.created_at,
      href: '/finances',
      initials: '₦',
    })
  }

  const attendeeById = new Map(attendees.map((a) => [a.id, a]))
  const invById = new Map(invitations.map((i) => [i.id, i]))

  for (const log of entryLogs.slice(0, 5)) {
    const inv = invById.get(log.invitation_id)
    if (!inv) continue
    const att = attendeeById.get(inv.attendee_id)
    const guestName = att?.name ?? 'Guest'
    const evName = eventNameById.get(inv.event_id) ?? 'Event'
    const initials =
      guestName
        .split(' ')
        .map((part: string) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '✓'

    activityFeed.push({
      id: `chk-${log.invitation_id}-${log.scanned_at}`,
      type: 'checkin',
      title: `${guestName} checked in at the door`,
      subtitle: evName,
      timestamp: log.scanned_at,
      href: `/events/${inv.event_id}/dashboard`,
      initials,
    })
  }

  activityFeed.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const rawName =
    orgSettingsData?.org_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Organiser'
  const displayName = rawName.split(' ')[0]

  return (
    <div className="w-full">
      <HomeClient
        displayName={displayName}
        eventSummaries={eventSummaries}
        recentActivity={activityFeed.slice(0, 5)}
        pulsePoints={pulsePoints}
        totalRegistrations={totalRegistrations}
        addedThisWeek={addedThisWeek}
        totalNetRevenueNgn={totalNetRevenueNgn}
        totalActiveScanners={totalActiveScanners}
        setupStatus={setupStatus}
      />
    </div>
  )
}

