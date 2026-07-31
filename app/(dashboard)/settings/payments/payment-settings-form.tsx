'use client'

import { useState } from 'react'
import { Loader2, CreditCard, CheckCircle2, Building2, AlertTriangle, ChevronDown, Calculator, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { fieldCls, labelCls, hintCls } from '@/lib/form-styles'
import type { OrganizerPaymentSettings } from '@/lib/types'
import { calculatePaymentBreakdown, formatKoboAsNGN } from '@/lib/paystack'

interface Props {
  settings: OrganizerPaymentSettings | null
}

interface BankOption {
  id: number
  name: string
  code: string
}

export function PaymentSettingsForm({ settings }: Props) {
  const isConnected = !!settings?.paystack_subaccount_code && settings.is_verified

  // Form state
  const [accountNumber, setAccountNumber] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [bankName, setBankName] = useState('')
  const [resolvedAccountName, setResolvedAccountName] = useState<string | null>(null)
  const [banks, setBanks] = useState<BankOption[]>([])
  const [banksLoaded, setBanksLoaded] = useState(false)

  // Calculator state
  const [sampleTicketPriceNGN, setSampleTicketPriceNGN] = useState<number>(10000)

  // UI state
  const [isResolvingAccount, setIsResolvingAccount] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoadingBanks, setIsLoadingBanks] = useState(false)

  // Load banks on dropdown open
  async function loadBanks() {
    if (banksLoaded) return
    setIsLoadingBanks(true)
    try {
      const res = await fetch('/api/payments/banks')
      const json = await res.json()
      if (json.banks) {
        setBanks(json.banks)
        setBanksLoaded(true)
      } else {
        toast.error('Failed to load bank list')
      }
    } catch {
      toast.error('Failed to load bank list')
    } finally {
      setIsLoadingBanks(false)
    }
  }

  function handleBankChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = banks.find((b) => b.code === e.target.value)
    setBankCode(e.target.value)
    setBankName(selected?.name ?? '')
    // Reset resolution when bank changes
    setResolvedAccountName(null)
  }

  async function handleResolveAccount() {
    if (!accountNumber || accountNumber.length !== 10) {
      toast.error('Account number must be 10 digits')
      return
    }
    if (!bankCode) {
      toast.error('Please select a bank first')
      return
    }

    setIsResolvingAccount(true)
    setResolvedAccountName(null)
    try {
      const res = await fetch('/api/payments/setup-subaccount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', account_number: accountNumber, bank_code: bankCode }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Could not verify account. Check the details and try again.')
      } else {
        setResolvedAccountName(json.account_name)
        toast.success('Account verified')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setIsResolvingAccount(false)
    }
  }

  async function handleConnect() {
    if (!resolvedAccountName) {
      toast.error('Verify your account first')
      return
    }

    setIsConnecting(true)
    try {
      const res = await fetch('/api/payments/setup-subaccount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          account_number: accountNumber,
          bank_code: bankCode,
          bank_name: bankName,
          business_name: resolvedAccountName,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Failed to connect account. Please try again.')
      } else {
        toast.success('Bank account connected! Payouts will be settled T+1.')
        // Reload page to show connected state
        window.location.reload()
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setIsConnecting(false)
    }
  }

  const platformPercent = settings?.platform_fee_percent ?? 5
  const sampleKobo = (sampleTicketPriceNGN || 0) * 100
  const breakdown = calculatePaymentBreakdown(sampleKobo, platformPercent)

  return (
    <div className="space-y-6 select-none">

      {/* ── Settlement info banner ── */}
      <section className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-6 sm:px-8 py-5 border-b border-border/40 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-copper/10 text-copper">
            <CreditCard className="size-4" aria-hidden="true" />
          </div>
          <h2 className="font-sans text-base font-bold text-foreground tracking-tight">
            Payout Bank Account
          </h2>
        </div>

        {/* Connected state */}
        {isConnected && settings ? (
          <div className="px-6 sm:px-8 py-6 space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
              <CheckCircle2 className="size-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-sans text-sm font-bold text-foreground">Bank account verified & connected</p>
                <p className="font-mono text-[10px] text-emerald-400/80 mt-0.5 uppercase tracking-wider font-bold">
                  Payouts settled T+1 (next business day)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1.5">
                <span className="font-sans text-xs font-semibold text-copper block">Account Name</span>
                <p className="font-sans text-sm font-bold text-foreground tracking-tight">{settings.account_name ?? '—'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1.5">
                <span className="font-sans text-xs font-semibold text-copper block">Bank Name</span>
                <p className="font-sans text-sm font-bold text-foreground tracking-tight">{settings.bank_name ?? '—'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs space-y-1.5">
                <span className="font-sans text-xs font-semibold text-copper block">Account Number</span>
                <p className="font-mono text-sm font-bold text-foreground tracking-tight">{settings.account_number ? `••••${settings.account_number.slice(-4)}` : '—'}</p>
              </div>
            </div>

            <p className={hintCls}>
              To update your bank account, contact support. Subaccount code:{' '}
              <code className="font-mono text-xs text-muted-foreground">
                {settings.paystack_subaccount_code}
              </code>
            </p>
          </div>
        ) : (

        /* Not connected state */
          <div className="px-6 py-6 space-y-5">
            {/* Warning */}
            <div className="flex items-start gap-3 p-4 border border-amber-500/20 bg-amber-500/5">
              <AlertTriangle className="size-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-sans text-sm font-semibold text-foreground">Bank account not connected</p>
                <p className="font-mono text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
                  You must connect a bank account before guests can pay for tickets.
                </p>
              </div>
            </div>

            {/* Bank selector */}
            <div className="flex flex-col gap-2">
              <label htmlFor="bank-select" className={labelCls}>Bank</label>
              <div className="relative">
                <select
                  id="bank-select"
                  value={bankCode}
                  onChange={handleBankChange}
                  onFocus={loadBanks}
                  disabled={isLoadingBanks}
                  className={[fieldCls, 'appearance-none pr-10'].join(' ')}
                >
                  <option value="">
                    {isLoadingBanks ? 'Loading banks…' : 'Select your bank'}
                  </option>
                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              </div>
            </div>

            {/* Account number + verify */}
            <div className="flex flex-col gap-2">
              <label htmlFor="account-number" className={labelCls}>Account number</label>
              <div className="flex gap-2">
                <input
                  id="account-number"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value.replace(/\D/g, ''))
                    setResolvedAccountName(null)
                  }}
                  placeholder="0123456789"
                  className={[fieldCls, 'flex-1 font-mono tracking-widest'].join(' ')}
                />
                <button
                  type="button"
                  onClick={handleResolveAccount}
                  disabled={isResolvingAccount || !bankCode || accountNumber.length !== 10}
                  className="px-4 py-2.5 bg-foreground text-background font-sans text-xs font-semibold uppercase tracking-[0.14em] hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                >
                  {isResolvingAccount ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="size-3.5 animate-spin" /> Verifying
                    </span>
                  ) : (
                    'Verify'
                  )}
                </button>
              </div>
              <p className={hintCls}>Enter your 10-digit NUBAN account number.</p>
            </div>

            {/* Resolved account name confirmation */}
            {resolvedAccountName && (
              <div className="flex items-center gap-3 p-4 border border-green-500/20 bg-green-500/5">
                <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Account name</p>
                  <p className="font-sans text-sm font-semibold text-foreground mt-0.5">{resolvedAccountName}</p>
                </div>
              </div>
            )}

            {/* Connect button */}
            {resolvedAccountName && (
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-2 bg-copper text-background font-sans text-sm font-semibold uppercase tracking-[0.14em] px-6 py-3.5 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isConnecting ? (
                  <><Loader2 className="size-4 animate-spin" /> Connecting…</>
                ) : (
                  <><Building2 className="size-4" /> Connect Bank Account</>
                )}
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Payment Breakdown Calculator ── */}
      <section className="bg-card border border-border">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2.5">
          <Calculator className="size-4 text-copper" />
          <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.25em] text-foreground">
            Payment Breakdown Calculator
          </h2>
        </div>
        <div className="px-6 py-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <label htmlFor="sample-ticket-price" className={labelCls}>
                Sample Ticket Price (NGN)
              </label>
              <p className="font-mono text-[11px] text-muted-foreground">
                Enter an amount to preview the fee breakdown.
              </p>
            </div>
            <div className="relative w-full sm:w-48">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">₦</span>
              <input
                id="sample-ticket-price"
                type="number"
                min={0}
                value={sampleTicketPriceNGN || ''}
                onChange={(e) => setSampleTicketPriceNGN(Math.max(0, parseInt(e.target.value || '0', 10)))}
                className={[fieldCls, 'pl-7 font-mono text-sm'].join(' ')}
              />
            </div>
          </div>

          {/* Breakdown results */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-background border border-border/60 space-y-1 font-mono">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Ticket Fee</span>
              <span className="text-sm font-semibold text-foreground">{formatKoboAsNGN(breakdown.ticketFeeKobo)}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-background border border-border/60 space-y-1 font-mono">
              <span className="text-[10px] text-copper uppercase tracking-wider block">Crenelle Processing Fee ({breakdown.platformFeePercent}%)</span>
              <span className="text-sm font-semibold text-copper">{formatKoboAsNGN(breakdown.crenelleChargeKobo)}</span>
              <span className="text-[9px] text-muted-foreground/60 block pt-0.5">Includes Paystack gateway charges</span>
            </div>

            <div className="p-3.5 rounded-xl bg-copper/10 border border-copper/30 space-y-1 font-mono">
              <span className="text-[10px] text-copper uppercase tracking-wider block font-bold">Your Net Payout</span>
              <span className="text-sm font-bold text-copper">{formatKoboAsNGN(breakdown.organiserPayoutKobo)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── How splits work ── */}
      <section className="border border-border bg-card">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Receipt className="size-4 text-copper" />
          <h2 className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-foreground">
            How Payouts & Fee Breakdown Work
          </h2>
        </div>
        <div className="px-6 py-6 space-y-4">
          <div className="grid grid-cols-1 gap-3 font-mono text-[11px] text-muted-foreground">
            {[
              { step: '01', text: 'Guest previews ticket fee and Crenelle processing fee before paying.' },
              { step: '02', text: 'Crenelle carries all Paystack gateway processing charges within Crenelle’s fee.' },
              { step: '03', text: `Crenelle retains ${platformPercent}% as a platform processing fee.` },
              { step: '04', text: `You receive ${100 - platformPercent}% net ticket revenue direct to your bank account.` },
              { step: '05', text: 'Paystack settles funds to your bank account on the next business day (T+1).' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-4">
                <span className="text-copper shrink-0 font-bold">{step}</span>
                <span className="leading-relaxed">{text}</span>
              </div>
            ))}
          </div>

          <div className="p-3.5 border border-border/40 bg-muted/30 rounded-xl">
            <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
              Sample Breakdown ({formatKoboAsNGN(breakdown.ticketFeeKobo)} Ticket): Crenelle Processing Fee ({platformPercent}%) = {formatKoboAsNGN(breakdown.crenelleChargeKobo)} (includes Paystack charges) · You Receive = {formatKoboAsNGN(breakdown.organiserPayoutKobo)}
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}
