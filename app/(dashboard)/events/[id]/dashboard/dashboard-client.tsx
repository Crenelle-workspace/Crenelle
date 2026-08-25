'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Users, UserCheck, Clock, TrendingUp, DoorOpen, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { StatCard } from '@/components/stat-card'
import { SectionHeader } from '@/components/section-header'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import type { Invitation, Event, TicketTier, Attendee, Payment, RegistrationQuestion } from '@/lib/types'
import dynamic from 'next/dynamic'
import { EventSummaryReport } from '@/components/event-summary-pdf'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false }
)

type EntryWithGuest = {
  id: string
  scanned_at: string
  scanner_link_id?: string | null
  gate_name?: string | null
  invitation: {
    party_size: number
    seat_info: string | null
    tier_name?: string | null
    guest: { name: string }
  }
}

type GuestName = { name: string }

type InvitationRaw = Pick<Invitation, 'id' | 'party_size' | 'seat_info' | 'status' | 'ticket_tier_id'> & {
  guest: GuestName
}

type RawDbInvitation = {
  id: string
  party_size: number
  seat_info: string | null
  status: Invitation['status']
  ticket_tier_id: string | null
  attendee: GuestName | GuestName[] | null
}

type RawDbLog = {
  id: string
  scanned_at: string
  scanner_link_id: string | null
  invitation: {
    id: string
    party_size: number
    seat_info: string | null
    ticket_tier_id: string | null
    attendee: GuestName | GuestName[] | null
  } | { id: string; party_size: number; seat_info: string | null; ticket_tier_id: string | null; attendee: GuestName | GuestName[] | null }[] | null
}

