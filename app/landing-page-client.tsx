'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  QrCode,
  ArrowRight,
  Shield,
  Mail,
  Users,
  Ticket,
  Activity,
  Volume2,
  VolumeX,
  Terminal,
  RefreshCw,
  BarChart2,
  Bell,
  Lock,
  Layers,
  Search,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import { cn } from '@/lib/utils'

interface LandingPageClientProps {
  user: any
}

// ── synthesized gate scanner audio using Web Audio API ──
function playScannerTone(type: 'admit' | 'deny') {
  if (typeof window === 'undefined') return
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const now = ctx.currentTime

    if (type === 'admit') {
      // Crenelle Admit sound: Two ascending clean sine tones (G5 -> C6)
      const osc1 = ctx.createOscillator()
      const gain = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(783.99, now) // G5
      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)

      osc1.connect(gain)
      gain.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.1)

      const osc2 = ctx.createOscillator()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(1046.50, now + 0.08) // C6
      gain.gain.setValueAtTime(0.08, now + 0.08)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22)

      osc2.connect(gain)
      osc2.start(now + 0.08)
      osc2.stop(now + 0.22)
    } else {
      // Crenelle Deny sound: Low staccato sawtooth buzz
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(120, now) // Low A#
      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.35)
    }
  } catch (e) {
    console.warn('Audio check-in sound blocked by browser autoplay rules:', e)
  }
}

