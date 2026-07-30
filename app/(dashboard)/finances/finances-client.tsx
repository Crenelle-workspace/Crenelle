'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Wallet,
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  Receipt,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// ── Types ──
interface OverviewData {
  lifetime: {
    paid_count: number
    refunded_count: number
    disputed_count: number
    gross_revenue_ngn: number
    platform_fees_ngn: number
    net_earnings_ngn: number
    currency: string
  }
  by_event: Array<{
    event_id: string
    event_name: string
    event_date: string | null
    event_status: string
    registration_slug: string
    paid_count: number
    refunded_count: number
    disputed_count: number
    gross_revenue_ngn: number
    platform_fees_ngn: number
    net_earnings_ngn: number
    currency: string
  }>
  subaccount: {
    paystack_subaccount_code: string | null
    bank_name: string | null
    account_number: string | null
    account_name: string | null
    platform_fee_percent: number
    is_verified: boolean
    connected_at: string | null
  } | null
}

interface PayoutEventBreakdown {
  event_id: string
  event_name: string
  event_date: string | null
  registration_slug: string | null
  transaction_count: number
  amount_settled_ngn: number
}

interface PayoutItem {
  id: string
  paystack_settlement_id: string
  transfer_reference: string | null
  settlement_date: string
  total_amount_ngn: number
  status: 'PENDING' | 'MATCHED' | 'DISCREPANCY'
  created_at: string
  by_event: PayoutEventBreakdown[]
}

interface PayoutsResponse {
  payouts: PayoutItem[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
  summary: {
    payout_count: number
    total_settled_ngn: number
  }
}

interface PaymentItem {
  id: string
  paystack_reference: string
  amount_kobo: number
  platform_fee_kobo: number
  organiser_amount_kobo: number
  currency: string
  status: string
  payer_email: string
  payer_name: string | null
  paystack_channel: string | null
  paid_at: string | null
  created_at: string
  event_id: string
  ticket_tier_id: string
  events?: { id: string; name: string; date: string | null; registration_slug: string }
  ticket_tiers?: { id: string; name: string; price: number; currency: string }
}

interface PaymentsResponse {
  payments: PaymentItem[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
  summary: {
    paid_count: number
    gross_ngn: number
    platform_fees_ngn: number
    net_earnings_ngn: number
  }
}

export function FinancesClient() {
  const [activeTab, setActiveTab] = useState<'events' | 'payouts' | 'transactions'>('events')
  
  // Data states
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [loadingOverview, setLoadingOverview] = useState(true)
  
  const [payoutsData, setPayoutsData] = useState<PayoutsResponse | null>(null)
  const [loadingPayouts, setLoadingPayouts] = useState(false)
  const [payoutsPage, setPayoutsPage] = useState(1)
  
  const [paymentsData, setPaymentsData] = useState<PaymentsResponse | null>(null)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [paymentsPage, setPaymentsPage] = useState(1)
  const [paymentEventFilter, setPaymentEventFilter] = useState<string>('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('')
  const [eventSearch, setEventSearch] = useState('')

  // Expanded payout cards state
  const [expandedPayouts, setExpandedPayouts] = useState<Record<string, boolean>>({})

  // Format currency helper (rounds up to whole Naira, e.g. 203.05 -> ₦204)
  const formatNGN = (amount: number) => {
    const naira = Math.ceil(amount)
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(naira)
  }

  // 1. Fetch overview
  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true)
    try {
      const res = await fetch('/api/organizer/finances')
      if (res.ok) {
        const data = await res.json()
        setOverview(data)
      }
    } catch (err) {
      console.error('Failed to load finances overview:', err)
    } finally {
      setLoadingOverview(false)
    }
  }, [])

  // 2. Fetch payouts
  const fetchPayouts = useCallback(async (page = 1) => {
    setLoadingPayouts(true)
    try {
      const res = await fetch(`/api/organizer/finances/payouts?page=${page}&per_page=15`)
      if (res.ok) {
        const data = await res.json()
        setPayoutsData(data)
      }
    } catch (err) {
      console.error('Failed to load payouts:', err)
    } finally {
      setLoadingPayouts(false)
    }
  }, [])

