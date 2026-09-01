'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { resendConfirmationEmail } from '@/app/actions/auth'
import { Mail, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Inner component that reads search params ─────────────────────────────────
function CheckEmailCard() {
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email') ?? ''
  const displayEmail = emailParam ? decodeURIComponent(emailParam) : null

  const [resendState, setResendState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // 60-second cooldown after a resend so users can't spam
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1_000)
    return () => clearInterval(id)
  }, [cooldown])

  async function handleResend() {
    if (!displayEmail || resendState === 'loading' || cooldown > 0) return
    setResendState('loading')
    setErrorMsg(null)

    const result = await resendConfirmationEmail(displayEmail)

    if (result?.error) {
      setResendState('error')
      setErrorMsg(result.error)
    } else {
      setResendState('sent')
      setCooldown(60)
      // Reset 'sent' badge after 4 s so user can trigger again after cooldown
      setTimeout(() => setResendState('idle'), 4_000)
    }
  }

  const steps = [
    { num: '01', label: 'Open your email app' },
    { num: '02', label: 'Find the email from Crenelle' },
    { num: '03', label: 'Click "Confirm your email"' },
  ]

  return (
    <div className="w-full bg-card/40 backdrop-blur-xl border border-border/40 rounded-3xl p-8 sm:p-10 shadow-2xl relative select-none overflow-hidden">

      {/* Ambient copper glow behind the icon */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-copper/10 blur-3xl rounded-full pointer-events-none" />

      {/* Mail icon */}
      <div className="relative flex justify-center mb-6">
        <div className="relative size-16 flex items-center justify-center rounded-2xl bg-copper/10 border border-copper/20 shadow-lg shadow-copper/10">
          <Mail className="size-7 text-copper" strokeWidth={1.5} />
          {/* Animated ping ring */}
          <span className="absolute inset-0 rounded-2xl border border-copper/30 animate-ping opacity-40" />
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-copper bg-copper/10 border border-copper/20 px-2.5 py-1 rounded-full inline-block mb-3">
          Almost there
        </span>
        <h1 className="font-sans text-2xl font-black text-foreground tracking-tight">
          Check your inbox
        </h1>
        <p className="font-sans text-xs text-muted-foreground mt-2 leading-relaxed">
          We sent a confirmation link to
        </p>
        {displayEmail && (
          <p className="font-mono text-sm font-bold text-foreground mt-1 truncate max-w-xs mx-auto">
            {displayEmail}
          </p>
        )}
      </div>

      {/* Step guide */}
      <div className="flex flex-col gap-3 mb-8">
        {steps.map((step) => (
          <div key={step.num} className="flex items-center gap-3 bg-stone-100/60 dark:bg-stone-900/40 border border-border/30 rounded-xl px-4 py-3">
            <span className="font-mono text-[9px] font-bold text-copper bg-copper/10 border border-copper/20 px-2 py-0.5 rounded-full shrink-0">
              {step.num}
            </span>
            <p className="font-sans text-xs text-muted-foreground leading-snug">
              {step.label}
            </p>
          </div>
        ))}
      </div>

      {/* Resend button */}
      {displayEmail && (
        <div className="flex flex-col gap-2 mb-6">
          {errorMsg && (
            <div
              role="alert"
              className="border-l-2 border-red-500 bg-red-500/10 px-4 py-3 rounded-r-xl font-sans text-xs text-red-400 leading-relaxed"
            >
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            onClick={handleResend}
            disabled={resendState === 'loading' || cooldown > 0}
            className={cn(
              'w-full flex items-center justify-center gap-2 font-sans text-xs font-bold px-6 py-3 rounded-full border transition-all duration-300',
              resendState === 'sent'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-default'
                : 'border-border/50 bg-card/60 text-muted-foreground hover:border-copper/40 hover:text-copper disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
            )}
          >
            {resendState === 'loading' ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" />
                Sending…
              </>
            ) : resendState === 'sent' ? (
              <>
                <CheckCircle2 className="size-3.5" />
                Email sent!
              </>
            ) : cooldown > 0 ? (
              `Resend in ${cooldown}s`
            ) : (
              <>
                <RefreshCw className="size-3.5" />
                Didn&apos;t receive it? Resend
              </>
            )}
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="relative flex py-4 items-center">
        <div className="grow border-t border-border/30" />
        <span className="shrink mx-4 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
          Or
        </span>
        <div className="grow border-t border-border/30" />
      </div>

      {/* Nav links */}
      <div className="flex flex-col gap-2">
        <Link
          href="/signup"
          className="flex items-center justify-center gap-2 font-sans text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to sign up
        </Link>
        <p className="font-sans text-xs text-muted-foreground text-center">
          Already confirmed?{' '}
          <Link href="/login" className="text-copper font-bold hover:underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>

      {/* Fine print */}
      <p className="font-mono text-[9px] text-muted-foreground/40 text-center mt-6 leading-relaxed uppercase tracking-widest">
        Check your spam folder if you don&apos;t see it
      </p>
    </div>
  )
}

// ── Page wrapper with Suspense (required for useSearchParams in Next.js) ──────
export default function CheckEmailPage() {
  return (
    <Suspense fallback={
      <div className="w-full bg-card/40 backdrop-blur-xl border border-border/40 rounded-3xl p-10 shadow-2xl flex items-center justify-center min-h-80">
        <div className="size-6 rounded-full border-2 border-copper border-t-transparent animate-spin" />
      </div>
    }>
      <CheckEmailCard />
    </Suspense>
  )
}