export function LandingPageClient({ user }: LandingPageClientProps) {
  // Simulator State
  const [scanState, setScanState] = useState<'IDLE' | 'SCANNING' | 'ADMITTED' | 'DENIED'>('IDLE')
  const [guestCount, setGuestCount] = useState(134102)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [simHistory, setSimHistory] = useState<Array<{ id: string; time: string; name: string; status: 'SUCCESS' | 'FAIL'; note: string }>>([
    { id: '1', time: '22:14:02', name: 'Marcus Sterling', status: 'SUCCESS', note: 'VIP Seat 4 · Admitted party of 1' },
    { id: '2', time: '22:15:30', name: 'Elena Rostova', status: 'SUCCESS', note: 'General · Admitted party of 2' },
  ])

  // Feature Console State
  const [activeTab, setActiveTab] = useState<'gate' | 'dispatch' | 'core' | 'squad'>('gate')

  // Marquee list
  const useCases = [
    "Tech Summits", "Product Launches", "Private Showcases", "Annual Galas",
    "Creative Workshops", "Closed Board Dinners", "Art Expos", "Music Festivals", "Industrial Raves"
  ]

  // Trigger Simulator check-in
  const runSimulation = (type: 'admit' | 'deny') => {
    if (scanState === 'SCANNING') return

    setScanState('SCANNING')
    
    // Simulate laser sweep delay
    setTimeout(() => {
      if (type === 'admit') {
        setScanState('ADMITTED')
        if (audioEnabled) playScannerTone('admit')
        setGuestCount(prev => prev + 2)
        setSimHistory(prev => [
          {
            id: String(Date.now()),
            time: new Date().toTimeString().split(' ')[0],
            name: 'Alexandra Harris',
            status: 'SUCCESS',
            note: 'VIP Table 7 · Admitted party of 2'
          },
          ...prev
        ])
      } else {
        setScanState('DENIED')
        if (audioEnabled) playScannerTone('deny')
        setSimHistory(prev => [
          {
            id: String(Date.now()),
            time: new Date().toTimeString().split(' ')[0],
            name: 'Alexandra Harris (Duplicate)',
            status: 'FAIL',
            note: 'DUPLICATE CODE: Verified 1m ago'
          },
          ...prev
        ])
      }
    }, 1200)
  }

  const resetSimulator = () => {
    setScanState('IDLE')
  }

  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden relative selection:bg-copper/30 selection:text-white">
      
      {/* Structural Industrial Grid Mesh */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(238,234,227,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(238,234,227,0.03)_1px,transparent_1px)] bg-size-[4rem_4rem] pointer-events-none z-0" />
      
      {/* ── COMMAND HEADER (NAV) ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 border-b border-border bg-background/80 backdrop-blur-md">
        {/* Corner Brackets */}
        <div className="absolute left-0 bottom-0 w-3 h-px bg-copper/30" />
        <div className="absolute right-0 bottom-0 w-3 h-px bg-copper/30" />
        
        <Link href="/" className="flex items-center gap-3 group relative">
          <div className="w-8 h-8 border border-copper/50 flex items-center justify-center bg-card group-hover:border-copper transition-colors relative">
            <QrCode className="w-4 h-4 text-copper" />
            <div className="absolute -top-0.5 -left-0.5 w-1 h-1 bg-copper" />
            <div className="absolute -bottom-0.5 -right-0.5 w-1 h-1 bg-copper" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-lg font-bold tracking-[0.25em] uppercase text-foreground leading-none">
              Crenelle
            </span>
            <span className="font-mono text-[8px] text-muted-foreground/60 tracking-widest mt-1">
              DOOR SECURE // VERSION 2.6
            </span>
          </div>
        </Link>

        {/* Center operational log */}
        <div className="hidden lg:flex items-center gap-3 font-mono text-[10px] text-muted-foreground border-x border-border/60 px-6 py-1 bg-lead/10">
          <span className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
          <span className="tracking-wider">SYS.STATE: 100% OPERATIONAL // SCANS ACTIVE</span>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden md:flex items-center gap-6">
            {[['#console', 'Console'], ['#process', 'Process'], ['#uses', 'Uses']].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground hover:text-copper transition-colors relative group py-1"
              >
                {label}
                <span className="absolute bottom-0 left-0 w-0 h-px bg-copper group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <ModeToggle />
            <div className="w-px h-5 bg-border hidden md:block" />
            <Link
              href="/login"
              className="relative overflow-hidden font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-foreground border border-border bg-card px-5 py-2.5 transition-all hover:border-copper hover:text-copper active:scale-95 group"
            >
              {/* Button corner dots */}
              <div className="absolute top-0 left-0 w-1 h-1 bg-border/80 group-hover:bg-copper" />
              <div className="absolute bottom-0 right-0 w-1 h-1 bg-border/80 group-hover:bg-copper" />
              <span className="relative z-10">{user ? 'Dashboard' : 'Sign in'}</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="min-h-screen pt-28 pb-16 px-6 md:px-12 flex flex-col justify-center relative overflow-hidden">
        {/* Huge watermarked blueprints */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-full max-h-[800px] pointer-events-none select-none opacity-[0.02] border border-dashed border-foreground flex items-center justify-center font-display font-black text-[25vw] leading-none z-0">
          SECURE
        </div>

        {/* Structural indicators */}
        <div className="absolute left-6 md:left-12 top-32 bottom-12 w-px bg-linear-to-b from-border/20 via-border to-border/20 hidden lg:block" />
        <div className="absolute right-6 md:right-12 top-32 bottom-12 w-px bg-linear-to-b from-border/20 via-border to-border/20 hidden lg:block" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 xl:gap-20 items-center max-w-7xl mx-auto w-full">
          
          {/* Left Column — Title & Architecture */}
          <div className="space-y-8 pl-0 lg:pl-6">
            
            {/* Tagline pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-copper/30 bg-copper/5 font-mono text-[10px] uppercase tracking-[0.2em] text-copper">
              <Shield className="w-3 h-3 animate-pulse" />
              <span>Gate Access Protocol</span>
            </div>

            <h1 className="font-display font-bold leading-[0.85] tracking-tighter text-foreground text-5xl sm:text-7xl xl:text-8xl">
              <span className="block text-foreground/80 font-light italic">Zero Leakage.</span>
              <span className="block">Total Gate</span>
              <span className="block text-copper">Control.</span>
            </h1>

            <p className="font-mono text-xs md:text-sm text-muted-foreground leading-relaxed max-w-lg border-l-2 border-copper/40 pl-5">
              Crenelle provides institutional event security. Issue cryptographically unique, one-time scan tickets. Authorise gate entry links instantly for ushers with zero-login requirements. Prevent duplicate entries with database-locked race protection.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-5 pt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-3 bg-foreground text-background font-mono text-xs font-bold uppercase tracking-[0.2em] px-8 py-4.5 hover:bg-copper hover:text-white transition-all shadow-[4px_4px_0_0_rgba(191,132,48,0.25)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 relative group"
              >
                <span className="absolute top-0 left-0 w-1 h-1 bg-background" />
                <span className="absolute bottom-0 right-0 w-1 h-1 bg-background" />
                Initialize Event
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <a
                href="#console"
                className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground py-2 border-b border-transparent hover:border-copper transition-all"
              >
                Read Blueprints ➔
              </a>
            </div>

            {/* Live Counter Widget & Micro Statistics */}
            <div className="grid grid-cols-3 gap-6 pt-10 border-t border-border/60 max-w-xl">
              {[
                { val: guestCount.toLocaleString(), label: 'Simulated check-ins' },
                { val: '0.4s', label: 'DB verify latency' },
                { val: '100%', label: 'Scan reliability' },
              ].map((s, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute top-0 left-0 w-1.5 h-px bg-copper" />
                  <div className="pt-3">
                    <p className="font-display text-2xl font-bold text-foreground tracking-tight group-hover:text-copper transition-colors">
                      {s.val}
                    </p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/80 mt-1">
                      {s.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Right Column — The Gate Simulator */}
          <div className="flex flex-col items-center justify-center relative w-full">
            
            {/* Top status indicator line */}
            <div className="absolute -top-5 left-0 right-0 flex items-center justify-between font-mono text-[9px] text-muted-foreground/60 border-b border-border/40 pb-2">
              <span>SCANNER_CLIENT_SIM // ACTIVE</span>
              <span>AUDIO: {audioEnabled ? 'MUTED_OFF' : 'MUTED_ON'}</span>
            </div>

            {/* Simulated Usher device wrapper */}
            <div className="relative w-full max-w-[390px] bg-card border border-border/80 p-5 rounded shadow-2xl">
              
              {/* Corner crosshairs */}
              <div className="absolute -top-1 -left-1 font-mono text-xs text-copper/40 font-light">+</div>
              <div className="absolute -top-1 -right-1 font-mono text-xs text-copper/40 font-light">+</div>
              <div className="absolute -bottom-2 -left-1 font-mono text-xs text-copper/40 font-light">+</div>
              <div className="absolute -bottom-2 -right-1 font-mono text-xs text-copper/40 font-light">+</div>

              {/* Usher Header */}
              <div className="border border-border/40 bg-lead/30 p-3 mb-4 rounded flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-copper animate-pulse" />
                  <div>
                    <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground leading-none">Gate Entrance 1</h3>
                    <span className="font-mono text-[8px] text-muted-foreground">Usher Session ACTIVE</span>
                  </div>
                </div>
                
                {/* Audio toggle button */}
                <button
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className={cn(
                    "p-1.5 border transition-all rounded",
                    audioEnabled ? "border-copper/40 text-copper bg-copper/5" : "border-border/60 text-muted-foreground hover:text-foreground"
                  )}
                  title={audioEnabled ? "Disable sound check-in tones" : "Enable sound check-in tones"}
                >
                  {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Pass Card Component */}
              <div className="border border-border relative overflow-hidden bg-background p-4 flex flex-col justify-between">
                
                {/* Visual laser sweep container */}
                {scanState === 'SCANNING' && (
                  <motion.div
                    initial={{ top: '0%' }}
                    animate={{ top: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                    className="absolute left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-copper to-transparent shadow-[0_0_10px_2px_rgba(191,132,48,0.8)] z-20 pointer-events-none"
                  />
                )}

                {/* Card Top section */}
                <div className="flex justify-between items-start mb-3 border-b border-border/40 pb-3">
                  <div>
                    <span className="font-mono text-[8px] text-copper tracking-widest uppercase">CRENELLE PASS</span>
                    <h4 className="font-display text-lg font-bold leading-tight mt-0.5">Grand Meridian Gala</h4>
                  </div>
                  <div className="text-right">
                    <span className="inline-block font-mono text-[8px] font-bold uppercase border border-copper/50 text-copper px-1.5 py-0.5">
                      VIP ADMIT
                    </span>
                  </div>
                </div>

                {/* Ticket Details */}
                <div className="grid grid-cols-2 gap-3 text-[10px] font-mono mb-4 text-muted-foreground">
                  <div>
                    <span className="block text-[8px] text-muted-foreground/50">GUEST</span>
                    <span className="font-bold text-foreground">Alexandra Harris</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-muted-foreground/50">SEAT</span>
                    <span className="font-bold text-foreground">Table 7 · Seat A</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-muted-foreground/50">PARTY</span>
                    <span className="font-bold text-foreground">Party of 2 (Dual Entry)</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-muted-foreground/50">INVITE ID</span>
                    <span className="font-bold text-foreground">CRN-7H2K-9P</span>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="flex justify-center py-4 border-y border-dashed border-border/60 bg-lead/5 relative">
                  
                  {/* Backdrop blur effect depending on scan outcome */}
                  <AnimatePresence mode="wait">
                    {scanState === 'ADMITTED' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xs flex flex-col items-center justify-center text-emerald-400 z-10 border border-emerald-500/30"
                      >
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-1" />
                        <span className="font-mono text-[11px] font-bold tracking-widest">ADMITTED</span>
                        <span className="font-mono text-[8px] opacity-80 mt-0.5">Checked In OK // Party of 2</span>
                        <button
                          onClick={resetSimulator}
                          className="mt-3 font-mono text-[8px] text-emerald-400 border border-emerald-400/40 hover:bg-emerald-400/10 px-2.5 py-1 uppercase"
                        >
                          Reset Gate
                        </button>
                      </motion.div>
                    )}

                    {scanState === 'DENIED' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-rose-950/90 backdrop-blur-xs flex flex-col items-center justify-center text-rose-400 z-10 border border-rose-500/30"
                      >
                        <XCircle className="w-8 h-8 text-rose-400 mb-1" />
                        <span className="font-mono text-[11px] font-bold tracking-widest">DENIED</span>
                        <span className="font-mono text-[8px] opacity-80 mt-0.5 text-center px-4">DUPLICATE PASS: Scanned 12m ago</span>
                        <button
                          onClick={resetSimulator}
                          className="mt-3 font-mono text-[8px] text-rose-400 border border-rose-400/40 hover:bg-rose-400/10 px-2.5 py-1 uppercase"
                        >
                          Reset Gate
                        </button>
                      </motion.div>
                    )}

                    {scanState === 'SCANNING' && (
                      <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                        <span className="font-mono text-[9px] text-copper animate-pulse tracking-widest">VERIFYING SIGNATURE...</span>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* QR Grid */}
                  <div className="border border-border/80 p-2 bg-white/90">
                    <div className="grid grid-cols-9 w-24 h-24 gap-px">
                      {Array(81).fill(0).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-full h-full",
                            [0,1,2,3,4,5,6,7,9,15,18,21,24,27,28,29,30,31,32,33,34,35,36,38,40,42,44,46,48,50,53,56,59,62,63,64,65,66,67,68,70,72,74,76].includes(i)
                              ? 'bg-ink' : 'bg-transparent'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-center text-muted-foreground/40 font-mono text-[8px] tracking-[0.2em]">
                  SECURED BY CRENELLE-SHIELD
                </div>
              </div>

              {/* Simulator Controls */}
              <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-border/40">
                <button
                  disabled={scanState === 'SCANNING'}
                  onClick={() => runSimulation('admit')}
                  className={cn(
                    "font-mono text-[10px] font-bold uppercase tracking-wider py-2.5 px-2 text-center transition-all cursor-pointer select-none border border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 disabled:opacity-50",
                  )}
                >
                  [Admit Scan]
                </button>
                <button
                  disabled={scanState === 'SCANNING'}
                  onClick={() => runSimulation('deny')}
                  className={cn(
                    "font-mono text-[10px] font-bold uppercase tracking-wider py-2.5 px-2 text-center transition-all cursor-pointer select-none border border-rose-500/30 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 disabled:opacity-50",
                  )}
                >
                  [Dup Scan]
                </button>
              </div>

              {/* Live Gate Scan Log history */}
              <div className="mt-5 pt-3 border-t border-border/40">
                <h5 className="font-mono text-[8.5px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center justify-between">
                  <span>Usher Terminal Log (Live)</span>
                  <span className="text-[7.5px] text-emerald-500 animate-pulse">● FEEDER_OK</span>
                </h5>
                <div className="space-y-1.5 max-h-[85px] overflow-y-auto pr-1">
                  {simHistory.map((item) => (
                    <div key={item.id} className="font-mono text-[8.5px] flex items-start gap-2 border-b border-border/10 pb-1">
                      <span className="text-muted-foreground/60">{item.time}</span>
                      <span className={item.status === 'SUCCESS' ? 'text-emerald-500' : 'text-rose-500'}>
                        {item.status === 'SUCCESS' ? '✓' : '✗'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-foreground block truncate leading-none mb-0.5">{item.name}</span>
                        <span className="text-muted-foreground text-[7.5px] block truncate">{item.note}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ── USE CASES STRIP (MARQUEE) ── */}
      <section id="uses" className="border-y border-border py-4.5 overflow-hidden bg-card/25 relative">
        <div className="absolute top-0 bottom-0 left-0 w-20 bg-linear-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-20 bg-linear-to-l from-background to-transparent z-10 pointer-events-none" />
        
        <div className="animate-marquee flex items-center">
          {Array(2).fill(0).map((_, i) => (
            <div key={i} className="flex items-center shrink-0">
              {useCases.map(uc => (
                <span key={uc} className="font-display italic text-lg sm:text-2xl text-muted-foreground/75 mx-12 whitespace-nowrap flex items-center gap-5">
                  {uc}
                  <span className="w-1.5 h-1.5 bg-copper/40 inline-block not-italic" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── INTERACTIVE FEATURE TERMINAL CONSOLE ── */}
      <section id="console" className="py-24 px-6 md:px-12 border-b border-border relative">
        <div className="max-w-7xl mx-auto">
          
          <div className="mb-14 border-b border-border/40 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.3em] text-copper mb-3">
                SYSTEM FEATURES CONSOLE // DEV-MODE
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-semibold leading-none tracking-tight">
                Inspect System <span className="italic font-light">Capabilities.</span>
              </h2>
            </div>
            
            <div className="font-mono text-[10px] text-muted-foreground bg-lead/20 border border-border/60 px-4 py-2 rounded">
              SELECT MODULE ON TERMINAL BOX BELOW ↴
            </div>
          </div>

          {/* Interactive Terminal */}
          <div className="border border-border bg-card rounded overflow-hidden grid grid-cols-1 lg:grid-cols-[240px_1fr] relative">
            {/* Terminal Left Sidebar (Tab Selectors) */}
            <div className="border-r border-border bg-lead/30 p-3 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible scrollbar-none">
              
              <div className="hidden lg:block font-mono text-[8px] text-muted-foreground/50 uppercase tracking-widest px-3 mb-2">
                MODULE INDEX
              </div>

              {[
                { id: 'gate', label: 'THE GATE', num: '01', sub: 'Usher Scanner Client' },
                { id: 'dispatch', label: 'THE DISPATCH', num: '02', sub: 'Multi-Brand Comms' },
                { id: 'core', label: 'THE CORE', num: '03', sub: 'Tiers, Perks & Caps' },
                { id: 'squad', label: 'THE SQUAD', num: '04', sub: 'Team RLS Permissions' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={cn(
                    "flex-1 lg:flex-none text-left font-mono p-3 border transition-all cursor-pointer relative group flex flex-col justify-between min-w-[140px] lg:min-w-0 rounded",
                    activeTab === t.id
                      ? "border-copper bg-copper/5 text-copper"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-lead/40"
                  )}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="text-[10px] font-bold tracking-wider">{t.label}</span>
                    <span className="text-[8px] opacity-50 font-light">{t.num}</span>
                  </div>
                  <span className="text-[8px] opacity-60 block mt-1">{t.sub}</span>
                  
                  {activeTab === t.id && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-copper rounded-r hidden lg:block"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Terminal Tab Content Area */}
            <div className="p-6 md:p-8 bg-background flex flex-col justify-between min-h-[360px] relative">
              <div className="absolute top-0 right-0 font-mono text-[7px] text-muted-foreground/20 p-4 select-none">
                CRENELLE SYSTEMS CORP // SECURE_SHELL
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  {/* Gate Tab */}
                  {activeTab === 'gate' && (
                    <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-8">
                      <div className="space-y-4">
                        <span className="inline-block font-mono text-[8px] bg-copper/15 text-copper border border-copper/30 px-2 py-0.5 uppercase tracking-widest rounded">
                          Scans & Checks // Active Gate
                        </span>
                        <h3 className="font-display text-2xl font-semibold">Zero-Login Usher Scanning</h3>
                        <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                          Secure your entrance by provisioning temporary tokenised scanner links to door ushers. Scanners access gate clients directly via standard mobile browsers — requiring no accounts, downloads, or passwords.
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 font-mono text-[10px] text-foreground/80">
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-copper" />
                            Web Audio Feedback synth
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-copper" />
                            Fuzzy substring name searches
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-copper" />
                            Gate-by-gate check-in logs
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-copper" />
                            Strict concurrency locks
                          </li>
                        </ul>
                      </div>

                      {/* Mockup visualization */}
                      <div className="border border-border p-4 bg-card rounded font-mono text-[9px] space-y-3">
                        <div className="flex justify-between border-b border-border/40 pb-2">
                          <span className="font-bold text-copper">[USHER LINK ACTIVE]</span>
                          <span className="text-muted-foreground">Token: g1_4b8a</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="p-1.5 bg-background rounded flex items-center justify-between">
                            <span className="truncate">Search: "Harris"</span>
                            <span className="text-copper">Found: 1</span>
                          </div>
                          <div className="p-1.5 bg-background rounded flex items-center justify-between border border-emerald-500/20 text-emerald-500">
                            <span>Gate Total Checked In:</span>
                            <span className="font-bold">42 / 120</span>
                          </div>
                          <div className="p-1.5 bg-background rounded text-muted-foreground flex justify-between">
                            <span>Double-scan lock:</span>
                            <span className="text-emerald-500">ENGAGED</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dispatch Tab */}
                  {activeTab === 'dispatch' && (
                    <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-8">
                      <div className="space-y-4">
                        <span className="inline-block font-mono text-[8px] bg-copper/15 text-copper border border-copper/30 px-2 py-0.5 uppercase tracking-widest rounded">
                          Outgoing Comms // Resend API
                        </span>
                        <h3 className="font-display text-2xl font-semibold">Multi-Brand Comms & Tracking</h3>
                        <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                          Define unique sender profiles (display names, reply-to parameters) per brand or sub-event. Automatically inject secure one-click GDPR unsubscribe links into footers, and audit deliveries via Resend webhooks.
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 font-mono text-[10px] text-foreground/80">
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-copper" />
                            Custom Display Names / Reply-To
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-copper" />
                            Open, Click, and Bounce webhooks
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-copper" />
                            One-Click GDPR Unsub token
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-copper" />
                            Inline QR + attachments dispatch
                          </li>
                        </ul>
                      </div>

                      {/* Mockup visualization */}
                      <div className="border border-border p-4 bg-card rounded font-mono text-[9px] space-y-3">
                        <div className="flex justify-between border-b border-border/40 pb-2">
                          <span className="font-bold text-copper">[EMAIL AUDIT DISPATCH]</span>
                          <span className="text-muted-foreground">Active Profile</span>
                        </div>
                        <div className="space-y-1 bg-background p-2 rounded text-muted-foreground">
                          <div><span className="text-copper">From:</span> "Meridian Gala" &lt;noreply@crenelle.org&gt;</div>
                          <div><span className="text-copper">Reply:</span> organizers@meridian.com</div>
                          <div className="border-t border-border/20 mt-1.5 pt-1.5 text-[8px] flex justify-between">
                            <span>Webhook State:</span>
                            <span className="text-emerald-500 font-bold">DELIVERED (Open=true)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Core Tab */}
                  {activeTab === 'core' && (
                    <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-8">
                      <div className="space-y-4">
                        <span className="inline-block font-mono text-[8px] bg-copper/15 text-copper border border-copper/30 px-2 py-0.5 uppercase tracking-widest rounded">
                          Database Architecture // PostgreSQL Schema
                        </span>
                        <h3 className="font-display text-2xl font-semibold">Tiers, Perks & Waitlist Caps</h3>
                        <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                          Define granular ticket types (General, VIP) with specific currencies (NGN, USD), pricing structures, and seating limitations. Control attendee caps via triggers, promoting guests automatically from waitlists.
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 font-mono text-[10px] text-foreground/80">
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-copper" />
                            Unified Attendee Model database
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-copper" />
                            Multi-Currency (USD/NGN) Tiers
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-copper" />
                            DB-enforced registration limits
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-copper" />
                            Automated waitlist promotions
                          </li>
                        </ul>
                      </div>

                      {/* Mockup visualization */}
                      <div className="border border-border p-4 bg-card rounded font-mono text-[9px] space-y-3">
                        <div className="flex justify-between border-b border-border/40 pb-2">
                          <span className="font-bold text-copper">[TIER SCHEMA STATE]</span>
                          <span className="text-muted-foreground">Currency: NGN / USD</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between bg-background p-1.5 rounded">
                            <span>VIP (₦150,000)</span>
                            <span className="text-emerald-500 font-bold">25 / 50 sold</span>
                          </div>
                          <div className="flex justify-between bg-background p-1.5 rounded border border-amber-500/20">
                            <span>Early Bird ($50)</span>
                            <span className="text-amber-500 font-bold">CAP REACHED</span>
                          </div>
                          <div className="flex justify-between bg-background p-1.5 rounded text-[8px]">
                            <span>Waitlist Queue:</span>
                            <span className="text-copper">14 pending spots</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Squad Tab */}
                  {activeTab === 'squad' && (
                    <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-8">
                      <div className="space-y-4">
                        <span className="inline-block font-mono text-[8px] bg-copper/15 text-copper border border-copper/30 px-2 py-0.5 uppercase tracking-widest rounded">
                          Authentication & RLS // Security Model
                        </span>
                        <h3 className="font-display text-2xl font-semibold">Row-Level Security Roles</h3>
                        <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                          Collaborate securely with event partners. Delegate co-host permissions across roles: Viewers (read-only), Scanner Managers (usher control), and Co-Organisers (full guest modifications), enforced natively by database RLS.
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 font-mono text-[10px] text-foreground/80">
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-copper" />
                            Supabase Auth cookies (SSR)
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-copper" />
                            Co-host role memberships
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-copper" />
                            Row Level Security policies
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-copper" />
                            Co-hosting dashboard grids
                          </li>
                        </ul>
                      </div>

                      {/* Mockup visualization */}
                      <div className="border border-border p-4 bg-card rounded font-mono text-[9px] space-y-3">
                        <div className="flex justify-between border-b border-border/40 pb-2">
                          <span className="font-bold text-copper">[RLS MEMBERSHIP MAP]</span>
                          <span className="text-muted-foreground">Co-Host Access</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="p-1.5 bg-background rounded flex justify-between">
                            <span>owner_id = auth.uid()</span>
                            <span className="text-emerald-500">FULL_GRANT</span>
                          </div>
                          <div className="p-1.5 bg-background rounded flex justify-between">
                            <span>role: scanner_manager</span>
                            <span className="text-copper">SCANNER_CRUD</span>
                          </div>
                          <div className="p-1.5 bg-background rounded flex justify-between">
                            <span>role: viewer</span>
                            <span className="text-muted-foreground">READ_ONLY</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Console Command Footer */}
              <div className="mt-8 pt-4 border-t border-border/40 flex items-center justify-between text-muted-foreground font-mono text-[9px]">
                <span>SELECT * FROM event_members WHERE member_id = auth.uid()</span>
                <span>SECURED CORE</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── INDUSTRIAL CONVEYOR PROCESS TIMELINE ── */}
      <section id="process" className="py-24 px-6 md:px-12 border-b border-border relative overflow-hidden bg-lead/5">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex items-baseline gap-6 mb-16">
            <h2 className="font-display italic font-light text-4xl md:text-5xl text-foreground">
              The Process <span className="not-italic font-semibold">Workflow</span>
            </h2>
            <div className="flex-1 h-px bg-border/80" />
            <span className="font-mono text-[9px] text-muted-foreground">LIFECYCLE LOGS // 01-04</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                num: '01 / CONFIG',
                title: 'Draft & Set Tiers',
                body: 'Configure event details, pricing tiers, currency settings, and guest capacities. Customize multi-brand sender profiles for outbound emails.',
                status: 'STAGE_DRAFT'
              },
              {
                num: '02 / INVITATION',
                title: 'Import & Dispatch',
                body: 'Add attendees manually or import bulk CSVs. Send automated HTML emails with unique check-in QR codes and unsubscribe tokens.',
                status: 'STAGE_PUBLISHED'
              },
              {
                num: '03 / EXECUTION',
                title: 'Live Scanning',
                body: 'Provision zero-login usher scanning URLs. Scanners admit guests in real-time, accompanied by synthesized sound confirmation.',
                status: 'STAGE_LIVE'
              },
              {
                num: '04 / CONCLUSION',
                title: 'Analytics & Cron Lock',
                body: 'Once the end time arrives, the automatic database cron locks all gates. Inspect live attendance logs and check-in peak analytics.',
                status: 'STAGE_ENDED'
              },
            ].map((step, index) => (
              <div
                key={index}
                className="bg-card border border-border/80 p-6 relative group hover:border-copper transition-all duration-300"
              >
                {/* Structural box details */}
                <div className="absolute top-0 right-0 font-mono text-[7px] text-muted-foreground/35 p-2 font-bold uppercase select-none">
                  {step.status}
                </div>
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-border/20 group-hover:bg-copper transition-colors" />

                <span className="font-mono text-[9px] font-bold text-copper tracking-[0.2em] block mb-4">
                  {step.num}
                </span>

                <div className="space-y-3">
                  <h3 className="font-display text-xl font-bold text-foreground">
                    {step.title}
                  </h3>
                  <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── CTA / ACTION COMMAND SECTION ── */}
      <section className="py-28 px-6 md:px-12 relative overflow-hidden bg-background">
        
        {/* Background mechanical graphic */}
        <div className="absolute inset-0 flex items-center justify-center font-display font-black text-foreground/2 pointer-events-none select-none text-[32vw] tracking-tighter leading-none z-0">
          GATE
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-copper">
            LOCK DOWN YOUR ACCESS PROTOCOLS // START NOW
          </p>
          
          <h2 className="font-display font-semibold text-foreground text-4xl sm:text-6xl xl:text-7xl leading-[0.95] tracking-tight">
            Stop Uninvited <span className="italic font-light">Guests.</span><br />
            Secure Your <span className="text-copper">Venue Door.</span>
          </h2>

          <p className="font-mono text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed border-y border-border/40 py-4">
            Provision invitations, authorize entry codes, track check-ins live. Setup takes minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 items-center justify-center pt-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-3 bg-foreground text-background font-mono text-xs font-bold uppercase tracking-[0.2em] px-10 py-5 hover:bg-copper hover:text-white transition-all shadow-[6px_6px_0_0_rgba(191,132,48,0.25)] hover:shadow-none hover:translate-x-15 hover:translate-y-1.5 relative group cursor-pointer"
            >
              Create Free Account
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <p className="font-mono text-[8.5px] text-muted-foreground/60 tracking-wider">
            NO CREDIT CARD REQUIRED // FULL SYSTEM ACCESS INSTANTLY
          </p>
        </div>
      </section>

      {/* ── COMMAND FOOTER ── */}
      <footer className="border-t border-border py-12 px-6 md:px-12 bg-card/60 relative">
        <div className="absolute top-0 left-0 w-4 h-px bg-copper/40" />
        <div className="absolute top-0 right-0 w-4 h-px bg-copper/40" />
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 border border-copper/50 flex items-center justify-center bg-background rounded">
              <QrCode className="w-4 h-4 text-copper" />
            </div>
            <div>
              <span className="font-display text-sm font-bold tracking-[0.25em] uppercase text-muted-foreground">
                Crenelle
              </span>
              <span className="block font-mono text-[8px] text-muted-foreground/50 tracking-widest mt-0.5">
                © 2026 CRENELLE SECURITY SERVICES. ALL RIGHTS RESERVED.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-8">
            {[
              ['#console', 'Console System'],
              ['#process', 'Operational Pipeline'],
              ['/login', 'Portal Access'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-copper transition-colors"
              >
                {label}
              </a>
            ))}
          </div>

        </div>
      </footer>

    </div>
  )
}
