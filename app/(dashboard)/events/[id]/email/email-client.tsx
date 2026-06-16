'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Mail, MailOpen, MousePointerClick, CheckCircle2,
  AlertCircle, AlertTriangle, RefreshCw, TrendingUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SectionHeader } from '@/components/section-header'
import { StatCard } from '@/components/stat-card'
import { Skeleton } from '@/components/ui/skeleton'
import type { EmailLog } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailStats {
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  complained: number
  openRate: number    // percent
  clickRate: number   // percent
}

// ─── Status badge helper ──────────────────────────────────────────────────────

type BadgeVariant = 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'pending'

function StatusBadge({ variant, label }: { variant: BadgeVariant; label: string }) {
  const styles: Record<BadgeVariant, string> = {
    delivered:  'border-admitted/30 text-admitted/80',
    opened:     'border-copper/40 text-copper',
    clicked:    'border-signal/40 text-signal',
    bounced:    'border-red-500/40 text-red-400',
    complained: 'border-orange-500/40 text-orange-400',
    pending:    'border-foreground/15 text-foreground/40',
  }
  return (
    <span
      className={`inline-block font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border ${styles[variant]}`}
    >
      {label}
    </span>
  )
}

function getBadgeVariant(log: EmailLog): BadgeVariant {
  if (log.bounced_at)    return 'bounced'
  if (log.complained_at) return 'complained'
  if (log.clicked_count > 0) return 'clicked'
  if (log.opened_count  > 0) return 'opened'
  if (log.delivered_at)  return 'delivered'
  return 'pending'
}

