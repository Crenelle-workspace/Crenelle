import Link from 'next/link'
import { QrCode } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row relative overflow-hidden selection:bg-copper/30 selection:text-white">
      {/* Ambient background mesh glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-copper/5 blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[3rem_3rem] opacity-20 dark:opacity-10 pointer-events-none z-0" />

      {/* ── Left editorial panel (desktop) ── */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden flex-col justify-between p-14 bg-card/40 backdrop-blur-md border-r border-border/40 z-10">

        {/* Structural watermark */}
        <div
          className="absolute bottom-0 right-0 font-sans font-black text-foreground/[0.02] dark:text-foreground/[0.03] leading-none select-none pointer-events-none"
          style={{ fontSize: '26vw', lineHeight: 0.85 }}
          aria-hidden="true"
        >
          CR
        </div>

        {/* Copper vertical rule */}
        <div className="absolute left-14 top-0 bottom-0 w-px bg-copper/20" />

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-3 pl-6 group">
          <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center text-background group-hover:rotate-12 transition-transform duration-500 shadow-sm">
            <QrCode className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-sans text-xl font-bold tracking-tight text-foreground leading-none">
              crenelle
            </span>
            <span className="font-mono text-[8px] text-muted-foreground/60 tracking-wider mt-0.5 uppercase">
              Creative Event Suite
            </span>
          </div>
        </Link>

        {/* Hero statement */}
        <div className="relative z-10 pl-6 space-y-8">
          <div className="border-l-2 border-copper pl-6 space-y-2">
            <h2
              className="font-sans text-foreground font-black leading-[1.02] tracking-tight"
              style={{ fontSize: 'clamp(32px, 3.8vw, 50px)' }}
            >
              Gathering is an art.<br />
              <span className="text-copper">Host it flawlessly.</span>
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md pt-1">
              Design custom ticket pages, collect payouts, broadcast branded email invites, and manage door check-ins with absolute ease.
            </p>
          </div>

          <div className="flex flex-col gap-3.5 pt-2">
            {[
              'QR-coded entry passes generated automatically upon payment',
              'Usher scan links load instantly inside standard mobile browsers',
              'Single-use access signatures — 100% duplicate protection',
            ].map((line, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="font-mono text-[9px] font-bold text-copper mt-0.5 shrink-0 bg-copper/10 border border-copper/20 px-2 py-0.5 rounded-full">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="font-sans text-xs text-muted-foreground leading-relaxed">{line}</p>
              </div>
            ))}
          </div>

          <p className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-widest pt-4">
            © 2026 CRENELLE SECURITY & TICKETING SERVICES
          </p>
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 relative z-10">

        {/* Mobile logo */}
        <Link href="/" className="lg:hidden mb-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center text-background shadow-sm">
            <QrCode className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-sans text-xl font-bold tracking-tight text-foreground leading-none">
              crenelle
            </span>
            <span className="font-mono text-[8px] text-muted-foreground/60 tracking-wider mt-0.5 uppercase">
              Creative Event Suite
            </span>
          </div>
        </Link>

        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
