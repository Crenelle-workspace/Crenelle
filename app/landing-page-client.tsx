'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  QrCode,
  ArrowRight,
  Shield,
  Mail,
  Users,
  CreditCard,
  Sparkles,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  ArrowUpRight
} from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import { cn } from '@/lib/utils'

interface LandingPageClientProps {
  user: any
}

// ── Showcase events featuring high-fidelity photography ──
const EVENT_SAMPLES = {
  salon: {
    title: 'Aesthetics & The Human Form',
    date: 'Friday, Oct 12 · 7:00 PM',
    price: '$50',
    type: 'Art Exhibition',
    bgClass: 'bg-stone-105 dark:bg-[#181614] border-stone-200 dark:border-stone-850 text-stone-900 dark:text-stone-100',
    accentClass: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/15',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=400&q=80',
  },
  dinner: {
    title: 'The Founders’ Roundtable',
    date: 'Thursday, Sep 28 · 6:30 PM',
    price: '$120',
    type: 'Private Dinner',
    bgClass: 'bg-amber-50/70 dark:bg-[#191714] border-amber-900/10 dark:border-amber-900/30 text-amber-950 dark:text-amber-100/90',
    accentClass: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/15',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
  },
  rave: {
    title: 'CYBERNETIC WAREHOUSE 09',
    date: 'Saturday, Nov 03 · 11:00 PM',
    price: '$25',
    type: 'Music Gathering',
    bgClass: 'bg-zinc-100 dark:bg-[#111111] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100',
    accentClass: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/15',
    imageUrl: 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?auto=format&fit=crop&w=400&q=80',
  },
}

// ── Motion Variants for Staggered Load-Ins ──
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 90,
      damping: 15,
    },
  },
}

