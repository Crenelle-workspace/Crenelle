'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  AlertCircle,
  Award,
  Receipt,
  Scale,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { RevenueStats } from '@/lib/supabase/revenue-stats'

interface RevenueStatsGridProps {
  initialStats: RevenueStats
}

const POLL_INTERVAL_MS = 60_000

function formatMoney(kobo: number, currency: string = 'NGN'): string {
  const major = Math.round(kobo / 100)
  return `${currency === 'USD' ? '$' : '₦'}${major.toLocaleString('en-US')}`
}

function useElapsed(from: Date | null): string {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!from) return
    const tick = () => setElapsed(Math.floor((Date.now() - from.getTime()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [from])

  if (!from) return ''
  if (elapsed < 5) return 'just now'
  if (elapsed < 60) return `${elapsed}s ago`
  return `${Math.floor(elapsed / 60)}m ago`
}

export function RevenueStatsGrid({ initialStats }: RevenueStatsGridProps) {
  const [stats, setStats] = useState<RevenueStats>(initialStats)
  const [currency, setCurrency] = useState<'NGN' | 'USD'>(
    (initialStats.currency as 'NGN' | 'USD') || 'NGN'
  )
  const [rangePreset, setRangePreset] = useState<'current_month' | 'last_30' | 'last_90' | 'all_time'>('current_month')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    () => new Date(initialStats.fetchedAt)
  )
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsed = useElapsed(lastUpdated)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Calculate Date Params based on Preset
  const getDateRangeParams = useCallback(() => {
    const now = new Date()
    let from: string | undefined
    const to: string = now.toISOString()

    if (rangePreset === 'current_month') {
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
      from = monthStart.toISOString()
    } else if (rangePreset === 'last_30') {
      const d = new Date()
      d.setUTCDate(d.getUTCDate() - 30)
      from = d.toISOString()
    } else if (rangePreset === 'last_90') {
      const d = new Date()
      d.setUTCDate(d.getUTCDate() - 90)
      from = d.toISOString()
    } else if (rangePreset === 'all_time') {
      from = new Date('2020-01-01').toISOString()
    }

    return { from, to, currency }
  }, [rangePreset, currency])

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    setError(false)
    try {
      const { from, to, currency: curr } = getDateRangeParams()
      const queryParams = new URLSearchParams()
      if (from) queryParams.set('from', from)
      if (to) queryParams.set('to', to)
      queryParams.set('currency', curr)

      const res = await fetch(`/api/admin/revenue?${queryParams.toString()}`, {
        cache: 'no-store',
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: RevenueStats = await res.json()
      setStats(data)
      setLastUpdated(new Date(data.fetchedAt))
    } catch (err) {
      console.error('[RevenueStatsGrid] poll failed:', err)
      setError(true)
    } finally {
      setIsRefreshing(false)
    }
  }, [getDateRangeParams])

  // Refetch when currency or range preset changes
  useEffect(() => {
    refresh()
  }, [currency, rangePreset, refresh])

  // Setup periodic polling
  useEffect(() => {
    intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refresh])

  // Handle Export Download
  const handleExport = async (format: 'csv' | 'pdf') => {
    setIsExporting(format)
    try {
      const { from, to, currency: curr } = getDateRangeParams()
      const queryParams = new URLSearchParams()
      if (from) queryParams.set('from', from)
      if (to) queryParams.set('to', to)
      queryParams.set('currency', curr)
      queryParams.set('format', format)

      const downloadUrl = `/api/admin/revenue/export?${queryParams.toString()}`
      window.open(downloadUrl, '_blank')
    } catch (err) {
      console.error('[RevenueStatsGrid] export error:', err)
    } finally {
      setIsExporting(null)
    }
  }

  // Format Recharts Chart Data
  const chartData = stats.monthlyTrend.map((pt) => ({
    name: pt.label,
    gmv: Math.round(pt.gmvKobo / 100),
    platformFee: Math.round(pt.platformFeeKobo / 100),
    payout: Math.round(pt.organiserPayoutKobo / 100),
  }))

  return (
    <div className="space-y-8 select-none">
      {/* ── Top Header Controls & Actions Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Revenue & Financial Control
            </h1>
            <span className="font-mono text-[9px] uppercase tracking-widest bg-copper/15 text-copper border border-copper/30 px-2 py-0.5 rounded">
              Admin Exclusive
            </span>
          </div>
          <p className="font-sans text-xs text-muted-foreground mt-1">
            Real-time Crenelle fee earnings, Gross Merchandise Volume (GMV), payouts, and tax projections.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Currency Toggle */}
          <div className="flex items-center bg-card/60 border border-border/50 rounded-lg p-0.5">
            <button
              onClick={() => setCurrency('NGN')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                currency === 'NGN'
                  ? 'bg-copper text-stone-900 shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ₦ NGN
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                currency === 'USD'
                  ? 'bg-copper text-stone-900 shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              $ USD
            </button>
          </div>

          {/* Date Range Preset Selector */}
          <select
            value={rangePreset}
            onChange={(e) => setRangePreset(e.target.value as 'current_month' | 'last_30' | 'last_90' | 'all_time')}
            className="bg-card/60 border border-border/50 rounded-lg px-3 py-1.5 text-xs text-foreground font-medium focus:outline-none focus:border-copper cursor-pointer"
          >
            <option value="current_month">Current Month</option>
            <option value="last_30">Last 30 Days</option>
            <option value="last_90">Last 90 Days</option>
            <option value="all_time">All Time</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card/60 hover:bg-card border border-border/50 text-xs font-medium text-foreground rounded-lg transition-all cursor-pointer disabled:opacity-50"
            title="Refresh statistics"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export Dropdown */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-copper/10 hover:bg-copper/20 border border-copper/40 text-copper text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              <FileSpreadsheet className="size-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              <FileText className="size-3.5" />
              <span>PDF Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Status Polling Bar ── */}
      <div className="flex items-center justify-between text-xs text-muted-foreground bg-card/30 border border-border/30 rounded-xl px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${error ? 'bg-red-500 animate-ping' : 'bg-emerald-500 animate-ping'}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${error ? 'bg-red-500' : 'bg-emerald-500'}`} />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider">
            {error ? 'Polling sync failed — retrying' : 'Live Revenue Telemetry'}
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/75">
          Updated {elapsed || 'just now'}
        </span>
      </div>

      {/* ── Executive KPI Scorecards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Gross Merchandise Value */}
        <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Gross Volume (GMV)
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatMoney(stats.totals.gmvKobo, currency)}
            </span>
            <p className="font-sans text-[11px] text-muted-foreground mt-1">
              {stats.totals.transactionCount} paid tickets in period
            </p>
          </div>
        </div>

        {/* KPI 2: Crenelle Platform Revenue */}
        <div className="bg-card/40 backdrop-blur-xl border border-copper/30 rounded-2xl p-5 shadow-lg relative overflow-hidden group bg-linear-to-br from-copper/5 via-transparent to-transparent">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-copper">
              Crenelle Net Fee Income
            </span>
            <div className="p-2 bg-copper/10 text-copper rounded-xl">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display text-2xl font-bold tracking-tight text-copper">
              {formatMoney(stats.totals.platformFeeKobo, currency)}
            </span>
            <p className="font-sans text-[11px] text-muted-foreground mt-1">
              Platform take revenue
            </p>
          </div>
        </div>

        {/* KPI 3: Organizer Payouts */}
        <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Organizer Payouts
            </span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <Building2 className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display text-2xl font-bold tracking-tight text-foreground">
              {formatMoney(stats.totals.organiserPayoutKobo, currency)}
            </span>
            <p className="font-sans text-[11px] text-muted-foreground mt-1">
              Net organizer disbursements
            </p>
          </div>
        </div>

        {/* KPI 4: Estimated VAT (7.5%) */}
        <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Est. VAT (7.5%)
            </span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <Receipt className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display text-2xl font-bold tracking-tight text-foreground">
              {formatMoney(stats.taxEstimate.vatEstimateKobo, currency)}
            </span>
            <p className="font-sans text-[11px] text-muted-foreground mt-1">
              On Crenelle fee income
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 2: Recharts 6-Month Trajectory Chart & Settlement Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Column (2 cols) */}
        <div className="lg:col-span-2 bg-card/40 backdrop-blur-xl border border-border/40 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-copper rounded-full" />
              <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-foreground">
                6-Month Revenue Trajectory
              </h2>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              GMV vs Net Platform Fee ({currency})
            </span>
          </div>

          <div className="h-72 w-full">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#8A847C', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    tick={{ fill: '#8A847C', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickFormatter={(v) => `${currency === 'USD' ? '$' : '₦'}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#171512',
                      borderColor: '#BF8430',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [`${currency === 'USD' ? '$' : '₦'}${Number(value ?? 0).toLocaleString()}`, '']}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                  <Bar dataKey="gmv" name="Gross GMV" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="platformFee" name="Crenelle Fee" fill="#BF8430" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Loading revenue trajectory chart…
              </div>
            )}
          </div>
        </div>

        {/* Settlement Health & Reconciliation Column */}
        <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
              <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-foreground">
                Paystack Settlement Health
              </h2>
            </div>
            <p className="font-sans text-xs text-muted-foreground mb-6">
              Bank settlement reconciliation performance tracked across all registered organizer subaccounts.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-stone-900/40 border border-border/40 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-sans text-xs text-foreground">Matched Settlements</span>
                </div>
                <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.settlementSummary.matchedCount}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-stone-900/40 border border-border/40 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <XCircle className="size-4 text-red-600 dark:text-red-400" />
                  <span className="font-sans text-xs text-foreground">Discrepancies</span>
                </div>
                <span className="font-mono text-sm font-bold text-red-600 dark:text-red-400">
                  {stats.settlementSummary.discrepancyCount}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-stone-900/40 border border-border/40 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="size-4 text-copper" />
                  <span className="font-sans text-xs text-foreground">Pending Settlements</span>
                </div>
                <span className="font-mono text-sm font-bold text-copper">
                  {stats.settlementSummary.pendingCount}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 mt-6">
            <div className="flex items-center justify-between">
              <span className="font-sans text-xs text-muted-foreground">Total Settled Volume</span>
              <span className="font-display text-base font-bold text-foreground">
                ₦{stats.settlementSummary.totalSettledAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Top Revenue Generating Events Leaderboard ── */}
      <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Award className="size-4 text-copper" />
            <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-foreground">
              Top Earning Events Leaderboard
            </h2>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            Ranked by Crenelle Fee Earnings ({currency})
          </span>
        </div>

        {stats.topEvents.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border/40 rounded-2xl">
            <p className="font-sans text-xs text-muted-foreground">
              No payment transactions recorded for the selected currency and date range.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/40 font-mono text-[10px] uppercase text-muted-foreground">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Event Title</th>
                  <th className="py-3 px-4 text-center">Tickets Sold</th>
                  <th className="py-3 px-4 text-right">Gross GMV</th>
                  <th className="py-3 px-4 text-right">Crenelle Revenue</th>
                  <th className="py-3 px-4 text-right">Last Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 text-xs">
                {stats.topEvents.map((evt, idx) => (
                  <tr key={evt.eventId} className="hover:bg-copper/5 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-copper">#{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-stone-100">{evt.eventTitle}</td>
                    <td className="py-3 px-4 text-center font-mono text-stone-300">{evt.ticketsSold}</td>
                    <td className="py-3 px-4 text-right font-mono text-stone-300">
                      {formatMoney(evt.gmvKobo, evt.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-copper">
                      {formatMoney(evt.platformFeeKobo, evt.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-stone-300">
                      {evt.lastPaymentAt
                        ? new Date(evt.lastPaymentAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                          })
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 4: Platform Tax Estimation & Compliance Panel ── */}
      <div className="bg-card/40 backdrop-blur-xl border border-copper/30 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="size-4 text-copper" />
          <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-foreground">
            Tax Estimation & Statutory Projections (NGN Rules)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* VAT Estimation Card */}
          <div className="p-4 bg-stone-900/50 border border-border/40 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="font-sans text-xs font-semibold text-stone-100">
                Value Added Tax (VAT) @ {stats.taxEstimate.vatPercent}%
              </span>
              <span className="font-mono text-[10px] text-copper uppercase">Platform Fee Tax</span>
            </div>
            <p className="font-sans text-xs text-stone-300 mb-3">
              Calculated on total Crenelle platform fee income ({formatMoney(stats.taxEstimate.taxablePlatformFeeKobo, currency)}).
            </p>
            <div className="flex items-baseline justify-between pt-2 border-t border-border/30">
              <span className="font-sans text-xs text-stone-300">Estimated VAT Liability:</span>
              <span className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatMoney(stats.taxEstimate.vatEstimateKobo, currency)}
              </span>
            </div>
          </div>

          {/* WHT Estimation Card */}
          <div className="p-4 bg-stone-900/50 border border-border/40 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="font-sans text-xs font-semibold text-stone-100">
                Withholding Tax (WHT) @ {stats.taxEstimate.whtPercent}%
              </span>
              <span className="font-mono text-[10px] text-purple-400 uppercase">Organizer Disbursements</span>
            </div>
            <p className="font-sans text-xs text-stone-300 mb-3">
              Applicable on cumulative organizer payouts exceeding ₦10,000 threshold.
            </p>
            <div className="flex items-baseline justify-between pt-2 border-t border-border/30">
              <span className="font-sans text-xs text-stone-300">Estimated WHT Deduction:</span>
              <span className="font-mono text-lg font-bold text-copper">
                {formatMoney(stats.taxEstimate.whtEstimateKobo, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Statutory Disclaimer Banner */}
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
          <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="font-sans text-xs text-stone-300 leading-relaxed">
            <strong className="text-amber-400 font-semibold">Disclaimer: </strong>
            {stats.taxEstimate.disclaimer}
          </p>
        </div>
      </div>
    </div>
  )
}
