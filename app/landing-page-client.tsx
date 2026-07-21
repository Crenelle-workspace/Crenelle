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

// ── 3D Card Proximity Tilt and Glare Wrapper (Event Showcase cards) ──
function TiltEventCard({ children, imageUrl, className, bgClass }: { children: React.ReactNode; imageUrl: string; className?: string; bgClass?: string }) {
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

    const percentX = (mouseX / width) - 0.5
    const percentY = (mouseY / height) - 0.5

    setRotateX(-percentY * 8)
    setRotateY(percentX * 8)

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
          scale: isHovered ? 1.01 : 1,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={cn(
          "relative rounded-3xl border border-border/40 dark:border-border/10 overflow-hidden min-h-[320px] flex flex-col justify-end p-6 select-none shadow-[0_8px_30px_rgba(0,0,0,0.015)] dark:shadow-none transition-colors duration-300 w-full group",
          bgClass,
          className
        )}
      >
        {/* Background Event Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={imageUrl}
            alt="Event cover banner"
            className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-102 transition-all duration-700"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/50 to-black/10 z-10" />
        </div>

        {/* Glare sheen */}
        {isHovered && (
          <div
            className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle 200px at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.08), transparent 85%)`,
            }}
          />
        )}

        {/* Dynamic Card Content Overlaid on Dark Gradient */}
        <div className="relative z-20 text-stone-100 space-y-2 text-left">
          {children}
        </div>
      </motion.div>
    </div>
  )
}

// ── Bento Border Spotlight Glow Card (Features Cards) ──
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
              ['#showcase', 'Showcase'],
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

      {/* ── IMMERSIVE SPACIOUS HERO SECTION ── */}
      <section id="hero" className="min-h-[85vh] pt-32 pb-20 px-6 md:px-12 flex flex-col items-center justify-center text-center relative z-10 max-w-5xl mx-auto w-full">
        <div className="space-y-8">
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-black leading-[1.02] tracking-tight text-foreground"
          >
            Gathering is an art.<br />
            Host it flawlessly.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Crenelle is the elegant toolkit for premium event hosting. Design custom ticket pages, collect payouts via Paystack, broadcast branded email invites, and manage door check-ins with ease.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-4"
          >
            <Link
              href={user ? '/events' : '/login'}
              className="inline-flex items-center gap-2.5 bg-foreground text-background text-xs font-bold px-8 py-3.5 rounded-full hover:bg-copper hover:text-white transition-all duration-300 shadow-lg shadow-black/5"
            >
              Create Your Event
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#showcase"
              className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground px-5 py-3 transition-colors duration-300"
            >
              Explore formats
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── EVENT FORMAT BENTO GRID SHOWCASE ── */}
      <section id="showcase" className="py-24 px-6 md:px-12 relative border-t border-border/40">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="max-w-xl space-y-4">
            <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tight text-foreground">
              Designed for every format.
            </h2>
            <p className="text-sm text-muted-foreground">
              From creative salons to keynote summits, Crenelle adapts to how you bring people together.
            </p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full"
          >
            {/* Cell 1: Salons (Spans 2 columns) */}
            <motion.div variants={itemVariants} className="md:col-span-2">
              <TiltEventCard imageUrl="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=800&q=80">
                <span className="text-[9px] uppercase font-bold tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full inline-block">
                  Art & Culture
                </span>
                <h3 className="text-xl font-bold font-sans text-stone-100">Creative Salons & Exhibitions</h3>
                <p className="text-xs text-stone-300/80 leading-relaxed max-w-md">
                  Design clean event cards that act as a canvas, framing your exhibition details with clean spacing.
                </p>
              </TiltEventCard>
            </motion.div>

            {/* Cell 2: Raves (Spans 1 column) */}
            <motion.div variants={itemVariants} className="md:col-span-1">
              <TiltEventCard imageUrl="https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?auto=format&fit=crop&w=800&q=80">
                <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full inline-block">
                  Late Night
                </span>
                <h3 className="text-xl font-bold font-sans text-stone-100">Warehouse Raves & Concerts</h3>
                <p className="text-xs text-stone-300/80 leading-relaxed font-mono">
                  Secure ticketing with strict double-scan protection.
                </p>
              </TiltEventCard>
            </motion.div>

            {/* Cell 3: Dinners (Spans 1 column) */}
            <motion.div variants={itemVariants} className="md:col-span-1">
              <TiltEventCard imageUrl="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80">
                <span className="text-[9px] uppercase font-bold tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full inline-block">
                  Banquets
                </span>
                <h3 className="text-xl font-bold font-sans text-stone-100">Founders' Dinners & Feasts</h3>
                <p className="text-xs text-stone-300/80 leading-relaxed">
                  Broadcast personalized invitations directly to your guest list.
                </p>
              </TiltEventCard>
            </motion.div>

            {/* Cell 4: Workshops (Spans 2 columns) */}
            <motion.div variants={itemVariants} className="md:col-span-2">
              <TiltEventCard imageUrl="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80">
                <span className="text-[9px] uppercase font-bold tracking-wider text-copper bg-copper/10 border border-copper/20 px-2.5 py-0.5 rounded-full inline-block">
                  Classes
                </span>
                <h3 className="text-xl font-bold font-sans text-stone-100">Workshops & Panels</h3>
                <p className="text-xs text-stone-300/80 leading-relaxed max-w-md">
                  Collect registration fees in NGN or USD with automatic checkout validation settlements.
                </p>
              </TiltEventCard>
            </motion.div>

            {/* Cell 5: Keynotes (Spans 2 columns) */}
            <motion.div variants={itemVariants} className="md:col-span-2">
              <TiltEventCard imageUrl="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80">
                <span className="text-[9px] uppercase font-bold tracking-wider text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full inline-block">
                  Conferences
                </span>
                <h3 className="text-xl font-bold font-sans text-stone-100">Technology Summits & Keynotes</h3>
                <p className="text-xs text-stone-300/80 leading-relaxed max-w-xl">
                  Coordinate large-scale registrations and automatically manage active capacity limits with waitlist triggers.
                </p>
              </TiltEventCard>
            </motion.div>

            {/* Cell 6: Brunches (Spans 1 column) */}
            <motion.div variants={itemVariants} className="md:col-span-1">
              <TiltEventCard imageUrl="https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80">
                <span className="text-[9px] uppercase font-bold tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full inline-block">
                  Socials
                </span>
                <h3 className="text-xl font-bold font-sans text-stone-100">Private Brunches & Meetups</h3>
                <p className="text-xs text-stone-300/80 leading-relaxed">
                  Design stylish weekend tables and social registration pages for your guests.
                </p>
              </TiltEventCard>
            </motion.div>
          </motion.div>
          
        </div>
      </section>

      {/* ── CAPABILITIES BENTO SHOWCASE ── */}
      <section id="features" className="py-32 px-6 md:px-12 relative border-t border-border/4">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="max-w-xl space-y-4">
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
              ['#showcase', 'Showcase'],
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