// ── 3D Card Proximity Tilt and Glare Wrapper ──
function TiltEventCard({ children, className, bgClass }: { children: React.ReactNode; className?: string; bgClass?: string }) {
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [glareX, setGlareX] = useState(50)
  const [glareY, setGlareY] = useState(50)
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Percentages relative to center (-0.5 to 0.5)
    const percentX = (mouseX / width) - 0.5
    const percentY = (mouseY / height) - 0.5

    // Slight 3D rotation angles
    setRotateX(-percentY * 10)
    setRotateY(percentX * 10)

    // Glare coordinates
    setGlareX((mouseX / width) * 100)
    setGlareY((mouseY / height) * 100)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setRotateX(0)
    setRotateY(0)
  }

  return (
    <div
      className="perspective-1000 w-full"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        animate={{
          rotateX: isHovered ? rotateX : 0,
          rotateY: isHovered ? rotateY : 0,
          scale: isHovered ? 1.015 : 1,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(
          "relative rounded-3xl border p-5 select-none shadow-[0_8px_30px_rgba(0,0,0,0.015)] dark:shadow-none transition-colors duration-300 w-full overflow-hidden",
          bgClass,
          className
        )}
      >
        {/* Glossy Sheen Overlay */}
        {isHovered && (
          <div
            className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle 140px at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.08), transparent 85%)`,
            }}
          />
        )}
        {children}
      </motion.div>
    </div>
  )
}

// ── Bento Border Spotlight Glow Card ──
function SpotlightCard({ children, className, bgClass }: { children: React.ReactNode; className?: string; bgClass?: string }) {
  const [mouseX, setMouseX] = useState(0)
  const [mouseY, setMouseY] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    setMouseX(e.clientX - rect.left)
    setMouseY(e.clientY - rect.top)
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative rounded-3xl border border-border/40 dark:border-border/10 p-6 flex flex-col justify-between overflow-hidden bg-card hover:border-copper/30 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.015)] dark:shadow-none",
        bgClass,
        className
      )}
    >
      {/* Moving Border Spotlight Glow */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px rounded-3xl border border-transparent z-10 transition-opacity duration-300"
          style={{
            background: `radial-gradient(140px circle at ${mouseX}px ${mouseY}px, rgba(191, 132, 48, 0.12), transparent 80%)`,
          }}
        />
      )}
      {children}
    </div>
  )
}

export function LandingPageClient({ user }: LandingPageClientProps) {
  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden relative selection:bg-copper/30 selection:text-white font-['Inter',_ui-sans-serif,_system-ui,_sans-serif]">
      
      {/* Immersive background mesh glows */}
      <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-copper/[0.08] dark:bg-copper/5 blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-[25%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-amber-500/[0.06] dark:bg-amber-50/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[10%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-copper-light/[0.05] dark:bg-copper-light/3 blur-[160px] pointer-events-none z-0" />

      {/* Grid structure overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[6rem_6rem] opacity-35 dark:opacity-10 pointer-events-none z-0" />

      {/* ── HEADER ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-5 border-b border-border/45 bg-background/60 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center text-background group-hover:rotate-12 transition-transform duration-500">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-xl font-bold tracking-tight leading-none text-foreground">
                crenelle
              </span>
              <span className="font-mono text-[8px] text-muted-foreground/60 tracking-wider mt-0.5">
                CREATIVE EVENT SUITE
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8 font-semibold text-xs">
            {[
              ['#hero', 'Overview'],
              ['#features', 'Features'],
              ['#process', 'Process'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-muted-foreground hover:text-foreground transition-colors relative group py-1"
              >
                {label}
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-copper group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <ModeToggle />
            <Link
              href={user ? '/events' : '/login'}
              className="inline-flex items-center justify-center rounded-full bg-foreground text-background font-sans text-xs font-bold px-6 py-2.5 hover:bg-copper hover:text-white transition-colors duration-300"
            >
              {user ? 'Go to Dashboard' : 'Sign In'}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── BENTO GRID HERO SECTION ── */}
      <section id="hero" className="min-h-screen pt-32 pb-24 px-6 md:px-12 flex flex-col justify-center relative z-10 max-w-7xl mx-auto w-full">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full"
        >
          
          {/* Cell 1: Headline Box */}
          <motion.div variants={itemVariants} className="md:col-span-2 md:row-span-2">
            <SpotlightCard className="h-full min-h-[380px] md:min-h-full p-8 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 border border-copper/20 bg-copper/5 rounded-full font-mono text-[9px] uppercase tracking-wider text-copper">
                  <Sparkles className="w-3.5 h-3.5 text-copper" />
                  <span>The canvas for creative hosts</span>
                </div>
                
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight text-foreground">
                  Gathering is an art.<br />
                  Host it flawlessly.
                </h1>
                
                <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
                  Crenelle is the elegant toolkit for memorable event hosting. Design custom ticket tiers, collect payments via Paystack, send customized email invitations, and manage door check-ins with ease.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 mt-8 relative z-20">
                <Link
                  href={user ? '/events' : '/login'}
                  className="inline-flex items-center gap-2 bg-foreground text-background text-xs font-bold px-6 py-3 rounded-full hover:bg-copper hover:text-white transition-colors duration-300 shadow-md"
                >
                  Create Your Event
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground px-5 py-3 transition-colors duration-300"
                >
                  Explore features
                </a>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Cell 2: Salon Card */}
          <motion.div variants={itemVariants}>
            <TiltEventCard bgClass={EVENT_SAMPLES.salon.bgClass}>
              <div className="space-y-3">
                <div className="w-full h-24 rounded-2xl bg-stone-900/5 dark:bg-stone-900/50 relative overflow-hidden">
                  <img 
                    src={EVENT_SAMPLES.salon.imageUrl} 
                    alt={EVENT_SAMPLES.salon.title} 
                    className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105" 
                  />
                  <span className={cn("absolute bottom-2 left-2 text-[8px] font-bold px-2 py-0.5 rounded-full", EVENT_SAMPLES.salon.accentClass)}>
                    {EVENT_SAMPLES.salon.type}
                  </span>
                </div>
                <h3 className="text-sm font-bold tracking-tight leading-snug">{EVENT_SAMPLES.salon.title}</h3>
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-3 mt-2 border-t border-border/20 dark:border-border/10">
                <span>{EVENT_SAMPLES.salon.date.split(' · ')[0]}</span>
                <strong className="text-foreground">{EVENT_SAMPLES.salon.price}</strong>
              </div>
            </TiltEventCard>
          </motion.div>

          {/* Cell 3: Midnight Rave Card */}
          <motion.div variants={itemVariants}>
            <TiltEventCard bgClass={EVENT_SAMPLES.rave.bgClass}>
              <div className="space-y-3">
                <div className="w-full h-24 rounded-2xl bg-zinc-900/5 dark:bg-zinc-900/50 relative overflow-hidden">
                  <img 
                    src={EVENT_SAMPLES.rave.imageUrl} 
                    alt={EVENT_SAMPLES.rave.title} 
                    className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105" 
                  />
                  <span className={cn("absolute bottom-2 left-2 text-[8px] font-bold px-2 py-0.5 rounded-full", EVENT_SAMPLES.rave.accentClass)}>
                    {EVENT_SAMPLES.rave.type}
                  </span>
                </div>
                <h3 className="text-sm font-bold tracking-tight leading-snug font-mono">{EVENT_SAMPLES.rave.title}</h3>
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-3 mt-2 border-t border-border/20 dark:border-border/10 font-mono">
                <span>{EVENT_SAMPLES.rave.date.split(' · ')[0]}</span>
                <strong className="text-foreground">{EVENT_SAMPLES.rave.price}</strong>
              </div>
            </TiltEventCard>
          </motion.div>

          {/* Cell 4: Founders Dinner Card */}
          <motion.div variants={itemVariants}>
            <TiltEventCard bgClass={EVENT_SAMPLES.dinner.bgClass}>
              <div className="space-y-3">
                <div className="w-full h-24 rounded-2xl bg-amber-900/5 dark:bg-amber-900/50 relative overflow-hidden">
                  <img 
                    src={EVENT_SAMPLES.dinner.imageUrl} 
                    alt={EVENT_SAMPLES.dinner.title} 
                    className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105" 
                  />
                  <span className={cn("absolute bottom-2 left-2 text-[8px] font-bold px-2 py-0.5 rounded-full", EVENT_SAMPLES.dinner.accentClass)}>
                    {EVENT_SAMPLES.dinner.type}
                  </span>
                </div>
                <h3 className="text-sm font-bold tracking-tight leading-snug">{EVENT_SAMPLES.dinner.title}</h3>
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-3 mt-2 border-t border-border/20 dark:border-border/10">
                <span>{EVENT_SAMPLES.dinner.date.split(' · ')[0]}</span>
                <strong className="text-foreground">{EVENT_SAMPLES.dinner.price}</strong>
              </div>
            </TiltEventCard>
          </motion.div>

          {/* Cell 5: Gate Access Status */}
          <motion.div variants={itemVariants}>
            <SpotlightCard className="h-full min-h-[240px]">
              <div className="space-y-2">
                <span className="text-[8px] font-mono text-muted-foreground tracking-wider uppercase block">Door Coordinator Client</span>
                <div className="bg-background rounded-2xl p-3 border border-border/40 dark:border-border/10 flex items-center justify-between text-[11px] font-mono shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-foreground">Verified ticket</span>
                  </div>
                  <span className="text-emerald-500">ADMIT</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug pt-1">
                  Scanner links sync instantly with your organizer roster. No credentials or app setup required for staff.
                </p>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground pt-3 mt-2 border-t border-border/20 dark:border-border/10 font-mono">
                <span>Door 1 Sync</span>
                <strong className="text-foreground">142 / 150 Admitted</strong>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Cell 6: Waitlist Cap Status */}
          <motion.div variants={itemVariants}>
            <SpotlightCard className="h-full min-h-[240px]">
              <div className="space-y-2">
                <span className="text-[8px] font-mono text-amber-500 tracking-wider uppercase block">Capacity limits</span>
                <div className="space-y-1.5 font-sans">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Grand Gala Cap</span>
                    <span className="text-amber-500 font-mono">LOCKED</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-full" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug pt-1">
                  Enforce active capacity limits. Queue excess registrants into a waitlist and promote them as spots open.
                </p>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground pt-3 mt-2 border-t border-border/20 dark:border-border/10 font-mono">
                <span>Waitlist Queue</span>
                <strong className="text-amber-500 font-sans">14 pending spots</strong>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Cell 7: Paystack Gateway Cell */}
          <motion.div variants={itemVariants}>
            <SpotlightCard className="h-full min-h-[240px]">
              <div className="space-y-2">
                <span className="text-[8px] font-mono text-emerald-500 tracking-wider uppercase block">Payment gateway</span>
                <div className="flex items-center gap-3 pt-2">
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold leading-tight">Paystack Infrastructure</h4>
                    <span className="text-[9px] text-muted-foreground uppercase">NGN & USD Ticket payouts</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug pt-1">
                  Collect payments globally. Funds are automatically transferred directly to your bank account.
                </p>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground pt-3 mt-2 border-t border-border/20 dark:border-border/10 font-mono">
                <span>Transfers</span>
                <strong className="text-emerald-500 font-sans">Direct payout</strong>
              </div>
            </SpotlightCard>
          </motion.div>

        </motion.div>
      </section>

      {/* ── CAPABILITIES BENTO SHOWCASE ── */}
      <section id="features" className="py-32 px-6 md:px-12 relative border-t border-border/4">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="max-w-xl space-y-4">
            <span className="font-mono text-[9px] font-bold text-copper uppercase tracking-widest">
              Core Capabilities
            </span>
            <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tight text-foreground">
              Highlights of the Crenelle suite.
            </h2>
            <p className="text-sm text-muted-foreground">
              A carefully crafted toolkit to configure event forms, secure tickets, collect globally, and authorize door access.
            </p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            
            {/* Bento 1: Ticketing & Payments */}
            <motion.div variants={itemVariants}>
              <SpotlightCard className="min-h-[320px]">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-copper/10 flex items-center justify-center text-copper">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg">Paystack Infrastructure</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Sell tickets in NGN or USD depending on your event needs. Manage ticket tier pricing and verify checkout transactions automatically.
                    </p>
                  </div>
                </div>

                {/* High Fidelity Mock */}
                <div className="mt-6 border border-border/40 dark:border-border/10 rounded-xl p-4 bg-background/80 dark:bg-[#0A0908] space-y-3.5 shadow-xs">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-muted-foreground font-semibold">TICKET PRICING</span>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 rounded-full font-bold">SECURED</span>
                  </div>
                  <div className="space-y-1.5 font-sans">
                    <div className="flex justify-between text-xs">
                      <span>VIP Member Tier</span>
                      <strong className="text-foreground">₦150,000 / $120.00</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>General Admission</span>
                      <strong className="text-foreground">₦50,000 / $50.00</strong>
                    </div>
                  </div>
                  <div className="h-px bg-border/20 dark:bg-border/10" />
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Real-time billing checkout verification system</span>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>

            {/* Bento 2: Branded Communications */}
            <motion.div variants={itemVariants}>
              <SpotlightCard className="min-h-[320px]">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-copper/10 flex items-center justify-center text-copper">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg">Branded Outbox</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Set up custom sender display profiles and Reply-To parameters per event. Deliver invitations and verify delivery events via webhook metrics.
                    </p>
                  </div>
                </div>

                {/* High Fidelity Mock */}
                <div className="mt-6 border border-border/40 dark:border-border/10 rounded-xl p-4 bg-background/80 dark:bg-[#0A0908] space-y-3 font-sans shadow-xs">
                  <div className="space-y-1 text-[10px] border-b border-border/20 dark:border-border/10 pb-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">From Display Name:</span>
                      <strong className="text-foreground">"Grand Meridian"</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reply-To Address:</span>
                      <strong className="text-foreground">organizer@gala.com</strong>
                    </div>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded-lg text-[9px] font-mono text-zinc-400 leading-normal border border-zinc-900">
                    <span className="text-emerald-400">email.delivered</span> webhook dispatched to app database. 100% bounce-free audit logged.
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>

            {/* Bento 3: Waitlists & Registration Caps */}
            <motion.div variants={itemVariants}>
              <SpotlightCard className="min-h-[320px]">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-copper/10 flex items-center justify-center text-copper">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg">Capacity Waitlists</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enforce strict registration limits automatically. Automatically move waitlisted guests to active seats when space becomes available.
                    </p>
                  </div>
                </div>

                {/* High Fidelity Mock */}
                <div className="mt-6 border border-border/40 dark:border-border/10 rounded-xl p-4 bg-background/80 dark:bg-[#0A0908] space-y-3 font-sans shadow-xs">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-muted-foreground">REGISTRATION LOCK</span>
                    <span className="text-[9px] text-amber-600 dark:text-amber-400 border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded-full font-bold">CAP REACHED</span>
                  </div>
                  
                  {/* Visual meter */}
                  <div className="space-y-2">
                    <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 w-full" />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>120 / 120 Attendees</span>
                      <span className="text-amber-500 dark:text-amber-400 font-bold">14 on Waitlist</span>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* ── ACCESS SCANNER INFO ── */}
      <section id="process" className="py-32 px-6 md:px-12 relative border-b border-border/40 bg-card/20 dark:bg-[#0A0908]/40 overflow-hidden">
        
        {/* Subtle concert background photo overlay */}
        <div className="absolute inset-0 z-0 opacity-[0.015] dark:opacity-[0.03]">
          <img
            src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80"
            alt="Concert background"
            className="w-full h-full object-cover filter grayscale"
          />
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center relative z-10">
          
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-copper/20 bg-copper/5 rounded-full font-mono text-[10px] uppercase tracking-wider text-copper">
              <Shield className="w-3.5 h-3.5" />
              <span>Door Management Security</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black leading-tight tracking-tight text-foreground">
              One-click usher scan clients.<br />
              <span className="text-copper">No passwords required.</span>
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
              Empower your door staff without password configurations. Generate temporary, secure links that load scanner cameras inside standard web browsers on any mobile device.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 pt-4 text-xs font-semibold text-muted-foreground/80">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-copper shrink-0" />
                <span>Usher scan links load instantly on any mobile browser</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-copper shrink-0" />
                <span>Prevent duplicate entry passes automatically</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-copper shrink-0" />
                <span>Monitor live attendance on a shared dashboard</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-copper shrink-0" />
                <span>Secure check-in scanner links expire automatically</span>
              </div>
            </div>
          </div>

          {/* Mobile phone mockup preview */}
          <div className="flex justify-center">
            <SpotlightCard className="w-full max-w-[340px] p-5 shadow-2xl relative">
              <div className="flex justify-between items-center text-[9px] font-mono text-muted-foreground/60 border-b border-border/40 pb-3 mb-4">
                <span>GATE_CLIENT // TERMINAL_01</span>
                <span>STATE: ACTIVE</span>
              </div>

              {/* Scan viewport mockup */}
              <div className="bg-[#070605] border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between min-h-[320px] relative overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-40">
                  <img
                    src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80"
                    alt="Scan interface background"
                    className="w-full h-full object-cover blur-[2px]"
                  />
                </div>
                <div className="absolute inset-0 bg-[#070605]/85 z-0" />
                
                {/* Verified Screen Overlay */}
                <div className="absolute inset-0 bg-emerald-950/95 flex flex-col items-center justify-center text-emerald-400 z-10 border border-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                  <span className="text-xs font-bold tracking-wider">TICKET VERIFIED</span>
                  <span className="font-mono text-[10px] text-foreground font-bold mt-1">Alexandra Harris</span>
                  <span className="font-mono text-[8px] opacity-75 mt-0.5">VIP Admissions · Table 7</span>
                </div>
              </div>

              {/* Scan Logs */}
              <div className="mt-4 pt-3 border-t border-border/20 relative z-10">
                <span className="text-[8px] font-mono text-muted-foreground uppercase block mb-2">Gate Scan Log (Live)</span>
                <div className="space-y-1.5">
                  <div className="text-[9px] font-mono flex justify-between border-b border-border/10 dark:border-border/5 pb-1">
                    <span className="text-muted-foreground">22:15:30</span>
                    <strong className="text-foreground">Elena Rostova</strong>
                    <span className="text-emerald-500">ADMITTED</span>
                  </div>
                  <div className="text-[9px] font-mono flex justify-between border-b border-border/10 dark:border-border/5 pb-1">
                    <span className="text-muted-foreground">22:14:02</span>
                    <strong className="text-foreground">Marcus Sterling</strong>
                    <span className="text-emerald-500">ADMITTED</span>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </div>

        </div>
      </section>

      {/* ── PROCESS TIMELINE ── */}
      <section className="py-32 px-6 md:px-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-6">
            <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tight text-foreground">
              The hosting lifecycle.
            </h2>
            <span className="font-mono text-[9px] text-muted-foreground/60 tracking-wider">STAGES 01 - 04</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: '01',
                title: 'Set Tiers & Limits',
                desc: 'Configure pricing structures and capacity limits. Define USD or NGN payment parameters.'
              },
              {
                num: '02',
                title: 'Broadcast Invites',
                desc: 'Send personalized HTML emails containing secure access codes and unsubscribe links.'
              },
              {
                num: '03',
                title: 'Door Scanning',
                desc: 'Provision direct check-in links to doors. Validate attendee signatures in real-time.'
              },
              {
                num: '04',
                title: 'Inspect Statistics',
                desc: 'Audit gate check-in speeds and attendee metrics directly on your co-host dashboard.'
              },
            ].map((step, idx) => (
              <div key={idx} className="border border-border/40 dark:border-border/10 bg-card/30 p-6 rounded-2xl space-y-4 hover:border-copper/20 transition-colors duration-300">
                <span className="font-mono text-xs font-bold text-copper block">{step.num}</span>
                <h3 className="font-bold text-lg">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className="py-36 px-6 md:px-12 relative overflow-hidden text-center bg-background border-t border-border/40">
        
        {/* Ambient lighting overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
          <div className="w-[75vw] h-[25vw] rounded-full bg-copper/5 blur-[160px] translate-y-1/3" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto space-y-8">
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-copper">
            Join Creative Creators Everywhere
          </span>
          <h2 className="text-4xl sm:text-6xl font-black leading-[0.95] tracking-tight text-foreground">
            Focus on gathering.<br />
            We’ll manage the door.
          </h2>
          <p className="text-base text-muted-foreground max-w-lg mx-auto">
            Design spaces, manage capacities, collect payments, and welcome guests with absolute ease. Set up takes less than five minutes.
          </p>

          <div className="pt-4">
            <Link
              href={user ? '/events' : '/login'}
              className="inline-flex items-center gap-2 bg-foreground text-background text-sm font-bold px-10 py-4.5 rounded-full hover:bg-copper hover:text-white transition-all duration-300 shadow-xl shadow-black/10 dark:shadow-black/30"
            >
              Initialize Event Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <span className="block font-mono text-[9px] text-muted-foreground/50 tracking-wider">
            NO CREDIT CARD REQUIRED // FULL SYSTEM ACCESS
          </span>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/40 py-16 px-6 md:px-12 bg-card/40 relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center text-background">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <span className="font-sans text-lg font-bold tracking-tight text-foreground block leading-none">
                crenelle
              </span>
              <span className="block font-mono text-[8px] text-muted-foreground/60 tracking-wider mt-1">
                © 2026 CRENELLE SECURITY & TICKETING SERVICES. ALL RIGHTS RESERVED.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-8 font-semibold text-xs">
            {[
              ['#hero', 'Overview'],
              ['#features', 'Features Grid'],
              ['#process', 'Operational Pipeline'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-muted-foreground hover:text-foreground transition-colors"
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
