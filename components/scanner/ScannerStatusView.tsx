'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Lock, Radio, Flag } from 'lucide-react'

interface ScannerStatusViewProps {
  status: 'standby' | 'deactivated' | 'ended'
  eventName?: string
}

export default function ScannerStatusView({ status, eventName }: ScannerStatusViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Auto-poll event status silently every 4 seconds when in standby mode
  useEffect(() => {
    if (status !== 'standby') return

    const interval = setInterval(() => {
      startTransition(() => {
        router.refresh()
      })
    }, 4000)

    return () => clearInterval(interval)
  }, [status, router])

  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden relative selection:bg-copper/30 selection:text-white font-sans flex flex-col justify-between select-none">
      {/* Immersive landing-page background mesh glows */}
      <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-copper/8 dark:bg-copper/5 blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-[25%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-amber-500/6 dark:bg-amber-50/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[10%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-copper-light/5 dark:bg-copper-light/3 blur-[160px] pointer-events-none z-0" />

      {/* Grid structure overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[6rem_6rem] opacity-35 dark:opacity-10 pointer-events-none z-0" />

      {/* ── HEADER ── */}
      <nav className="relative z-20 px-6 md:px-12 py-5 border-b border-border/45 bg-background/60 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/Brand Logos/CRENELLE FULLH W.png"
              alt="Crenelle"
              width={160}
              height={36}
              className="h-8 w-auto hidden dark:block object-contain"
              priority
            />
            <Image
              src="/Brand Logos/CRENELLE FULLH B.png"
              alt="Crenelle"
              width={160}
              height={36}
              className="h-8 w-auto block dark:hidden object-contain"
              priority
            />
          </div>

          <div className="flex items-center gap-2">
            {status === 'standby' && (
              <span className="text-[9px] uppercase font-bold tracking-wider text-copper bg-copper/10 border border-copper/20 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                <Radio className="w-3 h-3 animate-pulse" />
                Standby Mode
              </span>
            )}
            {status === 'deactivated' && (
              <span className="text-[9px] uppercase font-bold tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                Access Revoked
              </span>
            )}
            {status === 'ended' && (
              <span className="text-[9px] uppercase font-bold tracking-wider text-stone-400 bg-stone-500/10 border border-stone-500/20 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                <Flag className="w-3 h-3" />
                Event Ended
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* ── MAIN TICKET PASS HERO SECTION ── */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 my-auto">
        <div className="max-w-lg w-full bg-card/40 backdrop-blur-xl border border-border/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative transition-all duration-300 group">
          
          {/* Signature copper left accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-copper/80 group-hover:bg-copper transition-all duration-300" />

          {/* Ticket Header Metadata */}
          <div className="pl-7 pr-6 pt-6 pb-4 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/80 bg-stone-500/10 border border-border/30 px-2 py-0.5 rounded-md font-bold">
                GATE PASS
              </span>
              <span className="font-mono text-[10px] text-muted-foreground font-medium">
                #MANIFEST-SCANNER
              </span>
            </div>
            <span className="font-mono text-[10px] text-black dark:text-white font-bold uppercase tracking-wider">
              {status === 'standby' && 'PENDING LIVE'}
              {status === 'deactivated' && 'OFFLINE'}
              {status === 'ended' && 'CONCLUDED'}
            </span>
          </div>

          {/* Ticket Main Content */}
          <div className="pl-7 pr-6 sm:pr-8 py-8 space-y-4">
            <div>
              <span className="text-[9px] uppercase font-bold tracking-wider text-copper bg-copper/10 border border-copper/20 px-2.5 py-0.5 rounded-full inline-block mb-3">
                {eventName || 'Event Admission'}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.02] tracking-tight text-foreground">
                {status === 'standby' && 'Not Yet Open.'}
                {status === 'deactivated' && 'Link Deactivated.'}
                {status === 'ended' && 'Event Ended.'}
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md">
              {status === 'standby' && (
                <>
                  Scanning for <span className="text-foreground font-bold">{eventName || 'this event'}</span> has not opened yet. The organizer will set the event status to <span className="text-copper font-bold">Live</span> when admission begins.
                </>
              )}
              {status === 'deactivated' && (
                <>
                  This gate scanner link has been deactivated by the event organizer. Please contact them to re-enable access for this gate.
                </>
              )}
              {status === 'ended' && (
                <>
                  <span className="text-foreground font-bold">{eventName || 'This event'}</span> has ended. This scanner link is closed and no further admissions can be recorded.
                </>
              )}
            </p>
          </div>

          {/* Perforated Ticket Divider */}
          <div className="relative my-1">
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background border border-border/40" />
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background border border-border/40" />
            <div className="border-t border-dashed border-border/40 mx-8" />
          </div>

          {/* Ticket Footer Status Bar */}
          <div className="pl-7 pr-6 sm:pr-8 py-5 bg-stone-500/5 flex items-center justify-between text-xs">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Crenelle Gate Station
            </span>
            <span className="font-mono text-[10px] text-copper font-bold uppercase tracking-wider">
              {status === 'standby' && 'Standby Active'}
              {status === 'deactivated' && 'Access Revoked'}
              {status === 'ended' && 'Gate Closed'}
            </span>
          </div>

        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="relative z-20 py-5 px-6 border-t border-border/45 bg-background/60 backdrop-blur-lg text-center">
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
          Crenelle Event Access Management // Gate Scanner
        </p>
      </footer>
    </div>
  )
}