  // 3. Fetch transactions
  const fetchPayments = useCallback(async (page = 1, eventId = '', status = '') => {
    setLoadingPayments(true)
    try {
      let url = `/api/organizer/finances/payments?page=${page}&per_page=20`
      if (eventId) url += `&event_id=${encodeURIComponent(eventId)}`
      if (status) url += `&status=${encodeURIComponent(status)}`
      
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setPaymentsData(data)
      }
    } catch (err) {
      console.error('Failed to load payments:', err)
    } finally {
      setLoadingPayments(false)
    }
  }, [])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  useEffect(() => {
    if (activeTab === 'payouts') {
      fetchPayouts(payoutsPage)
    }
  }, [activeTab, payoutsPage, fetchPayouts])

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchPayments(paymentsPage, paymentEventFilter, paymentStatusFilter)
    }
  }, [activeTab, paymentsPage, paymentEventFilter, paymentStatusFilter, fetchPayments])

  const togglePayoutExpand = (id: string) => {
    setExpandedPayouts((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const lifetime = overview?.lifetime
  const subaccount = overview?.subaccount

  const filteredEvents = (overview?.by_event ?? []).filter((e) =>
    e.event_name.toLowerCase().includes(eventSearch.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div className="space-y-1">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-copper bg-copper/10 border border-copper/20 px-2.5 py-1 rounded-full inline-block mb-2">
            Revenue & Settlements
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase text-foreground leading-tight tracking-tight">
            Finances & Payouts
          </h1>
          <p className="font-sans text-xs text-muted-foreground">
            Track revenue streams, inspect settlement deposits, and identify event-level performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchOverview()
              if (activeTab === 'payouts') fetchPayouts(payoutsPage)
              if (activeTab === 'transactions') fetchPayments(paymentsPage, paymentEventFilter, paymentStatusFilter)
            }}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border/40 hover:border-border px-3 py-2 rounded-xl bg-card transition-all cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingOverview ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            href="/settings/payments"
            className="inline-flex items-center gap-2 bg-foreground text-background hover:bg-foreground/90 font-sans text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-300 shadow-xs cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Bank Settings</span>
          </Link>
        </div>
      </div>

      {/* ── Bank Account Status Banner ── */}
      <div className="border border-border/40 bg-stone-500/5 dark:bg-card/40 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 bg-copper/10 text-copper rounded-xl border border-copper/20 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans text-sm font-semibold text-foreground">
                  {subaccount?.account_name || 'Bank Account Connection'}
                </span>
                {subaccount?.is_verified ? (
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Connected (T+1)
                  </span>
                ) : (
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> No Bank Account
                  </span>
                )}
              </div>
              <p className="font-mono text-xs text-muted-foreground mt-0.5 wrap-break-word">
                {subaccount?.bank_name ? (
                  <>
                    {subaccount.bank_name} • Account Number: <span className="text-foreground font-semibold">{subaccount.account_number}</span> (Subaccount: <span className="break-all">{subaccount.paystack_subaccount_code}</span>)
                  </>
                ) : (
                  'Connect your bank account to receive automatic next-day payouts from Paystack.'
                )}
              </p>
            </div>
          </div>

          {!subaccount?.is_verified && (
            <Link
              href="/settings/payments"
              className="inline-flex items-center justify-center gap-1.5 font-sans text-xs font-bold text-copper bg-copper/10 hover:bg-copper/20 border border-copper/30 px-4 py-2 rounded-xl transition-all shrink-0"
            >
              Connect Bank <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* ── Key Metrics Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Earnings */}
        <div className="border border-border/40 bg-card rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Net Earnings (95%)</span>
            <Wallet className="w-4 h-4 text-copper" />
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {loadingOverview ? '...' : formatNGN(lifetime?.net_earnings_ngn ?? 0)}
            </div>
            <p className="font-sans text-[11px] text-muted-foreground mt-1">Your payout share after platform fees</p>
          </div>
        </div>

        {/* Gross Revenue */}
        <div className="border border-border/40 bg-card rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Gross Sales</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {loadingOverview ? '...' : formatNGN(lifetime?.gross_revenue_ngn ?? 0)}
            </div>
            <p className="font-sans text-[11px] text-muted-foreground mt-1">Total ticket revenue collected</p>
          </div>
        </div>

        {/* Platform Fees */}
        <div className="border border-border/40 bg-card rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Crenelle Fee (5%)</span>
            <Receipt className="w-4 h-4 text-sky-500" />
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {loadingOverview ? '...' : formatNGN(lifetime?.platform_fees_ngn ?? 0)}
            </div>
            <p className="font-sans text-[11px] text-muted-foreground mt-1">Platform service fee</p>
          </div>
        </div>

        {/* Paid Tickets */}
        <div className="border border-border/40 bg-card rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Paid Registrations</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {loadingOverview ? '...' : (lifetime?.paid_count ?? 0).toLocaleString()}
            </div>
            <p className="font-sans text-[11px] text-muted-foreground mt-1">Confirmed paid guest admissions</p>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="w-full max-w-full overflow-x-auto no-scrollbar py-1">
        <div className="inline-flex min-w-max gap-1.5 border border-border/40 bg-card/40 backdrop-blur-xl p-1.5 rounded-full shadow-xs">
          <button
            onClick={() => setActiveTab('events')}
            className={`font-sans text-xs font-bold px-5 py-2.5 rounded-full flex items-center gap-2 whitespace-nowrap transition-all duration-300 cursor-pointer ${
              activeTab === 'events'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-stone-500/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Revenue by Event ({overview?.by_event.length ?? 0})
          </button>

          <button
            onClick={() => setActiveTab('payouts')}
            className={`font-sans text-xs font-bold px-5 py-2.5 rounded-full flex items-center gap-2 whitespace-nowrap transition-all duration-300 cursor-pointer ${
              activeTab === 'payouts'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-stone-500/10'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Payout Settlements {payoutsData ? `(${payoutsData.summary.payout_count})` : ''}
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`font-sans text-xs font-bold px-5 py-2.5 rounded-full flex items-center gap-2 whitespace-nowrap transition-all duration-300 cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-stone-500/10'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Transaction Ledger
          </button>
        </div>
      </div>

      {/* ── TAB 1: REVENUE BY EVENT ── */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-sans text-lg font-bold text-foreground">Event Revenue Distribution</h2>
              <p className="font-mono text-xs text-muted-foreground">
                See exactly which money came from which event and its net payout value.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter events..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="w-full bg-card border border-border/40 rounded-xl text-xs pl-8 pr-3 py-2 font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-copper transition-colors"
              />
            </div>
          </div>

          {loadingOverview ? (
            <div className="text-center py-16 font-mono text-xs text-muted-foreground">
              Loading event revenue breakdown...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border/40 rounded-2xl bg-card/30">
              <p className="font-sans text-sm font-semibold text-foreground">No events found</p>
              <p className="font-mono text-xs text-muted-foreground mt-1">
                Create a paid event to start tracking earnings.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvents.map((evt) => {
                const percentage =
                  (lifetime?.gross_revenue_ngn ?? 0) > 0
                    ? Math.round((evt.gross_revenue_ngn / lifetime!.gross_revenue_ngn) * 100)
                    : 0

                return (
                  <div
                    key={evt.event_id}
                    className="border border-border/40 bg-card rounded-2xl p-5 hover:border-border/80 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <Link
                            href={`/events/${evt.event_id}`}
                            className="font-sans text-base font-bold text-foreground hover:text-copper transition-colors line-clamp-1"
                          >
                            {evt.event_name}
                          </Link>
                          {evt.event_date && (
                            <p className="font-mono text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {new Date(evt.event_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                        </div>

                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-border/40 bg-stone-500/10 text-foreground shrink-0">
                          {evt.event_status}
                        </span>
                      </div>

                      {/* Revenue progress bar */}
                      <div className="space-y-1.5 my-3">
                        <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                          <span>Share of total sales</span>
                          <span className="font-bold text-foreground">{percentage}%</span>
                        </div>
                        <div className="w-full bg-stone-500/10 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-copper h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percentage, 2)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Breakdown metrics */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/30 font-mono">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Gross</span>
                        <span className="text-xs font-semibold text-foreground">{formatNGN(evt.gross_revenue_ngn)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Net (Organiser)</span>
                        <span className="text-xs font-bold text-copper">{formatNGN(evt.net_earnings_ngn)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Paid Tickets</span>
                        <span className="text-xs font-semibold text-foreground">{evt.paid_count} tickets</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: PAYOUT SETTLEMENTS ── */}
      {activeTab === 'payouts' && (
        <div className="space-y-6">
          <div>
            <h2 className="font-sans text-lg font-bold text-foreground">Bank Payout Deposits</h2>
            <p className="font-mono text-xs text-muted-foreground">
              Paystack lump-sum bank settlements matched to the exact events that generated them.
            </p>
          </div>

          {loadingPayouts ? (
            <div className="text-center py-16 font-mono text-xs text-muted-foreground">
              Fetching settlement payouts...
            </div>
          ) : !payoutsData || payoutsData.payouts.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border/40 rounded-2xl bg-card/30">
              <p className="font-sans text-sm font-semibold text-foreground">No payout settlements recorded yet</p>
              <p className="font-mono text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Paystack automatically reconciles settlements every hour. Payouts will appear here after your first paid event deposit is processed.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payoutsData.payouts.map((payout) => {
                const isExpanded = expandedPayouts[payout.id]

                return (
                  <div
                    key={payout.id}
                    className="border border-border/40 bg-card rounded-2xl p-5 hover:border-border/60 transition-all space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-bold text-foreground">
                            {formatNGN(payout.total_amount_ngn)}
                          </span>

                          <span
                            className={`font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                              payout.status === 'MATCHED'
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                : payout.status === 'PENDING'
                                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400'
                                : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {payout.status === 'MATCHED' && <CheckCircle2 className="w-2.5 h-2.5" />}
                            {payout.status === 'PENDING' && <Clock className="w-2.5 h-2.5" />}
                            {payout.status === 'DISCREPANCY' && <AlertTriangle className="w-2.5 h-2.5" />}
                            {payout.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground min-w-0 wrap-break-word">
                          <span>
                            Settled on:{' '}
                            <strong className="text-foreground">
                              {new Date(payout.settlement_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </strong>
                          </span>
                          {payout.transfer_reference && (
                            <span className="break-all">
                              Ref: <strong className="text-foreground">{payout.transfer_reference}</strong>
                            </span>
                          )}
                          <span className="break-all">Paystack Settlement ID: {payout.paystack_settlement_id}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => togglePayoutExpand(payout.id)}
                        className="inline-flex items-center gap-1.5 font-mono text-xs text-copper hover:text-copper-dark font-bold cursor-pointer self-start md:self-auto"
                      >
                        {isExpanded ? (
                          <>
                            Hide Breakdown <ChevronUp className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            Event Breakdown ({payout.by_event.length}) <ChevronDown className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* Expandable Per-Event Breakdown */}
                    {isExpanded && (
                      <div className="pt-4 border-t border-border/30 space-y-3">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Which events produced this deposit:
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {payout.by_event.map((ev) => (
                            <div
                              key={ev.event_id}
                              className="border border-border/30 bg-stone-500/5 rounded-xl p-3.5 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-sans text-xs font-bold text-foreground block">
                                  {ev.event_name}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {ev.transaction_count} {ev.transaction_count === 1 ? 'ticket' : 'tickets'} included
                                </span>
                              </div>
                              <span className="font-mono text-xs font-bold text-copper">
                                {formatNGN(ev.amount_settled_ngn)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Payout Pagination */}
              {payoutsData.pagination.total_pages > 1 && (
                <div className="flex items-center justify-between pt-4 font-mono text-xs">
                  <span className="text-muted-foreground">
                    Page {payoutsData.pagination.page} of {payoutsData.pagination.total_pages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={!payoutsData.pagination.has_prev}
                      onClick={() => setPayoutsPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 border border-border/40 rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 inline" /> Prev
                    </button>
                    <button
                      disabled={!payoutsData.pagination.has_next}
                      onClick={() => setPayoutsPage((p) => p + 1)}
                      className="px-3 py-1.5 border border-border/40 rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      Next <ChevronRight className="w-4 h-4 inline" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: TRANSACTION LEDGER ── */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-sans text-lg font-bold text-foreground">Transaction Ledger</h2>
              <p className="font-mono text-xs text-muted-foreground">
                Itemized log of all guest ticket payments and transaction references.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Event filter */}
              <select
                value={paymentEventFilter}
                onChange={(e) => {
                  setPaymentEventFilter(e.target.value)
                  setPaymentsPage(1)
                }}
                className="bg-card border border-border/40 rounded-xl text-xs px-3 py-2 font-mono text-foreground focus:outline-none focus:border-copper"
              >
                <option value="">All Events</option>
                {(overview?.by_event ?? []).map((e) => (
                  <option key={e.event_id} value={e.event_id}>
                    {e.event_name}
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={paymentStatusFilter}
                onChange={(e) => {
                  setPaymentStatusFilter(e.target.value)
                  setPaymentsPage(1)
                }}
                className="bg-card border border-border/40 rounded-xl text-xs px-3 py-2 font-mono text-foreground focus:outline-none focus:border-copper"
              >
                <option value="">Status: All (Default Paid)</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
                <option value="disputed">Disputed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {loadingPayments ? (
            <div className="text-center py-16 font-mono text-xs text-muted-foreground">
              Loading payment transactions...
            </div>
          ) : !paymentsData || paymentsData.payments.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border/40 rounded-2xl bg-card/30">
              <p className="font-sans text-sm font-semibold text-foreground">No payments found</p>
              <p className="font-mono text-xs text-muted-foreground mt-1">
                Try clearing your filters or check back after guests purchase tickets.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-border/40 rounded-2xl overflow-hidden bg-card">
                <div className="overflow-x-auto no-scrollbar w-full max-w-full">
                  <table className="w-full min-w-162.5 text-left font-mono text-xs">
                    <thead className="bg-stone-500/10 border-b border-border/40 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      <tr>
                        <th className="py-3 px-4">Payer</th>
                        <th className="py-3 px-4">Event & Tier</th>
                        <th className="py-3 px-4">Paystack Ref</th>
                        <th className="py-3 px-4">Gross</th>
                        <th className="py-3 px-4">Your Net</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {paymentsData.payments.map((p) => (
                        <tr key={p.id} className="hover:bg-stone-500/5 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-sans font-semibold text-foreground block">
                              {p.payer_name || 'Guest'}
                            </span>
                            <span className="text-[11px] text-muted-foreground">{p.payer_email}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-sans font-semibold text-foreground block">
                              {p.events?.name || 'Event'}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {p.ticket_tiers?.name || 'Standard'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[11px] text-foreground font-bold">{p.paystack_reference}</span>
                            {p.paystack_channel && (
                              <span className="text-[10px] text-muted-foreground block uppercase">
                                Channel: {p.paystack_channel}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-foreground">{formatNGN(p.amount_kobo / 100)}</td>
                          <td className="py-3 px-4 font-bold text-copper">
                            {formatNGN((p.organiser_amount_kobo ?? 0) / 100)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${
                                p.status === 'paid'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : p.status === 'refunded'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-muted-foreground whitespace-nowrap">
                            {p.paid_at
                              ? new Date(p.paid_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Transactions Pagination */}
              {paymentsData.pagination.total_pages > 1 && (
                <div className="flex items-center justify-between pt-2 font-mono text-xs">
                  <span className="text-muted-foreground">
                    Page {paymentsData.pagination.page} of {paymentsData.pagination.total_pages} ({paymentsData.pagination.total} total)
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={!paymentsData.pagination.has_prev}
                      onClick={() => setPaymentsPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 border border-border/40 rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 inline" /> Prev
                    </button>
                    <button
                      disabled={!paymentsData.pagination.has_next}
                      onClick={() => setPaymentsPage((p) => p + 1)}
                      className="px-3 py-1.5 border border-border/40 rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      Next <ChevronRight className="w-4 h-4 inline" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
