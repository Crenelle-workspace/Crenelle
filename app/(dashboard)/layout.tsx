import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCoHostedEvents } from '@/app/actions/team'
import { DashboardSidebar, type SidebarEvent } from './dashboard-sidebar'
import { DashboardTopbar } from './dashboard-topbar'
import { MobileNav } from './mobile-nav'
import type { SetupStatus } from '@/components/workspace-setup-card'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Parallel fetch: owned events, co-hosted memberships, and setup verification data
  const [
    { data: ownedEvents },
    coHostData,
    { data: profilesData },
    { data: paymentData },
    { data: orgSettingsData },
  ] = await Promise.all([
    supabase
      .from('events')
      .select('id, name, date, status, event_type, organizer_id')
      .order('date', { ascending: false }),
    getCoHostedEvents().catch(() => ({ memberships: [], error: null })),
    supabase
      .from('sender_profiles')
      .select('id')
      .limit(1),
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

  // Process owned events
  const formattedOwnedEvents: SidebarEvent[] = (ownedEvents ?? []).map((ev) => ({
    id: ev.id,
    name: ev.name,
    date: ev.date,
    status: ev.status,
    event_type: ev.event_type,
    isOwner: true,
  }))

  const ownedIds = new Set(formattedOwnedEvents.map((e) => e.id))

  // Process co-hosted events if any (excluding any events already in owned list)
  let coHostedEvents: SidebarEvent[] = []
  const externalCoHostMemberships = (coHostData?.memberships ?? []).filter(
    (m) => !ownedIds.has(m.event_id)
  )

  if (externalCoHostMemberships.length > 0) {
    const { data: memberEvents } = await supabase
      .from('events')
      .select('id, name, date, status, event_type, organizer_id')
      .in('id', externalCoHostMemberships.map((m) => m.event_id))
      .order('date', { ascending: false })

    coHostedEvents = (memberEvents ?? []).map((ev) => ({
      id: ev.id,
      name: ev.name,
      date: ev.date,
      status: ev.status,
      event_type: ev.event_type,
      isOwner: false,
      role: externalCoHostMemberships.find((m) => m.event_id === ev.id)?.role ?? 'viewer',
    }))
  }

  // Deduplicate by event ID defensively using a Map
  const eventMap = new Map<string, SidebarEvent>()
  for (const ev of formattedOwnedEvents) {
    eventMap.set(ev.id, ev)
  }
  for (const ev of coHostedEvents) {
    if (!eventMap.has(ev.id)) {
      eventMap.set(ev.id, ev)
    }
  }

  const allSidebarEvents: SidebarEvent[] = Array.from(eventMap.values())

  const setupStatus: SetupStatus = {
    hasOrgName: !!orgSettingsData?.org_name,
    hasSenderProfile: (profilesData ?? []).length > 0,
    hasPaymentSubaccount: !!paymentData?.is_verified && !!paymentData?.paystack_subaccount_code,
    hasEmailFooter: !!orgSettingsData?.email_footer,
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Desktop Sidebar ── */}
      <DashboardSidebar
        userEmail={user.email ?? ''}
        events={allSidebarEvents}
        setupStatus={setupStatus}
      />

      {/* ── Main Viewport Area ── */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <DashboardTopbar events={allSidebarEvents} />
        <main className="flex-1 min-w-0 px-4 pt-6 pb-24 sm:px-8 sm:py-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom navigation ── */}
      <MobileNav />
    </div>
  )
}


