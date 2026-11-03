import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Event, Invitation } from '@/lib/types'

export interface DashboardAttendee {
  id: string
  event_id: string
  registration_status: string | null
  source: string
}

export interface DashboardTier {
  id: string
  event_id: string
  capacity: number | null
}

export interface EventStat {
  totalCapacity: number
  hasCapacity: boolean
  checkedIn: number
  totalInvited: number
  pendingCount: number
  waitlistCount: number
}

export interface SummaryMetrics {
  totalEvents: number
  liveCount: number
  publishedCount: number
  draftCount: number
  endedCount: number
  totalGuests: number
  checkedIn: number
  totalCapacity: number
  hasCapacity: boolean
  pendingCount: number
  waitlistCount: number
  overallShowUpPercent: number | null
  overallCapacityPercent: number | null
}

interface UseDashboardDataProps {
  initialEvents: Event[]
  initialInvitations: Invitation[]
  initialLogs: { invitation_id: string }[]
  initialAttendees?: DashboardAttendee[]
  initialTiers?: DashboardTier[]
  coHostedEvents?: Array<Event & { memberRole: string }>
}

export function useDashboardData({
  initialEvents,
  initialInvitations,
  initialLogs,
  initialAttendees = [],
  initialTiers = [],
  coHostedEvents = [],
}: UseDashboardDataProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations)
  const [logs, setLogs] = useState<{ invitation_id: string }[]>(initialLogs)
  const [attendees, setAttendees] = useState<DashboardAttendee[]>(initialAttendees)
  const [tiers, setTiers] = useState<DashboardTier[]>(initialTiers)

  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])

  useEffect(() => {
    setInvitations(initialInvitations)
  }, [initialInvitations])

  useEffect(() => {
    setLogs(initialLogs)
  }, [initialLogs])

  useEffect(() => {
    setAttendees(initialAttendees)
  }, [initialAttendees])

  useEffect(() => {
    setTiers(initialTiers)
  }, [initialTiers])

  useEffect(() => {
    const supabase = createClient()

    async function refreshData() {
      const allIds = [
        ...initialEvents.map((e) => e.id),
        ...coHostedEvents.map((e) => e.id),
      ]
      if (allIds.length === 0) return

      const [
        { data: newEvents },
        { data: newInvitations },
        { data: newAttendees },
        { data: newTiers },
      ] = await Promise.all([
        supabase.from('events').select('*').in('id', allIds).order('date', { ascending: false }),
        supabase.from('invitations').select('id, event_id, party_size, status').in('event_id', allIds).limit(10000),
        supabase.from('attendees').select('id, event_id, registration_status, source').in('event_id', allIds).limit(10000),
        supabase.from('ticket_tiers').select('id, event_id, capacity').in('event_id', allIds).is('deleted_at', null),
      ])

      const invIds = (newInvitations ?? []).map((i) => i.id)
      const { data: newLogs } =
        invIds.length > 0
          ? await supabase.from('entry_logs').select('invitation_id').in('invitation_id', invIds).limit(10000)
          : { data: [] }

      if (newEvents) {
        const ownedIds = new Set(initialEvents.map((e) => e.id))
        setEvents((newEvents as Event[]).filter((e) => ownedIds.has(e.id)))
      }
      if (newInvitations) setInvitations(newInvitations as Invitation[])
      if (newAttendees) setAttendees((newAttendees as DashboardAttendee[]) || [])
      if (newTiers) setTiers((newTiers as DashboardTier[]) || [])
      if (newLogs) setLogs((newLogs as { invitation_id: string }[]) || [])
    }

    const poll = setInterval(refreshData, 60000)

    const channel = supabase
      .channel('global-dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entry_logs' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendees' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_tiers' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => refreshData())
      .subscribe()

    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [initialEvents, coHostedEvents])

  // Calculate per-event stats across owned AND co-hosted events
  const logInvIds = new Set(logs.map((l) => l.invitation_id))
  const allPortfolioEvents = [...events, ...coHostedEvents]

  const eventStats = allPortfolioEvents.reduce(
    (acc, event) => {
      // 1. Only active and checked_in invitations count as confirmed guests (excludes cancelled AND expired)
      const validInvitations = invitations.filter(
        (inv) => inv.event_id === event.id && (inv.status === 'active' || inv.status === 'checked_in')
      )

      // 2. Check-ins: checked_in status OR found in entry_logs
      const checkedInInvitations = validInvitations.filter(
        (inv) => inv.status === 'checked_in' || logInvIds.has(inv.id)
      )

      const totalInvited = validInvitations.reduce(
        (sum, inv) => sum + (inv.party_size || 1),
        0
      )
      const checkedIn = checkedInInvitations.reduce(
        (sum, inv) => sum + (inv.party_size || 1),
        0
      )

      // 3. Open registration counts (pending review and waitlist)
      const eventAttendees = attendees.filter((a) => a.event_id === event.id)
      const pendingCount = eventAttendees.filter((a) => a.registration_status === 'pending').length
      const waitlistCount = eventAttendees.filter((a) => a.registration_status === 'waitlist').length

      // 4. Effective Capacity resolution:
      // Priority: event.capacity -> event.max_registrations -> sum(tier.capacity) -> null (unlimited)
      const eventTiers = tiers.filter(
        (t) => t.event_id === event.id && t.capacity !== null && t.capacity > 0
      )
      const tiersCapacity =
        eventTiers.length > 0
          ? eventTiers.reduce((sum, t) => sum + (t.capacity ?? 0), 0)
          : null

      const definedCapacity =
        event.capacity && event.capacity > 0
          ? event.capacity
          : event.max_registrations && event.max_registrations > 0
            ? event.max_registrations
            : tiersCapacity

      const hasCapacity = definedCapacity !== null && definedCapacity > 0
      const totalCapacity = hasCapacity ? definedCapacity : 0

      acc[event.id] = {
        totalCapacity,
        hasCapacity,
        checkedIn,
        totalInvited,
        pendingCount,
        waitlistCount,
      }
      return acc
    },
    {} as Record<string, EventStat>
  )

  // Global stats for LIVE events (backwards-compatibility helper)
  const stats = events
    .filter((e) => e.status === 'live')
    .reduce(
      (acc, event) => {
        const s = eventStats[event.id] || {
          checkedIn: 0,
          totalCapacity: 0,
          totalInvited: 0,
          hasCapacity: false,
          pendingCount: 0,
          waitlistCount: 0,
        }
        acc.totalGuests += s.totalInvited
        acc.checkedIn += s.checkedIn
        acc.totalCapacity += s.totalCapacity
        return acc
      },
      { totalGuests: 0, checkedIn: 0, totalCapacity: 0 }
    )

  // Workspace-wide aggregate stats across owned events
  const liveCount = events.filter((e) => e.status === 'live').length
  const publishedCount = events.filter((e) => e.status === 'published').length
  const draftCount = events.filter((e) => e.status === 'draft').length
  const endedCount = events.filter((e) => e.status === 'ended').length

  const ownedStats = events.map((e) => eventStats[e.id]).filter(Boolean)
  const totalGuests = ownedStats.reduce((sum, s) => sum + s.totalInvited, 0)
  const checkedIn = ownedStats.reduce((sum, s) => sum + s.checkedIn, 0)
  const pendingCount = ownedStats.reduce((sum, s) => sum + s.pendingCount, 0)
  const waitlistCount = ownedStats.reduce((sum, s) => sum + s.waitlistCount, 0)

  // Capacity across events that actually have a defined capacity limit
  const eventsWithCapacity = events.filter((e) => eventStats[e.id]?.hasCapacity)
  const totalCapacity = eventsWithCapacity.reduce(
    (sum, e) => sum + (eventStats[e.id]?.totalCapacity ?? 0),
    0
  )
  const guestsInCappedEvents = eventsWithCapacity.reduce(
    (sum, e) => sum + (eventStats[e.id]?.totalInvited ?? 0),
    0
  )
  const hasCapacity = eventsWithCapacity.length > 0

  const overallCapacityPercent =
    hasCapacity && totalCapacity > 0
      ? Math.min(Math.round((guestsInCappedEvents / totalCapacity) * 100), 100)
      : null

  // Operational Show-Up Rate: strictly calculated for events that have opened doors or finished
  const liveOrEndedEvents = events.filter(
    (e) => e.status === 'live' || e.status === 'ended'
  )
  const liveOrEndedGuests = liveOrEndedEvents.reduce(
    (sum, e) => sum + (eventStats[e.id]?.totalInvited || 0),
    0
  )
  const liveOrEndedCheckedIn = liveOrEndedEvents.reduce(
    (sum, e) => sum + (eventStats[e.id]?.checkedIn || 0),
    0
  )

  const overallShowUpPercent =
    liveOrEndedGuests > 0
      ? Math.min(Math.round((liveOrEndedCheckedIn / liveOrEndedGuests) * 100), 100)
      : null

  const remaining = hasCapacity ? Math.max(0, totalCapacity - checkedIn) : 0
  const capacityPercent = overallCapacityPercent ?? 0

  return {
    events,
    invitations,
    logs,
    attendees,
    tiers,
    eventStats,
    stats,
    remaining,
    capacityPercent,
    summaryMetrics: {
      totalEvents: events.length,
      liveCount,
      publishedCount,
      draftCount,
      endedCount,
      totalGuests,
      checkedIn,
      totalCapacity,
      hasCapacity,
      pendingCount,
      waitlistCount,
      overallShowUpPercent,
      overallCapacityPercent,
    },
  }
}
