'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Check, X, Mail, Search, UserPlus, Clock, CheckCircle2, XCircle, Send, ArrowUpCircle, Zap, CheckSquare, MessageSquare, Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from 'lucide-react'
import { acceptRegistration, rejectRegistration, promoteFromWaitlist, sendReminderEmails, bulkAcceptRegistrations, bulkRejectRegistrations } from '@/app/actions/registrations'
import { toggleAutoApprove } from '@/app/actions/events'
import { createClient } from '@/lib/supabase/client'
import { fieldCls, labelCls } from '@/lib/form-styles'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { SectionHeader } from '@/components/section-header'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import type { Event, TicketTier, RegistrationQuestion } from '@/lib/types'

interface Registration {
  id: string
  event_id: string
  full_name: string
  email: string
  phone: string | null
  status: 'pending' | 'accepted' | 'rejected' | 'waitlist'
  created_at: string
  ticket_tier?: TicketTier | null
  payment_status?: 'paid' | 'pending' | 'failed' | 'refunded' | 'abandoned' | 'unpaid' | 'free'
  /** Custom question answers — keyed by question id */
  custom_answers?: Record<string, string | string[]> | null
}

interface AttendeeRow {
  id: string
  event_id: string
  name: string
  email: string
  phone: string | null
  registration_status: Registration['status']
  created_at: string
  ticket_tier?: TicketTier | null
  payments?: { status: string; created_at: string }[]
}

