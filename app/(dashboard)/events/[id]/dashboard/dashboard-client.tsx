'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Users, UserCheck, Clock, TrendingUp, DoorOpen, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { StatCard } from '@/components/stat-card'
import { SectionHeader } from '@/components/section-header'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import type { Invitation, Event } from '@/lib/types'
import dynamic from 'next/dynamic'
import { EventSummaryReport } from '@/components/event-summary-pdf'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false }
)

type EntryWithGuest = {
  id: string
  scanned_at: string
  invitation: {
    party_size: number
    seat_info: string | null
    guest: { name: string }
  }
}

type GuestName = { name: string }

type InvitationRaw = Pick<Invitation, 'id' | 'party_size' | 'seat_info' | 'status'> & {
  guest: GuestName
}

type RawDbInvitation = {
  id: string
  party_size: number
  seat_info: string | null
  status: Invitation['status']
  attendee: GuestName | GuestName[] | null
}

type RawDbLog = {
  id: string
  scanned_at: string
  invitation: {
    id: string
    party_size: number
    seat_info: string | null
    attendee: GuestName | GuestName[] | null
  } | { id: string; party_size: number; seat_info: string | null; attendee: GuestName | GuestName[] | null }[] | null
}

export default function LiveDashboardPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const [totalInvited, setTotalInvited] = useState(0)
  const [totalSeats, setTotalSeats] = useState(0)
  const [arrived, setArrived] = useState(0)
  const [arrivedSeats, setArrivedSeats] = useState(0)
  const [entries, setEntries] = useState<EntryWithGuest[]>([])
  const [pending, setPending] = useState<Array<{ name: string; party_size: number; seat_info: string | null }>>([])
  const [entranceStats, setEntranceStats] = useState<Array<{ label: string; count: number }>>([])  
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<Event | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  const getPeakCheckInTime = (entriesList: EntryWithGuest[]) => {
    if (entriesList.length === 0) return 'N/A'
    const buckets: Record<string, number> = {}
    entriesList.forEach(e => {
      const date = new Date(e.scanned_at)
      const hour = date.getHours()
      const min = date.getMinutes()
      const bucketStartMin = min < 30 ? '00' : '30'
      const bucketEndHour = min < 30 ? hour : (hour + 1) % 24
      const bucketEndMin = min < 30 ? '30' : '00'

      const pad = (num: number) => String(num).padStart(2, '0')
      const key = `${pad(hour)}:${bucketStartMin} - ${pad(bucketEndHour)}:${bucketEndMin}`
      buckets[key] = (buckets[key] ?? 0) + 1
    })

    let maxCount = 0
    let peakInterval = 'N/A'
    Object.entries(buckets).forEach(([interval, count]) => {
      if (count > maxCount) {
        maxCount = count
        peakInterval = `${interval} (${count} scan${count !== 1 ? 's' : ''})`
      }
    })
    return peakInterval
  }

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    async function loadData() {
      try {
        const { data: eventData } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single()
        setEvent(eventData)

        const { data: invitations } = await supabase
          .from('invitations')
          .select('id, party_size, seat_info, status, attendee:attendees(name)')
          .eq('event_id', eventId)

        const { data: logs } = await supabase
          .from('entry_logs')
          .select('id, scanned_at, invitation:invitations(id, party_size, seat_info, attendee:attendees(name))')
          .in('invitation_id', (invitations ?? []).map(i => i.id))
          .order('scanned_at', { ascending: false })

        const logsArr = (logs ?? []) as unknown as RawDbLog[]
        const invArrRaw = (invitations ?? []) as unknown as RawDbInvitation[]

        const invArr: InvitationRaw[] = invArrRaw.map(i => {
          const att = Array.isArray(i.attendee) ? i.attendee[0] : i.attendee
          return {
            id: i.id,
            party_size: i.party_size,
            seat_info: i.seat_info,
            status: i.status,
            guest: att ? { name: att.name } : { name: 'Unknown' }
          }
        })

        const logsPerInv = new Map<string, number>()
        logsArr.forEach((l) => {
          const invRaw = Array.isArray(l.invitation) ? l.invitation[0] : l.invitation
          const invId = invRaw?.id
          if (invId) logsPerInv.set(invId, (logsPerInv.get(invId) ?? 0) + 1)
        })

        setTotalInvited(invArr.length)
        setTotalSeats(invArr.reduce((a, i) => a + (i.party_size ?? 1), 0))
        setArrived(logsArr.length)
        setArrivedSeats(logsPerInv.size)
        setEntries(logsArr.map(l => {
          const invRaw = Array.isArray(l.invitation) ? l.invitation[0] : l.invitation
          const attRaw = invRaw ? (Array.isArray(invRaw.attendee) ? invRaw.attendee[0] : invRaw.attendee) : null
          return {
            id: l.id,
            scanned_at: l.scanned_at,
            invitation: {
              party_size: invRaw?.party_size ?? 1,
              seat_info:  invRaw?.seat_info ?? null,
              guest:      attRaw ?? { name: 'Unknown' }
            }
          }
        }))
        setPending(
          invArr
            .map((i) => {
              const arrivedInParty   = logsPerInv.get(i.id) ?? 0
              const remainingInParty = (i.party_size ?? 1) - arrivedInParty
              return { ...i, remainingInParty }
            })
            .filter((i) => i.remainingInParty > 0)
            .map((i) => {
              return {
                name:       i.guest?.name ?? 'Unknown',
                party_size: i.remainingInParty,
                seat_info:  i.seat_info
              }
            })
        )

        // --- Per-entrance breakdown ---
        const { data: scanLinks } = await supabase
          .from('scanner_links')
          .select('id, label')
          .eq('event_id', eventId)

        if (scanLinks && scanLinks.length > 0) {
          const linkIds = scanLinks.map((sl) => sl.id)
          const { data: entranceLogs } = await supabase
            .from('entry_logs')
            .select('scanner_link_id')
            .in('scanner_link_id', linkIds)

          const countByLink = new Map<string, number>()
          ;(entranceLogs ?? []).forEach((el) => {
            if (el.scanner_link_id) {
              countByLink.set(el.scanner_link_id, (countByLink.get(el.scanner_link_id) ?? 0) + 1)
            }
          })

          setEntranceStats(
            scanLinks
              .map((sl) => ({ label: sl.label, count: countByLink.get(sl.id) ?? 0 }))
              .sort((a, b) => b.count - a.count)
          )
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Realtime subscriptions below drive live updates. The interval is only a
    // slow safety net for the rare case Realtime drops (was 5s, which double-
    // refetched on top of every realtime event — pure redundant DB egress).
    const poll = setInterval(loadData, 60000)

    const channel = supabase
      .channel(`entry-logs-${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'entry_logs' },  () => loadData())
      .on('postgres_changes', { event: '*',      schema: 'public', table: 'invitations' }, () => loadData())
      .subscribe()

    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [eventId])

  const arrivalRate = totalSeats > 0 ? Math.round((arrived / totalSeats) * 100) : 0

  if (loading) {
    return (
      <div className="flex flex-col gap-8 animate-pulse">
        {/* Section header */}
        <div className="border-b-2 border-foreground/20 pb-6">
          <SectionHeader
            eyebrow="Live Door Feed"
            title="Live Attendance"
            subtitle="Loading live dashboard data..."
            live
          />
        </div>

        {/* Stats grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-foreground/20">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card p-5 space-y-3 border border-border">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>

        {/* Capacity bar skeleton */}
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-12" />
          </div>
          <Skeleton className="w-full h-5" />
        </div>

        {/* Recent + Pending columns skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Column 1 */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center p-3 border border-border bg-card">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3.5 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-8" />
                </div>
              ))}
            </div>
          </div>
          {/* Column 2 */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-36" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center p-3 border border-border bg-card">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3.5 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-8" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-foreground/20 pb-6">
        <SectionHeader
          eyebrow="Live Door Feed"
          title="Live Attendance"
          subtitle="Updates in real-time as guests arrive"
          live
        />

        {!isMounted || !event ? (
          <Button
            variant="ghost"
            className="gap-2 h-10 px-4 text-xs font-semibold text-foreground/70 shrink-0 opacity-50 cursor-not-allowed border border-border/40 rounded-full"
            disabled
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Download Report
          </Button>
        ) : (
          <PDFDownloadLink
            document={
              <EventSummaryReport
                event={event}
                stats={{
                  totalSeats,
                  totalInvited,
                  arrived,
                  arrivedSeats,
                  pendingSeats: totalSeats - arrived,
                  arrivalRate,
                  peakCheckInTime: getPeakCheckInTime(entries),
                  entranceStats,
                  recentEntries: entries.slice(0, 10).map(e => ({
                    guestName: e.invitation.guest.name,
                    seatInfo: e.invitation.seat_info,
                    scannedAt: e.scanned_at,
                    partySize: e.invitation.party_size
                  }))
                }}
              />
            }
            fileName={`event-summary-${event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`}
          >
            {({ loading: pdfLoading }) => (
              <Button
                variant="copper"
                className="gap-2 h-10 px-5 text-xs font-bold shrink-0 rounded-full"
                disabled={pdfLoading}
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                {pdfLoading ? 'Generating PDF...' : 'Download Report'}
              </Button>
            )}
          </PDFDownloadLink>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/40 rounded-2xl overflow-hidden" role="list" aria-label="Attendance statistics">
        <StatCard
          icon={<Users className="h-5 w-5 text-copper" aria-hidden="true" />}
          label="Total Seats"
          value={totalSeats}
          subtext="Configured capacity"
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5 text-copper" aria-hidden="true" />}
          label="Invited Guests"
          value={totalInvited}
          subtext="Cards generated"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-emerald-500" aria-hidden="true" />}
          label="Admitted"
          value={arrived}
          subtext={`${arrivedSeats} seats represented`}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-500" aria-hidden="true" />}
          label="Attendance Rate"
          value={`${arrivalRate}%`}
          subtext="Of capacity filled"
        />
      </div>

      {/* Capacity bar */}
      <div>
        <div className="flex justify-between items-end mb-2">
          <span className="font-sans text-xs font-semibold text-muted-foreground">Capacity Usage</span>
          <span className="font-sans text-xs font-bold text-copper">{arrived} / {totalSeats}</span>
        </div>
        <div
          className="w-full h-4 bg-card border border-border/40 rounded-full relative p-0.5 overflow-hidden"
          role="progressbar"
          aria-valuenow={arrivalRate}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Arrival rate: ${arrivalRate}%`}
        >
          <div
            className="h-full bg-copper rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${arrivalRate}%` }}
          />
        </div>
      </div>

      {/* Per-entrance breakdown */}
      {entranceStats.length > 1 && (
        <div>
          <h3 className="font-sans text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-copper" aria-hidden="true" />
            Per Entrance
          </h3>
          <div className="flex flex-col gap-3">
            {entranceStats.map((gate) => {
              const gatePct = arrived > 0 ? Math.round((gate.count / arrived) * 100) : 0
              return (
                <div key={gate.label}>
                  <div className="flex justify-between items-end mb-1">
                    <span className="font-sans text-xs font-medium text-muted-foreground truncate mr-4">{gate.label}</span>
                    <span className="font-sans text-xs font-bold text-copper shrink-0">{gate.count} <span className="text-muted-foreground font-normal">({gatePct}%)</span></span>
                  </div>
                  <div className="w-full h-2.5 bg-card border border-border/40 rounded-full relative p-0.5 overflow-hidden">
                    <div
                      className="h-full bg-copper/70 rounded-full transition-all duration-700"
                      style={{ width: `${gatePct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent + Pending columns */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent arrivals */}
        <div>
          <h3 className="font-sans text-xl font-bold text-foreground mb-4">Recent Arrivals</h3>
          {entries.length === 0 ? (
            <div className="py-12 border border-dashed border-border/40 rounded-2xl flex items-center justify-center">
              <p className="font-sans text-xs font-medium text-muted-foreground">No arrivals recorded yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-4 py-3 bg-card border border-border/40 rounded-xl hover:border-copper/40 transition-colors"
                >
                  <div>
                    <p className="font-sans text-sm font-semibold text-foreground">{entry.invitation.guest.name}</p>
                    <p className="font-sans text-xs text-muted-foreground mt-0.5">
                      {entry.invitation?.seat_info && <span className="mr-3">{entry.invitation.seat_info}</span>}
                      {new Date(entry.scanned_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="font-sans text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                    {entry.invitation?.party_size > 1 ? `+${entry.invitation.party_size}` : '1 guest'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Still waiting */}
        <div>
          <h3 className="font-sans text-xl font-bold text-foreground mb-4">
            Not Yet Arrived <span className="text-muted-foreground font-normal">({pending.length})</span>
          </h3>
          {pending.length === 0 ? (
            <div className="py-12 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl flex items-center justify-center">
              <p className="font-sans text-xs font-bold text-emerald-500">All guests have arrived!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-px max-h-96 overflow-y-auto">
              {pending.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3 bg-background border border-foreground/10 hover:border-foreground/20 transition-colors"
                >
                  <div>
                    <p className="font-mono text-sm text-foreground">{p.name}</p>
                    {p.seat_info && (
                      <p className="font-mono text-[10px] text-foreground/40 uppercase tracking-widest mt-0.5">{p.seat_info}</p>
                    )}
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-signal/60 border border-signal/20 px-2 py-1">
                    +{p.party_size}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
