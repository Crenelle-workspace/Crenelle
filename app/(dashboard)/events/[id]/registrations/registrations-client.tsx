'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Check, X, Mail, Search, UserPlus, Clock, CheckCircle2, XCircle, Send, ArrowUpCircle } from 'lucide-react'
import { acceptRegistration, rejectRegistration, promoteFromWaitlist, sendReminderEmails } from '@/app/actions/registrations'
import { createClient } from '@/lib/supabase/client'
import { fieldCls, labelCls } from '@/lib/form-styles'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { SectionHeader } from '@/components/section-header'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import type { Event, TicketTier } from '@/lib/types'

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
  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminderMessage, setReminderMessage] = useState('')
  const [sendingReminder, setSendingReminder] = useState(false)
  const [acceptTarget, setAcceptTarget] = useState<Registration | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Registration | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient()
      const [{ data: attendees }, { data: ev }] = await Promise.all([
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
      ])

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
        }
      })

      setRegistrations(mappedRegs)
      setEvent(ev)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadData()

    // Realtime subscription below drives updates; poll is a slow safety net (was 10s).
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

  // Copy registration link
  function copyRegistrationLink() {
    if (!event?.registration_slug) return
    navigator.clipboard.writeText(`${window.location.origin}/register/${event.registration_slug}`)
    toast.success('Registration link copied')
  }

  const statusBadge = (status: string) => {
    const cls: Record<string, string> = {
      pending: 'bg-signal/20 text-signal border-signal/30',
      accepted: 'bg-admitted/20 text-admitted border-admitted/30',
      rejected: 'bg-denied/20 text-denied border-denied/30',
      waitlist: 'bg-foreground/10 text-foreground/60 border-foreground/20',
    }
    return cls[status] ?? ''
  }

  const paymentStatusBadge = (status: string) => {
    const cls: Record<string, string> = {
      paid: 'bg-admitted/20 text-admitted border-admitted/30',
      pending: 'bg-signal/20 text-signal border-signal/30',
      unpaid: 'bg-foreground/10 text-foreground/45 border-foreground/15',
      free: 'bg-foreground/5 text-foreground/50 border-foreground/10 border-dashed',
      failed: 'bg-denied/20 text-denied border-denied/30',
      refunded: 'bg-copper/20 text-copper border-copper/30',
      abandoned: 'bg-foreground/10 text-foreground/40 border-foreground/20',
    }
    return cls[status] ?? ''
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 border-b-2 border-foreground/10 pb-6">
        <SectionHeader
          eyebrow="Public RSVPs"
          title="Registrations"
          subtitle={loading ? "Loading registrations..." : `${counts.pending} pending · ${counts.accepted} accepted · ${counts.rejected} rejected · ${counts.waitlist} waitlist`}
        />

        <div className="flex flex-wrap gap-2 shrink-0">
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
              <UserPlus className="h-4 w-4" />
              Copy Registration Link
            </Button>
          )}
        </div>
      </div>

      {/* Registration link info */}
      {event?.registration_slug && (
        <div className="border-l-4 border-copper p-4 bg-copper/5 rounded-r-2xl mb-6">
          <p className="font-sans text-xs text-muted-foreground font-semibold mb-1">
            Public Registration Link
          </p>
          <p className="font-sans text-xs text-copper font-medium break-all">
            {typeof window !== 'undefined' && `${window.location.origin}/register/${event.registration_slug}`}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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

      {/* Registrations list */}
      {loading ? (
        <div className="border border-border/40 rounded-2xl overflow-hidden animate-pulse">
          {/* Table header (Desktop) */}
          <div className="hidden sm:grid sm:grid-cols-[minmax(130px,1.2fr)_minmax(160px,1.5fr)_105px_105px_75px_64px] bg-card border-b border-border/40 px-4 py-3 gap-4">
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
              {/* Desktop Skeleton */}
              <div className="hidden sm:grid sm:grid-cols-[minmax(130px,1.2fr)_minmax(160px,1.5fr)_105px_105px_75px_64px] items-center gap-4">
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
              {/* Mobile Skeleton */}
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
          <div className="hidden sm:grid sm:grid-cols-[minmax(130px,1.2fr)_minmax(160px,1.5fr)_105px_105px_75px_64px] bg-card border-b border-border/40 px-4 py-3 gap-4">
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
          {filtered.map((reg) => (
            <div
              key={reg.id}
              className="border-b border-border/20 hover:bg-stone-500/5 transition-colors group"
            >
              {/* Desktop Row View (sm:grid) */}
              <div className="hidden sm:grid sm:grid-cols-[minmax(130px,1.2fr)_minmax(160px,1.5fr)_105px_105px_75px_64px] items-center px-4 py-4 gap-4">
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
                <div className="flex gap-1 justify-end">
                  {reg.status === 'pending' && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10 transition-all shrink-0 rounded-full"
                        onClick={() => handleAccept(reg)}
                        aria-label={`Accept ${reg.full_name}`}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:bg-red-500/10 transition-all shrink-0 rounded-full"
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
                      disabled={isSubmitting}
                      className="h-8 w-8 text-copper hover:bg-copper/10 transition-all shrink-0 rounded-full"
                      onClick={async () => {
                        setIsSubmitting(true)
                        try {
                          const result = await promoteFromWaitlist(reg.id, eventId)
                          if (result?.error) toast.error(result.error)
                          else { toast.success(`${reg.full_name} moved to pending`); await loadData() }
                        } catch (e: unknown) {
                          toast.error(e instanceof Error ? e.message : 'An error occurred')
                        } finally {
                          setIsSubmitting(false)
                        }
                      }}
                      aria-label={`Promote ${reg.full_name} from waitlist`}
                      title="Promote to pending"
                    >
                      <ArrowUpCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {reg.status === 'accepted' && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  )}
                  {reg.status === 'rejected' && (
                    <XCircle className="h-4 w-4 text-red-500/60 shrink-0" />
                  )}
                  {reg.status === 'waitlist' && counts.waitlist > 0 && (
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              </div>

              {/* Mobile Card View (sm:hidden) */}
              <div className="sm:hidden flex flex-col p-4 gap-3">
                {/* Header line: Name/Tier + Badges */}
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

                {/* Details line: Email/Phone & Date */}
                <div className="flex items-end justify-between gap-2 pt-1 border-t border-border/20 font-sans">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-xs text-muted-foreground truncate">{reg.email}</span>
                    {reg.phone && <span className="text-[10px] text-muted-foreground/70 truncate">{reg.phone}</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(reg.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </span>
                </div>

                {/* Actions line (Mobile buttons) */}
                {reg.status === 'pending' && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/20">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs gap-1.5 text-red-500 border border-red-500/30 hover:bg-red-500/10 rounded-full"
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
                  <div className="flex items-center justify-end pt-2 border-t border-border/20">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isSubmitting}
                      className="h-8 px-3 text-xs gap-1.5 text-copper border border-copper/30 hover:bg-copper/10 rounded-full"
                      onClick={async () => {
                        setIsSubmitting(true)
                        try {
                          const result = await promoteFromWaitlist(reg.id, eventId)
                          if (result?.error) toast.error(result.error)
                          else { toast.success(`${reg.full_name} moved to pending`); await loadData() }
                        } catch (e: unknown) {
                          toast.error(e instanceof Error ? e.message : 'An error occurred')
                        } finally {
                          setIsSubmitting(false)
                        }
                      }}
                    >
                      <ArrowUpCircle className="h-3.5 w-3.5" /> Promote to Pending
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Accept Confirmation Dialog */}
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

      {/* Reject Confirmation Dialog */}
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
              <Send className="h-4 w-4" />
              {sendingReminder ? 'Sending...' : `Send to ${counts.accepted} Guest${counts.accepted !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