export default function RegistrationsPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [event, setEvent] = useState<Event | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'waitlist'>('all')
  const [search, setSearch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [promotingId, setPromotingId] = useState<string | null>(null)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminderMessage, setReminderMessage] = useState('')
  const [sendingReminder, setSendingReminder] = useState(false)
  const [acceptTarget, setAcceptTarget] = useState<Registration | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Registration | null>(null)
  const [loading, setLoading] = useState(true)

  // Selection & Auto-approve state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isTogglingAutoApprove, setIsTogglingAutoApprove] = useState(false)
  const isTogglingRef = useRef(false)
  const [bulkAcceptOpen, setBulkAcceptOpen] = useState(false)
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false)
  const [copiedRegLink, setCopiedRegLink] = useState(false)
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Answers sheet state
  const [answersTarget, setAnswersTarget] = useState<Registration | null>(null)
  const [eventQuestions, setEventQuestions] = useState<RegistrationQuestion[]>([])

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient()
      const [{ data: attendees }, { data: ev }, { data: answers }] = await Promise.all([
        supabase
          .from('attendees')
          .select('*, ticket_tier:ticket_tiers(*), payments(*)')
          .eq('event_id', eventId)
          .eq('source', 'public_registration')
          .order('created_at', { ascending: true }),
        supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single(),
        supabase
          .from('registration_answers')
          .select('attendee_id, answers')
          .eq('event_id', eventId),
      ])

      // Build an answers lookup map: attendee_id → answers
      const answersMap = new Map<string, Record<string, string | string[]>>();
      (answers ?? []).forEach((row) => {
        answersMap.set(row.attendee_id, row.answers as Record<string, string | string[]>)
      })

      const rows = (attendees ?? []) as unknown as AttendeeRow[]
      const mappedRegs: Registration[] = rows.map((a) => {
        const hasPayments = a.payments && a.payments.length > 0
        let paymentStatus: Registration['payment_status'] = 'unpaid'

        if (hasPayments) {
          if (a.payments?.some((p) => p.status === 'paid')) {
            paymentStatus = 'paid'
          } else if (a.payments?.some((p) => p.status === 'pending')) {
            paymentStatus = 'pending'
          } else {
            const sortedPayments = [...(a.payments ?? [])].sort(
              (x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
            )
            paymentStatus = (sortedPayments[0]?.status as Registration['payment_status']) || 'unpaid'
          }
        } else if (a.ticket_tier?.price === 0) {
          paymentStatus = 'free'
        }

        return {
          id: a.id,
          event_id: a.event_id,
          full_name: a.name,
          email: a.email,
          phone: a.phone,
          status: a.registration_status,
          created_at: a.created_at,
          ticket_tier: a.ticket_tier ?? null,
          payment_status: paymentStatus,
          custom_answers: answersMap.get(a.id) ?? null,
        }
      })

      setRegistrations(mappedRegs)
      setEvent(ev)
      // Sync question definitions whenever data refreshes
      if (ev?.registration_questions) {
        setEventQuestions((ev.registration_questions as RegistrationQuestion[]) || [])
      }
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadData()

    const poll = setInterval(loadData, 60000)

    const supabase = createClient()
    const channel = supabase
      .channel(`registrations-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendees', filter: `event_id=eq.${eventId}` }, () => loadData())
      .subscribe()

    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [eventId, loadData])

  function handleAccept(reg: Registration) {
    setAcceptTarget(reg)
  }

  function handleReject(reg: Registration) {
    setRejectTarget(reg)
  }

  async function confirmAccept() {
    if (!acceptTarget) return
    setIsSubmitting(true)
    try {
      const result = await acceptRegistration(acceptTarget.id, eventId)
      if (result?.error) {
        toast.error(result.error)
      } else if (result?.warning) {
        toast.warning(result.warning, { duration: 6000 })
      } else {
        toast.success(`${acceptTarget.full_name} accepted — invitation email sent`)
      }
      setAcceptTarget(null)
      await loadData()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return
    setIsSubmitting(true)
    try {
      const result = await rejectRegistration(rejectTarget.id, eventId)
      if (result?.error) toast.error(result.error)
      else toast.success(`${rejectTarget.full_name} rejected`)
      setRejectTarget(null)
      await loadData()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSendReminder() {
    setSendingReminder(true)
    const result = await sendReminderEmails(eventId, reminderMessage)
    if (result?.error) {
      toast.error(result.error)
    } else {
      if (result.warning) {
        toast.warning(result.warning)
      } else {
        toast.success(`Reminder sent to ${result.count} guest${result.count !== 1 ? 's' : ''}`)
      }
      setReminderOpen(false)
      setReminderMessage('')
    }
    setSendingReminder(false)
  }

  async function handleToggleAutoApprove() {
    if (!event || isTogglingRef.current || isTogglingAutoApprove) return
    isTogglingRef.current = true
    const nextVal = !event.auto_approve_registrations
    setIsTogglingAutoApprove(true)
    try {
      const res = await toggleAutoApprove(eventId, nextVal)
      if (res?.error) {
        toast.error(res.error)
      } else {
        setEvent((prev) => (prev ? { ...prev, auto_approve_registrations: nextVal } : null))
        toast.success(nextVal ? 'Auto-approval enabled for new registrations' : 'Auto-approval disabled')
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to toggle auto-approval')
    } finally {
      setIsTogglingAutoApprove(false)
      isTogglingRef.current = false
    }
  }

  async function handlePromote(reg: Registration) {
    if (promotingId) return
    setPromotingId(reg.id)
    try {
      const result = await promoteFromWaitlist(reg.id, eventId)
      if (result?.error) toast.error(result.error)
      else {
        toast.success(`${reg.full_name} moved to pending`)
        await loadData()
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setPromotingId(null)
    }
  }

  async function confirmBulkAccept() {
    if (selectedIds.length === 0) return
    setIsSubmitting(true)
    try {
      const res = await bulkAcceptRegistrations(selectedIds, eventId)
      if (res?.error) {
        toast.error(res.error)
      } else {
        if (res.warning) {
          toast.warning(res.warning, { duration: 6000 })
        } else {
          toast.success(`Successfully accepted ${res.count} registrant${res.count !== 1 ? 's' : ''}`)
        }
        setSelectedIds([])
        setBulkAcceptOpen(false)
        await loadData()
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to process bulk acceptance')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmBulkReject() {
    if (selectedIds.length === 0) return
    setIsSubmitting(true)
    try {
      const res = await bulkRejectRegistrations(selectedIds, eventId)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success(`Rejected ${res.count} registrant${res.count !== 1 ? 's' : ''}`)
        setSelectedIds([])
        setBulkRejectOpen(false)
        await loadData()
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to process bulk rejection')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter + search
  const filtered = registrations
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r => {
      if (!search) return true
      const s = search.toLowerCase()
      return r.full_name.toLowerCase().includes(s) || r.email.toLowerCase().includes(s)
    })

  const counts = {
    pending: registrations.filter(r => r.status === 'pending').length,
    accepted: registrations.filter(r => r.status === 'accepted').length,
    rejected: registrations.filter(r => r.status === 'rejected').length,
    waitlist: registrations.filter(r => r.status === 'waitlist').length,
  }

  // Selection handlers
  const selectableFiltered = filtered.filter((r) => r.status !== 'accepted')
  const selectableFilteredIds = selectableFiltered.map((r) => r.id)
  const isAllSelected =
    selectableFilteredIds.length > 0 && selectableFilteredIds.every((id) => selectedIds.includes(id))

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !selectableFilteredIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...selectableFilteredIds])))
    }
  }

  function toggleSelectOne(id: string) {
    const reg = registrations.find((r) => r.id === id)
    if (reg?.status === 'accepted') return
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function selectAllPending() {
    const pendingIds = registrations.filter((r) => r.status === 'pending').map((r) => r.id)
    setSelectedIds(pendingIds)
  }

  function copyRegistrationLink() {
    if (!event?.registration_slug) return
    navigator.clipboard.writeText(`${window.location.origin}/register/${event.registration_slug}`)
    setCopiedRegLink(true)
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    copyTimeoutRef.current = setTimeout(() => setCopiedRegLink(false), 2000)
    toast.success('Registration link copied')
  }

  const statusBadge = (status: string) => {
    const cls: Record<string, string> = {
      pending: 'bg-signal/20 text-signal border-signal/30',
      accepted: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      rejected: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
      waitlist: 'bg-foreground/10 text-foreground/60 border-foreground/20',
    }
    return cls[status] ?? ''
  }

  const paymentStatusBadge = (status: string) => {
    const cls: Record<string, string> = {
      paid: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      pending: 'bg-signal/20 text-signal border-signal/30',
      unpaid: 'bg-foreground/10 text-foreground/45 border-foreground/15',
      free: 'bg-foreground/5 text-foreground/50 border-foreground/10 border-dashed',
      failed: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
      refunded: 'bg-copper/20 text-copper border-copper/30',
      abandoned: 'bg-foreground/10 text-foreground/40 border-foreground/20',
    }
    return cls[status] ?? ''
  }

  return (
    <div className="relative pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 border-b-2 border-foreground/10 pb-6">
        <SectionHeader
          eyebrow="Public RSVPs"
          title="Registrations"
          subtitle={loading ? "Loading registrations..." : `${counts.pending} pending · ${counts.accepted} accepted · ${counts.rejected} rejected · ${counts.waitlist} waitlist`}
        />

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Auto-Approve Toggle */}
          {event?.event_type === 'open' && (
            <Button
              variant="outline"
              disabled={isTogglingAutoApprove}
              onClick={handleToggleAutoApprove}
              className={`gap-2 h-10 px-4 text-xs font-bold rounded-full transition-all border ${
                event.auto_approve_registrations
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                  : 'bg-background border-border/40 text-muted-foreground hover:text-foreground'
              }`}
              title="Automatically accept public registrations as soon as they submit"
            >
              {isTogglingAutoApprove ? (
                <Loader2 className="h-4 w-4 animate-spin text-copper" />
              ) : (
                <Zap className={`h-4 w-4 ${event.auto_approve_registrations ? 'fill-current text-emerald-500' : ''}`} />
              )}
              Auto-Approve: {isTogglingAutoApprove ? 'UPDATING...' : event.auto_approve_registrations ? 'ON' : 'OFF'}
            </Button>
          )}

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="gap-2 h-10 px-4 text-xs font-semibold text-foreground/80 hover:text-foreground border border-border/40 rounded-full"
                aria-label="Export registrations and question answers"
              >
                <Download className="h-4 w-4 text-copper" />
                Export Answers
                <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background border border-border/60 rounded-xl shadow-xl p-1.5 z-50">
              <DropdownMenuItem asChild>
                <a
                  href={`/api/events/${eventId}/registrations/export?format=csv${filter !== 'all' ? `&status=${filter}` : ''}`}
                  download
                  className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium cursor-pointer rounded-lg hover:bg-copper/10 hover:text-copper transition-colors border-0"
                >
                  <FileSpreadsheet className="h-4 w-4 text-copper shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-foreground">Export as CSV</span>
                    <span className="text-[10px] text-muted-foreground">Universal spreadsheet (.csv)</span>
                  </div>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={`/api/events/${eventId}/registrations/export?format=xlsx${filter !== 'all' ? `&status=${filter}` : ''}`}
                  download
                  className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium cursor-pointer rounded-lg hover:bg-copper/10 hover:text-copper transition-colors border-0"
                >
                  <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-foreground">Export as Excel</span>
                    <span className="text-[10px] text-muted-foreground">Formatted workbook (.xls / .xlsx)</span>
                  </div>
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Send Reminder */}
          <Button
            variant="ghost"
            className="gap-2 h-10 px-4 text-xs font-semibold text-foreground/70 hover:text-foreground border border-border/40 rounded-full"
            onClick={() => setReminderOpen(true)}
          >
            <Mail className="h-4 w-4" />
            Send Reminder
          </Button>

          {/* Copy registration link */}
          {event?.registration_slug && (
            <Button
              variant="copper"
              className="gap-2 h-10 px-5 text-xs font-bold rounded-full"
              onClick={copyRegistrationLink}
            >
              {copiedRegLink ? (
                <>
                  <Check className="h-4 w-4" />
                  Link Copied!
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Copy Registration Link
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Registration link info & Auto approve note */}
      {event?.registration_slug && (
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 border-l-4 border-copper p-4 bg-copper/5 rounded-r-2xl">
            <p className="font-sans text-xs text-muted-foreground font-semibold mb-1">
              Public Registration Link
            </p>
            <p className="font-sans text-xs text-copper font-medium break-all">
              {typeof window !== 'undefined' && `${window.location.origin}/register/${event.registration_slug}`}
            </p>
          </div>

          {event.auto_approve_registrations && (
            <div className="border-l-4 border-emerald-500 p-4 bg-emerald-500/5 rounded-r-2xl flex items-center gap-3 shrink-0 md:max-w-xs">
              <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="font-sans text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Auto-Approval Active
                </p>
                <p className="font-sans text-[11px] text-muted-foreground">
                  New registrants are automatically accepted and sent pass codes.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters & Selection Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="flex gap-0 border border-border/40 rounded-xl overflow-x-auto max-w-full no-scrollbar shrink-0">
          {(['all', 'pending', 'accepted', 'rejected', 'waitlist'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`font-sans text-xs px-3.5 sm:px-4 py-2 transition-colors shrink-0 whitespace-nowrap ${
                filter === f
                  ? 'bg-foreground text-background font-bold'
                  : 'bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'all' ? `All (${registrations.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f]})`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 sm:max-w-md justify-end">
          {counts.pending > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllPending}
              className="h-9 px-3 text-xs gap-1.5 font-semibold text-foreground/80 border-border/40 hover:bg-stone-500/10 rounded-xl whitespace-nowrap"
            >
              <CheckSquare className="h-3.5 w-3.5 text-copper" />
              Select All Pending ({counts.pending})
            </Button>
          )}

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background border border-border/40 text-foreground font-sans text-xs px-4 py-2 pl-9 placeholder:text-muted-foreground focus:outline-none focus:border-copper rounded-xl transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Registrations list */}
      {loading ? (
        <div className="border border-border/40 rounded-2xl overflow-hidden animate-pulse">
          <div className="hidden sm:grid sm:grid-cols-[36px_minmax(130px,1.2fr)_minmax(160px,1.5fr)_100px_100px_70px_112px] bg-card border-b border-border/40 px-4 py-3 gap-4 items-center">
            <Skeleton className="h-4 w-4 rounded" />
            {['Name', 'Email / Phone', 'Payment', 'Status', 'Date', ''].map((h, idx) => (
              <span
                key={h || idx}
                className={`font-sans text-xs font-semibold text-muted-foreground ${
                  h === 'Payment' || h === 'Status' ? 'text-center' : h === 'Date' ? 'text-right pr-2' : ''
                }`}
              >
                {h}
              </span>
            ))}
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 border-b border-foreground/5">
              <div className="hidden sm:grid sm:grid-cols-[36px_minmax(130px,1.2fr)_minmax(160px,1.5fr)_100px_100px_70px_112px] items-center gap-4">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex justify-center"><Skeleton className="h-6 w-20 bg-foreground/5" /></div>
                <div className="flex justify-center"><Skeleton className="h-6 w-20 bg-foreground/5" /></div>
                <Skeleton className="h-4 w-12 ml-auto" />
                <div className="h-8" />
              </div>
              <div className="sm:hidden flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="h-10 w-10" />}
          title="No Registrations Yet"
          subtitle={filter !== 'all' ? `No ${filter} registrations` : 'No one has registered yet'}
        />
      ) : (
        <div className="border border-border/40 rounded-2xl overflow-hidden">
          {/* Table header (Desktop) */}
          <div className="hidden sm:grid sm:grid-cols-[36px_minmax(130px,1.2fr)_minmax(160px,1.5fr)_100px_100px_70px_112px] bg-card border-b border-border/40 px-4 py-3 gap-4 items-center">
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-border text-copper focus:ring-copper cursor-pointer"
                title="Select all visible"
              />
            </div>
            {['Name', 'Email / Phone', 'Payment', 'Status', 'Date', ''].map((h, idx) => (
              <span
                key={h || idx}
                className={`font-sans text-xs font-semibold text-muted-foreground ${
                  h === 'Payment' || h === 'Status' ? 'text-center' : h === 'Date' ? 'text-right pr-2' : ''
                }`}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((reg) => {
            const isSelected = selectedIds.includes(reg.id)
            const isAccepted = reg.status === 'accepted'

            return (
              <div
                key={reg.id}
                className={`border-b border-border/20 transition-colors group ${
                  isSelected ? 'bg-copper/10 dark:bg-copper/15' : 'hover:bg-stone-500/5'
                }`}
              >
                {/* Desktop Row View (sm:grid) */}
                <div className="hidden sm:grid sm:grid-cols-[36px_minmax(130px,1.2fr)_minmax(160px,1.5fr)_100px_100px_70px_112px] items-center px-4 py-4 gap-4">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isAccepted}
                      onChange={() => toggleSelectOne(reg.id)}
                      className={`h-4 w-4 rounded border-border text-copper focus:ring-copper ${
                        isAccepted ? 'cursor-not-allowed opacity-35' : 'cursor-pointer'
                      }`}
                      title={isAccepted ? 'Accepted registrants cannot be modified or rejected' : 'Select registrant'}
                    />
                  </div>
                  <div className="flex flex-col truncate min-w-0 pr-2">
                    <span className="font-sans text-sm text-foreground font-semibold truncate">{reg.full_name}</span>
                    {reg.ticket_tier?.name && (
                      <span className="inline-block self-start font-sans text-[10px] bg-copper/10 text-copper px-2 py-0.5 mt-1 rounded-full font-semibold truncate max-w-full">
                        {reg.ticket_tier.name}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col truncate min-w-0 pr-2">
                    <span className="font-sans text-xs text-muted-foreground truncate">{reg.email}</span>
                    {reg.phone && <span className="font-sans text-[10px] text-muted-foreground/70 truncate">{reg.phone}</span>}
                  </div>
                  <div className="flex justify-center">
                    <span
                      className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border text-center w-23 truncate ${paymentStatusBadge(reg.payment_status || 'unpaid')}`}
                    >
                      {reg.payment_status}
                    </span>
                  </div>
                  <div className="flex justify-center">
                    <span
                      className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border text-center w-23 truncate ${statusBadge(reg.status)}`}
                    >
                      {reg.status}
                    </span>
                  </div>
                  <span className="font-sans text-xs text-muted-foreground whitespace-nowrap text-right pr-2">
                    {new Date(reg.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </span>
                  <div className="flex items-center gap-1 justify-end">
                    {reg.status === 'pending' && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all shrink-0 rounded-full"
                          onClick={() => handleAccept(reg)}
                          aria-label={`Accept ${reg.full_name}`}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-all shrink-0 rounded-full"
                          onClick={() => handleReject(reg)}
                          aria-label={`Reject ${reg.full_name}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {reg.status === 'waitlist' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={promotingId === reg.id}
                        className="h-8 w-8 text-copper hover:bg-copper/10 transition-all shrink-0 rounded-full"
                        onClick={() => handlePromote(reg)}
                        aria-label={`Promote ${reg.full_name} from waitlist`}
                        title="Promote to pending"
                      >
                        {promotingId === reg.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-copper" />
                        ) : (
                          <ArrowUpCircle className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {reg.status === 'accepted' && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    {reg.status === 'rejected' && (
                      <XCircle className="h-4 w-4 text-red-600/70 dark:text-red-400/70 shrink-0" />
                    )}
                    {reg.status === 'waitlist' && counts.waitlist > 0 && (
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    {/* Answers button — only visible when event has questions */}
                    {eventQuestions.length > 0 && reg.custom_answers && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-copper hover:bg-copper/10 transition-all shrink-0 rounded-full"
                        onClick={() => setAnswersTarget(reg)}
                        aria-label={`View answers from ${reg.full_name}`}
                        title="View registration answers"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Mobile Card View (sm:hidden) */}
                <div className="sm:hidden flex flex-col p-4 gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isAccepted}
                      onChange={() => toggleSelectOne(reg.id)}
                      className={`h-4 w-4 rounded border-border text-copper focus:ring-copper mt-0.5 ${
                        isAccepted ? 'cursor-not-allowed opacity-35' : 'cursor-pointer'
                      }`}
                      title={isAccepted ? 'Accepted registrants cannot be modified or rejected' : 'Select registrant'}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col min-w-0 pr-1">
                          <span className="font-sans text-sm font-bold text-foreground truncate">{reg.full_name}</span>
                          {reg.ticket_tier?.name && (
                            <span className="inline-block self-start font-sans text-[10px] bg-copper/10 text-copper px-2 py-0.5 mt-1 rounded-full font-semibold truncate max-w-full">
                              {reg.ticket_tier.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border text-center ${paymentStatusBadge(reg.payment_status || 'unpaid')}`}>
                            {reg.payment_status}
                          </span>
                          <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border text-center ${statusBadge(reg.status)}`}>
                            {reg.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-2 pt-1 border-t border-border/20 font-sans pl-7">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-xs text-muted-foreground truncate">{reg.email}</span>
                      {reg.phone && <span className="text-[10px] text-muted-foreground/70 truncate">{reg.phone}</span>}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(reg.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>

                  {reg.status === 'pending' && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/20 pl-7">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs gap-1.5 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/10 rounded-full"
                        onClick={() => handleReject(reg)}
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                      <Button
                        variant="copper"
                        size="sm"
                        className="h-8 px-3 text-xs gap-1.5 rounded-full"
                        onClick={() => handleAccept(reg)}
                      >
                        <Check className="h-3.5 w-3.5" /> Accept
                      </Button>
                    </div>
                  )}
                  {reg.status === 'waitlist' && (
                    <div className="flex items-center justify-end pt-2 border-t border-border/20 pl-7">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={promotingId === reg.id}
                        className="h-8 px-3 text-xs gap-1.5 text-copper border border-copper/30 hover:bg-copper/10 rounded-full"
                        onClick={() => handlePromote(reg)}
                      >
                        {promotingId === reg.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-copper" />
                            Promoting...
                          </>
                        ) : (
                          <>
                            <ArrowUpCircle className="h-3.5 w-3.5" />
                            Promote to Pending
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  {/* Mobile answers button */}
                  {eventQuestions.length > 0 && reg.custom_answers && (
                    <div className="flex items-center justify-end pt-2 border-t border-border/20 pl-7">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs gap-1.5 text-muted-foreground border border-border/40 hover:text-copper hover:border-copper/30 rounded-full"
                        onClick={() => setAnswersTarget(reg)}
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> View Answers
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] sm:w-full max-w-xl px-1 sm:px-4">
          <div className="bg-stone-900/95 dark:bg-stone-950/95 text-stone-100 backdrop-blur-md border border-stone-800 shadow-2xl rounded-full px-3 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between gap-1.5 sm:gap-3 overflow-hidden">
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <span className="font-sans text-[11px] sm:text-xs font-bold bg-copper/20 text-copper px-2 sm:px-2.5 py-1 rounded-full border border-copper/30 whitespace-nowrap">
                {selectedIds.length} selected
              </span>
              <button
                onClick={() => setSelectedIds([])}
                className="font-sans text-[11px] sm:text-xs text-stone-300 hover:text-white underline transition-colors whitespace-nowrap"
              >
                Deselect All
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setBulkRejectOpen(true)}
                className="h-8 sm:h-9 px-2.5 sm:px-4 text-[11px] sm:text-xs font-bold gap-1 sm:gap-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors whitespace-nowrap"
              >
                <X className="h-3.5 w-3.5 shrink-0" />
                Reject ({selectedIds.length})
              </Button>
              <Button
                size="sm"
                onClick={() => setBulkAcceptOpen(true)}
                className="h-8 sm:h-9 px-2.5 sm:px-4 text-[11px] sm:text-xs font-bold gap-1 sm:gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-colors whitespace-nowrap"
              >
                <Check className="h-3.5 w-3.5 shrink-0" />
                Approve ({selectedIds.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Accept Single Confirmation Dialog */}
      <ConfirmDialog
        open={!!acceptTarget}
        onOpenChange={(open) => !open && setAcceptTarget(null)}
        title="Accept Registration"
        description="Confirm registration acceptance"
        subject={acceptTarget?.full_name}
        subjectLabel="Registrant"
        body={`Accepting will create a guest entry, generate a QR code, and send an invitation email to ${acceptTarget?.email ?? 'their email'}.`}
        confirmLabel="Accept & Send Invite"
        isPending={isSubmitting}
        onConfirm={confirmAccept}
      />

      {/* Reject Single Confirmation Dialog */}
      <ConfirmDialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title="Reject Registration"
        description="This action cannot be undone."
        subject={rejectTarget?.full_name}
        subjectLabel="Registrant"
        body="This person will not receive an invitation. You can revisit this later if needed."
        confirmLabel="Reject Registration"
        isPending={isSubmitting}
        onConfirm={confirmReject}
      />

      {/* Bulk Accept Confirmation Dialog */}
      <ConfirmDialog
        open={bulkAcceptOpen}
        onOpenChange={setBulkAcceptOpen}
        title={`Approve ${selectedIds.length} Registration${selectedIds.length !== 1 ? 's' : ''}`}
        description="Bulk approval confirmation"
        subject={`${selectedIds.length} Registrant${selectedIds.length !== 1 ? 's' : ''}`}
        subjectLabel="Selected Batch"
        body={`Approving will mark all ${selectedIds.length} selected registrants as accepted, generate active entry passes, and send invitation emails/WhatsApp passes automatically.`}
        confirmLabel={`Approve ${selectedIds.length} Registrations`}
        isPending={isSubmitting}
        onConfirm={confirmBulkAccept}
      />

      {/* Bulk Reject Confirmation Dialog */}
      <ConfirmDialog
        open={bulkRejectOpen}
        onOpenChange={setBulkRejectOpen}
        title={`Reject ${selectedIds.length} Registration${selectedIds.length !== 1 ? 's' : ''}`}
        description="Bulk rejection confirmation"
        subject={`${selectedIds.length} Registrant${selectedIds.length !== 1 ? 's' : ''}`}
        subjectLabel="Selected Batch"
        body={`This will mark all ${selectedIds.length} selected registrants as rejected. If this event has a capacity cap, waitlisted guests will be automatically promoted.`}
        confirmLabel={`Reject ${selectedIds.length} Registrations`}
        isPending={isSubmitting}
        onConfirm={confirmBulkReject}
      />

      {/* Reminder Dialog */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="bg-background border border-border/40 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-sans text-2xl font-bold text-foreground">Send Reminder</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5 mt-2">
            <p className="font-sans text-xs text-muted-foreground leading-relaxed">
              Send a reminder email to all {counts.accepted} confirmed guests.
              Each email will include event details and their QR entry pass.
            </p>

            <div className="flex flex-col gap-2">
              <label htmlFor="reminder-msg" className={labelCls}>Custom Message (optional)</label>
              <textarea
                id="reminder-msg"
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                placeholder="e.g. We can't wait to see you! Don't forget to bring your ID..."
                rows={4}
                className={`${fieldCls} resize-none`}
              />
            </div>

            <div className="border-l-4 border-copper p-3 bg-copper/5 rounded-r-xl">
              <p className="font-sans text-xs text-muted-foreground">
                <span className="text-copper font-bold">Note:</span> This will send an email to {counts.accepted} confirmed guest{counts.accepted !== 1 ? 's' : ''} immediately.
              </p>
            </div>

            <Button
              variant="copper"
              className="w-full h-11 text-xs font-bold gap-2 rounded-full"
              disabled={sendingReminder || counts.accepted === 0}
              onClick={handleSendReminder}
            >
              {sendingReminder ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {`Send to ${counts.accepted} Guest${counts.accepted !== 1 ? 's' : ''}`}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Answers Sheet ── */}
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={() => setAnswersTarget(null)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          answersTarget ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      {/* Slide-in panel (right edge, pure CSS transform) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={answersTarget ? `Registration answers for ${answersTarget.full_name}` : 'Registration answers'}
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-background border-l border-border/40 shadow-2xl flex flex-col transition-transform duration-200 ease-out will-change-transform ${
          answersTarget ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {answersTarget && (
          <>
            {/* Sheet header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <div>
                <p className="font-sans text-xs font-bold uppercase tracking-wider text-copper">Registration Answers</p>
                <p className="font-sans text-sm font-semibold text-foreground mt-0.5 truncate max-w-56">{answersTarget.full_name}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAnswersTarget(null)}
                className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Close answers panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Sheet body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {eventQuestions
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((q) => {
                  const answer = answersTarget.custom_answers?.[q.id]
                  const isEmpty =
                    answer === undefined ||
                    answer === null ||
                    (typeof answer === 'string' && answer.trim() === '') ||
                    (Array.isArray(answer) && answer.length === 0)

                  return (
                    <div key={q.id} className="space-y-1.5">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {q.label}
                        {q.required && <span className="ml-1 text-copper">*</span>}
                      </p>
                      {isEmpty ? (
                        <p className="font-sans text-xs italic text-muted-foreground/50">No answer provided</p>
                      ) : Array.isArray(answer) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {answer.map((v) => (
                            <span
                              key={v}
                              className="font-sans text-xs bg-copper/10 text-copper border border-copper/20 px-2.5 py-0.5 rounded-full font-medium"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="font-sans text-sm text-foreground leading-relaxed">{answer}</p>
                      )}
                    </div>
                  )
                })}

              {eventQuestions.length > 0 && !answersTarget.custom_answers && (
                <p className="font-sans text-sm text-muted-foreground italic">
                  This registrant did not answer any custom questions.
                </p>
              )}
            </div>

            {/* Sheet footer */}
            <div className="px-5 py-4 border-t border-border/40 flex items-center justify-between gap-3">
              <p className="font-sans text-[11px] text-muted-foreground">
                Registered on {new Date(answersTarget.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <a
                href={`/api/events/${eventId}/registrations/export?format=csv`}
                download
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-copper hover:text-copper/85 transition-colors shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Export All
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