export default function LiveDashboardPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const [totalInvited, setTotalInvited] = useState(0)
  const [totalSeats, setTotalSeats] = useState(0)
  const [arrived, setArrived] = useState(0)
  const [arrivedSeats, setArrivedSeats] = useState(0)
  const [entries, setEntries] = useState<EntryWithGuest[]>([])
  const [pending, setPending] = useState<Array<{ name: string; party_size: number; seat_info: string | null; tier_name?: string | null }>>([])
  const [entranceStats, setEntranceStats] = useState<Array<{ label: string; count: number }>>([])  
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<Event | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Rich feature states for report
  const [financials, setFinancials] = useState<{
    grossRevenueKobo: number
    platformFeeKobo: number
    organiserPayoutKobo: number
    currency: string
    paidTicketsCount: number
    freeTicketsCount: number
  }>({
    grossRevenueKobo: 0,
    platformFeeKobo: 0,
    organiserPayoutKobo: 0,
    currency: 'NGN',
    paidTicketsCount: 0,
    freeTicketsCount: 0,
  })

  const [tierBreakdown, setTierBreakdown] = useState<Array<{
    id: string
    name: string
    priceKobo: number
    currency: string
    capacity: number | null
    allocatedCount: number
    arrivedCount: number
    revenueKobo: number
  }>>([])

  const [registrationFunnel, setRegistrationFunnel] = useState<{
    totalApplications: number
    accepted: number
    pending: number
    waitlist: number
    rejected: number
    sources: {
      publicRegistration: number
      csvImport: number
      manual: number
    }
  }>({
    totalApplications: 0,
    accepted: 0,
    pending: 0,
    waitlist: 0,
    rejected: 0,
    sources: {
      publicRegistration: 0,
      csvImport: 0,
      manual: 0,
    },
  })

  const [customQuestions, setCustomQuestions] = useState<Array<{
    id: string
    label: string
    type: string
    responsesCount: number
    topAnswers?: Array<{ text: string; count: number }>
    aiSummary?: string
  }>>([])

  // AI summary state — keyed by questionId
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({})
  // Fingerprint of the last answers sent to Gemini — read synchronously inside async callbacks
  const aiSummaryHashesRef = useRef<Record<string, string>>({})
  // Concurrency guard — only one Gemini batch per loadData cycle
  const aiInFlight = useRef(false)

  // ── Stable fingerprint of topAnswers ─────────────────────────────────────
  const fingerprintAnswers = useCallback(
    (answers: Array<{ text: string; count: number }>): string =>
      answers.map((a) => `${a.text}:${a.count}`).join('|'),
    []
  )

  // ── Eager Gemini fetch — called after customQuestions are computed ─────────
  const fetchAiSummaries = useCallback(
    async (
      eventStatus: string,
      questions: Array<{
        id: string
        label: string
        type: string
        topAnswers?: Array<{ text: string; count: number }>
      }>,
      eventId: string
    ) => {
      // Layer 1: Only run for live or ended events
      if (eventStatus !== 'live' && eventStatus !== 'ended') return

      // Layer 3: Concurrency guard — skip if a batch is already in-flight
      if (aiInFlight.current) return

      const textQuestions = questions.filter(
        (q) => q.type === 'text' && (q.topAnswers?.length ?? 0) > 0
      )
      if (textQuestions.length === 0) return

      aiInFlight.current = true
      try {
        await Promise.all(
          textQuestions.map(async (q) => {
            const fingerprint = fingerprintAnswers(q.topAnswers ?? [])

            // Layer 2: Skip if answers haven't changed since last fetch
            if (aiSummaryHashesRef.current[q.id] === fingerprint) return

            try {
              const res = await fetch(`/api/events/${eventId}/ai-summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  questionId: q.id,
                  questionLabel: q.label,
                  answers: q.topAnswers ?? [],
                }),
              })

              if (!res.ok) return

              const data = await res.json() as { summary?: string }
              if (data.summary) {
                setAiSummaries((prev) => ({ ...prev, [q.id]: data.summary! }))
                aiSummaryHashesRef.current = { ...aiSummaryHashesRef.current, [q.id]: fingerprint }
              }
            } catch {
              // Non-fatal — PDF simply omits the AI summary for this question
            }
          })
        )
      } finally {
        aiInFlight.current = false
      }
    },
    [fingerprintAnswers]
  )

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

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient()

      // Fetch all required data in parallel
      const [
        { data: eventData },
        { data: invitations },
        { data: logs },
        { data: scanLinks },
        { data: tiersData },
        { data: paymentsData },
        { data: attendeesData },
        { data: answersData },
      ] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).single(),
        supabase.from('invitations').select('id, party_size, seat_info, status, ticket_tier_id, attendee:attendees(name)').eq('event_id', eventId),
        supabase.from('entry_logs').select('id, scanned_at, scanner_link_id, invitation:invitations(id, party_size, seat_info, ticket_tier_id, attendee:attendees(name))').order('scanned_at', { ascending: false }),
        supabase.from('scanner_links').select('id, label, is_active').eq('event_id', eventId),
        supabase.from('ticket_tiers').select('*').eq('event_id', eventId).is('deleted_at', null).order('created_at', { ascending: true }),
        supabase.from('payments').select('*').eq('event_id', eventId).eq('status', 'paid'),
        supabase.from('attendees').select('*').eq('event_id', eventId),
        supabase.from('registration_answers').select('attendee_id, answers').eq('event_id', eventId),
      ])

      setEvent(eventData as Event)

      // Scanner Gate Map
      const gateMap = new Map<string, string>()
      ;(scanLinks ?? []).forEach((sl) => {
        gateMap.set(sl.id, sl.label)
      })

      // Tier Map
      const tierMap = new Map<string, TicketTier>()
      const tiersList = (tiersData ?? []) as TicketTier[]
      tiersList.forEach((t) => {
        tierMap.set(t.id, t)
      })

      const logsArr = (logs ?? []) as unknown as RawDbLog[]
      const invArrRaw = (invitations ?? []) as unknown as RawDbInvitation[]

      const invArr: InvitationRaw[] = invArrRaw.map(i => {
        const att = Array.isArray(i.attendee) ? i.attendee[0] : i.attendee
        return {
          id: i.id,
          party_size: i.party_size,
          seat_info: i.seat_info,
          status: i.status,
          ticket_tier_id: i.ticket_tier_id,
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
        const tierName = invRaw?.ticket_tier_id ? tierMap.get(invRaw.ticket_tier_id)?.name : null
        return {
          id: l.id,
          scanned_at: l.scanned_at,
          scanner_link_id: l.scanner_link_id,
          gate_name: l.scanner_link_id ? gateMap.get(l.scanner_link_id) : 'Main Door',
          invitation: {
            party_size: invRaw?.party_size ?? 1,
            seat_info:  invRaw?.seat_info ?? null,
            tier_name:  tierName ?? null,
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
              seat_info:  i.seat_info,
              tier_name:  i.ticket_tier_id ? tierMap.get(i.ticket_tier_id)?.name : null,
            }
          })
      )

      // --- Per-entrance breakdown ---
      if (scanLinks && scanLinks.length > 0) {
        const countByLink = new Map<string, number>()
        logsArr.forEach((el) => {
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

      // --- Financials Computation ---
      const paymentsList = (paymentsData ?? []) as Payment[]
      const grossRevenueKobo = paymentsList.reduce((sum, p) => sum + (p.amount_kobo || 0), 0)
      const platformFeeKobo = paymentsList.reduce((sum, p) => sum + (p.platform_fee_kobo || 0), 0)
      const organiserPayoutKobo = paymentsList.reduce((sum, p) => sum + (p.organiser_amount_kobo || 0), 0)
      const currency = paymentsList[0]?.currency || 'NGN'

      // Free vs Paid tickets count
      let paidTicketsCount = 0
      let freeTicketsCount = 0
      invArr.forEach((inv) => {
        const tier = inv.ticket_tier_id ? tierMap.get(inv.ticket_tier_id) : null
        if (tier && tier.price > 0) {
          paidTicketsCount += (inv.party_size ?? 1)
        } else {
          freeTicketsCount += (inv.party_size ?? 1)
        }
      })

      setFinancials({
        grossRevenueKobo,
        platformFeeKobo,
        organiserPayoutKobo,
        currency,
        paidTicketsCount,
        freeTicketsCount,
      })

      // --- Ticket Tiers Breakdown ---
      const mappedTierBreakdown = tiersList.map((tier) => {
        const allocatedCount = invArr
          .filter((inv) => inv.ticket_tier_id === tier.id)
          .reduce((sum, inv) => sum + (inv.party_size ?? 1), 0)

        const arrivedCount = logsArr
          .filter((log) => {
            const invRaw = Array.isArray(log.invitation) ? log.invitation[0] : log.invitation
            return invRaw?.ticket_tier_id === tier.id
          })
          .length

        const tierRevenueKobo = paymentsList
          .filter((p) => p.ticket_tier_id === tier.id)
          .reduce((sum, p) => sum + (p.amount_kobo || 0), 0)

        return {
          id: tier.id,
          name: tier.name,
          priceKobo: tier.price,
          currency: tier.currency || 'NGN',
          capacity: tier.capacity,
          allocatedCount,
          arrivedCount,
          revenueKobo: tierRevenueKobo,
        }
      })
      setTierBreakdown(mappedTierBreakdown)

      // --- Registration Pipeline & Sources ---
      const allAttendees = (attendeesData ?? []) as Attendee[]
      const publicRegistrations = allAttendees.filter((a) => a.source === 'public_registration')
      const csvImports = allAttendees.filter((a) => a.source === 'imported')
      const manuals = allAttendees.filter((a) => a.source === 'manual')

      const accepted = publicRegistrations.filter((a) => a.registration_status === 'accepted').length
      const pendingRegs = publicRegistrations.filter((a) => a.registration_status === 'pending').length
      const waitlist = publicRegistrations.filter((a) => a.registration_status === 'waitlist').length
      const rejected = publicRegistrations.filter((a) => a.registration_status === 'rejected').length

      setRegistrationFunnel({
        totalApplications: publicRegistrations.length,
        accepted,
        pending: pendingRegs,
        waitlist,
        rejected,
        sources: {
          publicRegistration: publicRegistrations.length,
          csvImport: csvImports.length,
          manual: manuals.length,
        },
      })

      // --- Custom Questions Summary ---
      const questionsList = (eventData?.registration_questions ?? []) as RegistrationQuestion[]
      if (questionsList.length > 0 && answersData && answersData.length > 0) {
        const summary = questionsList.map((q) => {
          const counts: Record<string, number> = {}
          let totalResponses = 0

          answersData.forEach((row) => {
            const ansObj = row.answers as Record<string, string | string[]> | null
            if (!ansObj || !ansObj[q.id]) return

            totalResponses++
            const val = ansObj[q.id]
            if (Array.isArray(val)) {
              val.forEach((item) => {
                counts[item] = (counts[item] ?? 0) + 1
              })
            } else if (typeof val === 'string' && val.trim().length > 0) {
              counts[val] = (counts[val] ?? 0) + 1
            }
          })

          const topAnswers = Object.entries(counts)
            .map(([text, count]) => ({ text, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)

          return {
            id: q.id,
            label: q.label,
            type: q.type,
            responsesCount: totalResponses,
            topAnswers,
          }
        })
        setCustomQuestions(summary)

        // Eagerly fetch AI summaries for text questions (live/ended events only)
        void fetchAiSummaries(eventData?.status ?? '', summary, eventId)
      }
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    void loadData()

    // Realtime subscriptions
    const supabase = createClient()
    const poll = setInterval(loadData, 60000)

    const channel = supabase
      .channel(`entry-logs-${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'entry_logs' }, () => void loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations' }, () => void loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => void loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => void loadData())
      .subscribe()

    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [eventId, loadData])

  const venueCapacity = event?.capacity && event.capacity > 0 ? event.capacity : null
  const effectiveCapacity = venueCapacity ? Math.max(venueCapacity, totalSeats, arrived) : Math.max(totalSeats, arrived, 1)
  const arrivalRate = totalSeats > 0 ? Math.min(100, Math.round((arrivedSeats / totalSeats) * 100)) : (arrived > 0 ? 100 : 0)
  const pendingSeats = Math.max(0, totalSeats - arrivedSeats)
  const capacityUsagePct = Math.min(100, Math.round((arrived / effectiveCapacity) * 100))

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
                  totalSeats: effectiveCapacity,
                  totalInvited,
                  arrived,
                  arrivedSeats,
                  pendingSeats,
                  arrivalRate,
                  peakCheckInTime: getPeakCheckInTime(entries),
                  entranceStats,
                  recentEntries: entries.slice(0, 20).map(e => ({
                    guestName: e.invitation.guest.name,
                    seatInfo: e.invitation.seat_info,
                    tierName: e.invitation.tier_name,
                    scannedAt: e.scanned_at,
                    partySize: e.invitation.party_size,
                    scannerGate: e.gate_name,
                  })),
                  financials,
                  tierBreakdown,
                  registrationFunnel,
                  customQuestions: customQuestions.map((q) =>
                    q.type === 'text' && aiSummaries[q.id]
                      ? { ...q, aiSummary: aiSummaries[q.id] }
                      : q
                  ),
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
                {pdfLoading ? 'Generating PDF...' : 'Download Executive Report'}
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
          value={venueCapacity ?? totalSeats}
          subtext={venueCapacity ? `${totalSeats} seats invited` : "Configured capacity"}
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
          subtext="Of invitations attended"
        />
      </div>

      {/* Capacity bar */}
      <div>
        <div className="flex justify-between items-end mb-2">
          <span className="font-sans text-xs font-semibold text-muted-foreground">Capacity Usage</span>
          <span className="font-sans text-xs font-bold text-copper">{arrived} / {effectiveCapacity}</span>
        </div>
        <div
          className="w-full h-4 bg-card border border-border/40 rounded-full relative p-0.5 overflow-hidden"
          role="progressbar"
          aria-valuenow={capacityUsagePct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Capacity usage: ${capacityUsagePct}%`}
        >
          <div
            className="h-full bg-copper rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${capacityUsagePct}%` }}
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
                      {entry.invitation?.tier_name && <span className="mr-2 text-copper font-medium">{entry.invitation.tier_name}</span>}
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
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
              {pending.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3 bg-card border border-border/40 rounded-xl hover:border-copper/40 transition-colors"
                >
                  <div>
                    <p className="font-sans text-sm font-semibold text-foreground">{p.name}</p>
                    <p className="font-sans text-xs text-muted-foreground mt-0.5">
                      {p.tier_name && <span className="mr-2 text-copper font-medium">{p.tier_name}</span>}
                      {p.seat_info && <span>{p.seat_info}</span>}
                    </p>
                  </div>
                  <span className="font-sans text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
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