function getBadgeLabel(log: EmailLog): string {
  if (log.bounced_at)    return 'Bounced'
  if (log.complained_at) return 'Complained'
  if (log.clicked_count > 0) return `Clicked ×${log.clicked_count}`
  if (log.opened_count  > 0) return `Opened ×${log.opened_count}`
  if (log.delivered_at)  return 'Delivered'
  return 'Sent'
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function EmailTabSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="border-b-2 border-foreground/20 pb-6">
        <SectionHeader
          eyebrow="EMAIL_ANALYTICS"
          title="Email Outreach"
          subtitle="Loading email tracking data…"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-foreground/20">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card p-5 space-y-3 border border-border">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EmailClient({ eventId }: { eventId: string }) {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [stats, setStats] = useState<EmailStats>({
    sent: 0, delivered: 0, opened: 0, clicked: 0,
    bounced: 0, complained: 0, openRate: 0, clickRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'invitation' | 'reminder'>('all')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const loadData = useCallback(async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from('email_logs')
      .select('*')
      .eq('event_id', eventId)
      .order('sent_at', { ascending: false })

    const rows = (data ?? []) as EmailLog[]
    setLogs(rows)

    const sent       = rows.length
    const delivered  = rows.filter(r => r.delivered_at).length
    const opened     = rows.filter(r => (r.opened_count ?? 0) > 0).length
    const clicked    = rows.filter(r => (r.clicked_count ?? 0) > 0).length
    const bounced    = rows.filter(r => r.bounced_at).length
    const complained = rows.filter(r => r.complained_at).length
    const openRate   = delivered > 0 ? Math.round((opened  / delivered) * 100) : 0
    const clickRate  = delivered > 0 ? Math.round((clicked / delivered) * 100) : 0

    setStats({ sent, delivered, opened, clicked, bounced, complained, openRate, clickRate })
    setLastRefreshed(new Date())
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    loadData()
    const poll = setInterval(loadData, 30_000)
    return () => clearInterval(poll)
  }, [loadData])

  if (loading) return <EmailTabSkeleton />

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(l => l.email_type === filter)

  const noData = logs.length === 0

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-foreground/20 pb-6">
        <SectionHeader
          eyebrow="EMAIL_ANALYTICS"
          title="Email Outreach"
          subtitle={
            noData
              ? 'No emails sent yet — send invitations or reminders to see tracking data here'
              : 'Open and click rates are tracked via Resend webhooks'
          }
        />
        <button
          onClick={loadData}
          title="Refresh"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-foreground/50 hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          {lastRefreshed
            ? `Updated ${lastRefreshed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
            : 'Refresh'}
        </button>
      </div>

      {/* Stats grid */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-foreground/20"
        role="list"
        aria-label="Email statistics"
      >
        <StatCard
          icon={<Mail className="h-5 w-5 text-foreground/60" aria-hidden="true" />}
          label="Sent"
          value={stats.sent}
          sub={`${stats.delivered} delivered`}
        />
        <StatCard
          icon={<MailOpen className="h-5 w-5 text-copper" aria-hidden="true" />}
          label="Opened"
          value={stats.opened}
          sub={`${stats.openRate}% open rate`}
          accent="copper"
        />
        <StatCard
          icon={<MousePointerClick className="h-5 w-5 text-signal" aria-hidden="true" />}
          label="Clicked"
          value={stats.clicked}
          sub={`${stats.clickRate}% click rate`}
          accent="signal"
        />
        <StatCard
          icon={<AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />}
          label="Bounced"
          value={stats.bounced}
          sub={stats.complained > 0 ? `${stats.complained} complaint${stats.complained > 1 ? 's' : ''}` : 'No complaints'}
        />
      </div>

      {/* Open rate bar */}
      {stats.delivered > 0 && (
        <div>
          <div className="flex justify-between items-end mb-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/70">
              OPEN_RATE
            </span>
            <span className="font-mono text-xs text-copper uppercase">
              {stats.opened} / {stats.delivered} delivered
            </span>
          </div>
          <div
            className="w-full h-4 bg-background border-2 border-foreground/40 relative p-0.5"
            role="progressbar"
            aria-valuenow={stats.openRate}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Open rate: ${stats.openRate}%`}
          >
            <div
              className="h-full bg-copper/70 transition-all duration-700"
              style={{ width: `${stats.openRate}%` }}
            />
          </div>
          {stats.clicked > 0 && (
            <>
              <div className="flex justify-between items-end mb-2 mt-4">
                <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/70">
                  CLICK_RATE
                </span>
                <span className="font-mono text-xs text-signal uppercase">
                  {stats.clicked} / {stats.delivered} delivered
                </span>
              </div>
              <div
                className="w-full h-4 bg-background border-2 border-foreground/40 relative p-0.5"
                role="progressbar"
                aria-valuenow={stats.clickRate}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Click rate: ${stats.clickRate}%`}
              >
                <div
                  className="h-full bg-signal/60 transition-all duration-700"
                  style={{ width: `${stats.clickRate}%` }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Webhook setup notice */}
      {stats.sent > 0 && stats.delivered === 0 && (
        <div className="flex items-start gap-3 border border-copper/30 bg-copper/5 p-4">
          <TrendingUp className="h-4 w-4 text-copper mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-copper mb-1">
              Tracking not yet active
            </p>
            <p className="font-sans text-xs text-foreground/60 leading-relaxed">
              Open and click data will appear here once you configure the Resend webhook.
              Set <code className="font-mono text-[10px] bg-foreground/10 px-1 py-0.5">RESEND_WEBHOOK_SECRET</code> and
              register <code className="font-mono text-[10px] bg-foreground/10 px-1 py-0.5">/api/webhooks/resend</code> in
              your Resend dashboard with <em>email.delivered</em>, <em>email.opened</em>,
              <em>email.clicked</em>, and <em>email.bounced</em> events.
            </p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {logs.length > 0 && (
        <>
          <div className="flex gap-0 border-b border-border">
            {(['all', 'invitation', 'reminder'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`font-mono text-[10px] uppercase tracking-widest px-4 py-2.5 border-b-2 -mb-px transition-colors ${
                  filter === f
                    ? 'border-copper text-foreground'
                    : 'border-transparent text-foreground/40 hover:text-foreground/70'
                }`}
              >
                {f === 'all'
                  ? `All (${logs.length})`
                  : f === 'invitation'
                  ? `Invitations (${logs.filter(l => l.email_type === 'invitation').length})`
                  : `Reminders (${logs.filter(l => l.email_type === 'reminder').length})`}
              </button>
            ))}
          </div>

          {/* Email log table */}
          <div className="flex flex-col gap-px" role="list" aria-label="Email log">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 border border-foreground/10 bg-foreground/5">
              <span className="font-mono text-[9px] uppercase tracking-widest text-foreground/40">Recipient</span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-foreground/40 text-right">Type</span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-foreground/40 text-right hidden sm:block">Sent</span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-foreground/40 text-right">Status</span>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="py-12 border border-foreground/10 flex items-center justify-center">
                <p className="font-mono text-xs uppercase tracking-widest text-foreground/30">No emails</p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const variant = getBadgeVariant(log)
                const label   = getBadgeLabel(log)
                return (
                  <div
                    key={log.id}
                    role="listitem"
                    className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 border transition-colors ${
                      variant === 'bounced' || variant === 'complained'
                        ? 'border-red-500/10 bg-red-500/5 hover:border-red-500/20'
                        : variant === 'opened' || variant === 'clicked'
                        ? 'border-copper/10 bg-copper/5 hover:border-copper/20'
                        : 'border-foreground/8 bg-card hover:border-foreground/15'
                    }`}
                  >
                    {/* Recipient */}
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-foreground truncate">{log.recipient_email}</p>
                      {log.opened_count > 0 && (
                        <p className="font-mono text-[9px] text-foreground/40 mt-0.5 uppercase tracking-widest">
                          First opened{' '}
                          {log.first_opened_at
                            ? new Date(log.first_opened_at).toLocaleString('en-GB', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                              })
                            : '—'}
                        </p>
                      )}
                    </div>

                    {/* Type badge */}
                    <span className="font-mono text-[9px] uppercase tracking-widest text-foreground/40 shrink-0">
                      {log.email_type === 'invitation' ? 'Invite' : 'Reminder'}
                    </span>

                    {/* Sent at */}
                    <span className="font-mono text-[10px] text-foreground/50 shrink-0 hidden sm:block text-right">
                      {new Date(log.sent_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short',
                      })}
                      {' '}
                      {new Date(log.sent_at).toLocaleTimeString('en-GB', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>

                    {/* Status badge */}
                    <StatusBadge variant={variant} label={label} />
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {noData && (
        <div className="py-16 border-2 border-dashed border-foreground/15 flex flex-col items-center justify-center gap-3">
          <Mail className="h-8 w-8 text-foreground/20" aria-hidden="true" />
          <p className="font-mono text-xs uppercase tracking-widest text-foreground/30">No emails sent yet</p>
          <p className="font-sans text-sm text-foreground/40 text-center max-w-xs">
            Send invitations or reminders from the Guests tab — they&apos;ll appear here with full tracking data.
          </p>
        </div>
      )}
    </div>
  )
}
