import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Event, Invitation } from '@/lib/types'

interface UseDashboardDataProps {
  initialEvents: Event[]
  initialInvitations: Invitation[]
  initialLogs: { invitation_id: string }[]
}

export function useDashboardData({
  initialEvents,
  initialInvitations,
  initialLogs
}: UseDashboardDataProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations)
  const [logs, setLogs] = useState<{ invitation_id: string }[]>(initialLogs)

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
    const supabase = createClient()

    async function refreshData() {
      const [{ data: newEvents }, { data: newInvitations }, { data: newLogs }] = await Promise.all([
        supabase.from('events').select('*').order('date', { ascending: false }),
        supabase.from('invitations').select('id, event_id, party_size, status'),
        supabase.from('entry_logs').select('invitation_id'),
      ])

      if (newEvents) setEvents(newEvents as Event[])
      if (newInvitations) setInvitations(newInvitations as Invitation[])
      if (newLogs) setLogs(newLogs as { invitation_id: string }[])
    }

    // Realtime subscriptions below drive updates; this interval is only a slow
    // safety net for dropped Realtime connections (was 8s, redundant on top of realtime).
    const poll = setInterval(refreshData, 60000)

    const channel = supabase
      .channel('global-dashboard-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'entry_logs' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => refreshData())
      .subscribe()

    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [])

  // Calculate per-event stats
  const eventStats = events.reduce(
    (acc, event) => {
      const eventInvitations = invitations.filter(
        (inv) => inv.event_id === event.id && inv.status !== "cancelled",
      )
      const logInvIds = new Set(logs.map((l) => l.invitation_id))
      const checkedInInvitations = eventInvitations.filter(
        (inv) => inv.status === "checked_in" || logInvIds.has(inv.id),
      )

      const totalInvited = eventInvitations.reduce(
        (sum, inv) => sum + (inv.party_size || 1),
        0,
      )
      const checkedIn = checkedInInvitations.reduce(
        (sum, inv) => sum + (inv.party_size || 1),
        0,
      )

      // Expected capacity: use explicit event capacity if > 0, dynamically expanding if invitations or check-ins exceed it
      const capacity = Math.max(event.capacity && event.capacity > 0 ? event.capacity : totalInvited, totalInvited, checkedIn)

      acc[event.id] = {
        totalCapacity: capacity,
        checkedIn,
        totalInvited,
      }
      return acc
    },
    {} as Record<
      string,
      { totalCapacity: number; checkedIn: number; totalInvited: number }
    >,
  )

  // Global stats (Aggregated for LIVE events only)
  const stats = events
    .filter((e) => e.status === "live")
    .reduce(
      (acc, event) => {
        const s = eventStats[event.id] || {
          checkedIn: 0,
          totalCapacity: 0,
          totalInvited: 0,
        }
        acc.totalGuests += s.totalInvited
        acc.checkedIn += s.checkedIn
        acc.totalCapacity += Math.max(s.totalCapacity, s.checkedIn)
        return acc
      },
      { totalGuests: 0, checkedIn: 0, totalCapacity: 0 },
    )

  const remaining = Math.max(0, stats.totalCapacity - stats.checkedIn)
  const capacityPercent =
    stats.totalCapacity > 0
      ? Math.min((stats.checkedIn / stats.totalCapacity) * 100, 100)
      : 0

  return { 
    events, 
    invitations, 
    logs, 
    eventStats, 
    stats, 
    remaining, 
    capacityPercent 
  }
}
