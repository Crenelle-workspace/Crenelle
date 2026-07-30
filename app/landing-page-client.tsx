"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  QrCode,
  ArrowRight,
  Clock,
  Smartphone,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";
import { TiltEventCard } from "@/components/landing/tilt-event-card";
import { InteractiveTicketStack } from "@/components/landing/interactive-ticket-stack";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { ProcessTimeline } from "@/components/landing/process-timeline";

interface LandingPageClientProps {
  user: unknown;
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
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 90,
      damping: 15,
    },
  },
};

export function LandingPageClient({ user }: LandingPageClientProps) {
  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden relative selection:bg-copper/30 selection:text-white font-['Inter',ui-sans-serif,system-ui,sans-serif]">
      {/* Immersive background mesh glows */}
      <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-copper/8 dark:bg-copper/5 blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-[25%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-amber-500/6 dark:bg-amber-50/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[10%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-copper-light/5 dark:bg-copper-light/3 blur-[160px] pointer-events-none z-0" />

      {/* Grid structure overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[6rem_6rem] opacity-35 dark:opacity-10 pointer-events-none z-0" />

      {/* ── HEADER ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-5 border-b border-border/45 bg-background/60 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
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
          </Link>

          <div className="hidden md:flex items-center gap-8 font-semibold text-xs">
            {[
              ["#showcase", "Showcase"],
              ["#features", "Features"],
              ["#process", "Process"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-muted-foreground hover:text-foreground transition-colors relative group py-1"
              >
                {label}
                <span className="absolute bottom-0 left-0 w-0 h-px bg-copper group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <ModeToggle />
            <Link
              href={user ? "/events" : "/login"}
              className="inline-flex items-center justify-center rounded-full bg-foreground text-background font-sans text-xs font-bold px-6 py-2.5 hover:bg-copper hover:text-white transition-colors duration-300"
            >
              {user ? "Go to Dashboard" : "Sign In"}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── IMMERSIVE SPACIOUS SPLIT HERO SECTION ── */}
      <section
        id="hero"
        className="min-h-screen pt-36 pb-20 px-6 md:px-12 flex flex-col justify-center relative z-10 max-w-7xl mx-auto w-full overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full text-center lg:text-left">
          {/* Left Column: Heading copy */}
          <div className="lg:col-span-7 space-y-8 flex flex-col justify-center items-center lg:items-start max-w-2xl mx-auto lg:mx-0">
            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-5xl sm:text-6xl lg:text-7xl  font-black leading-[1.02] tracking-tight text-foreground"
            >
              Gathering is an art.
              <br />
              Host it flawlessly.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed"
            >
              Crenelle is the elegant toolkit for premium event hosting. Design
              custom ticket pages, collect payouts via Paystack, broadcast
              branded email invites, and manage door check-ins with ease.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 items-center justify-center lg:justify-start w-full sm:w-auto pt-2"
            >
              <Link
                href={user ? "/events" : "/login"}
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

          {/* Right Column: Fanning VIP & Regular passes */}
          <div className="lg:col-span-5 flex justify-center items-center relative min-h-90 lg:min-h-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3, type: "spring" }}
              className="w-full flex justify-center"
            >
              <InteractiveTicketStack />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── EVENT FORMAT BENTO GRID SHOWCASE ── */}
      <section
        id="showcase"
        className="py-24 px-6 md:px-12 relative border-t border-border/40"
      >
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="max-w-xl space-y-4">
            <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tight text-foreground">
              Designed for every format.
            </h2>
            <p className="text-sm text-muted-foreground">
              From creative salons to keynote summits, Crenelle adapts to how
              you bring people together.
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
                <h3 className="text-xl font-bold font-sans text-stone-100">
                  Creative Salons & Exhibitions
                </h3>
                <p className="text-xs text-stone-300/80 leading-relaxed max-w-md">
                  Design clean event cards that act as a canvas, framing your
                  exhibition details with clean spacing.
                </p>
              </TiltEventCard>
            </motion.div>

            {/* Cell 2: Raves (Spans 1 column) */}
            <motion.div variants={itemVariants} className="md:col-span-1">
              <TiltEventCard imageUrl="https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?auto=format&fit=crop&w=800&q=80">
                <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full inline-block">
                  Late Night
                </span>
                <h3 className="text-xl font-bold font-sans text-stone-100">
                  Warehouse Raves & Concerts
                </h3>
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
                <h3 className="text-xl font-bold font-sans text-stone-100">
                  Founders&apos; Dinners &amp; Feasts
                </h3>
                <p className="text-xs text-stone-300/80 leading-relaxed">
                  Broadcast personalized invitations directly to your guest
                  list.
                </p>
              </TiltEventCard>
            </motion.div>

            {/* Cell 4: Workshops (Spans 2 columns) */}
            <motion.div variants={itemVariants} className="md:col-span-2">
              <TiltEventCard imageUrl="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80">
                <span className="text-[9px] uppercase font-bold tracking-wider text-copper bg-copper/10 border border-copper/20 px-2.5 py-0.5 rounded-full inline-block">
                  Classes
                </span>
                <h3 className="text-xl font-bold font-sans text-stone-100">
                  Workshops & Panels
                </h3>
                <p className="text-xs text-stone-300/80 leading-relaxed max-w-md">
                  Collect registration fees in NGN or USD with automatic
                  checkout validation settlements.
                </p>
              </TiltEventCard>
            </motion.div>

            {/* Cell 5: Keynotes (Spans 2 columns) */}
            <motion.div variants={itemVariants} className="md:col-span-2">
              <TiltEventCard imageUrl="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80">
                <span className="text-[9px] uppercase font-bold tracking-wider text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full inline-block">
                  Conferences
                </span>
                <h3 className="text-xl font-bold font-sans text-stone-100">
                  Technology Summits & Keynotes
                </h3>
                <p className="text-xs text-stone-300/80 leading-relaxed max-w-xl">
                  Coordinate large-scale registrations and automatically manage
                  active capacity limits with waitlist triggers.
                </p>
              </TiltEventCard>
            </motion.div>

            {/* Cell 6: Brunches (Spans 1 column) */}
            <motion.div variants={itemVariants} className="md:col-span-1">
              <TiltEventCard imageUrl="https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80">
                <span className="text-[9px] uppercase font-bold tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full inline-block">
                  Socials
                </span>
                <h3 className="text-xl font-bold font-sans text-stone-100">
                  Private Brunches & Meetups
                </h3>
                <p className="text-xs text-stone-300/80 leading-relaxed">
                  Design stylish weekend tables and social registration pages
                  for your guests.
                </p>
              </TiltEventCard>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── CAPABILITIES BENTO SHOWCASE ── */}
      <section
        id="features"
        className="py-32 px-6 md:px-12 relative border-t border-border/4"
      >
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="max-w-xl space-y-4">
            <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tight text-foreground">
              Highlights of the Crenelle suite.
            </h2>
            <p className="text-sm text-muted-foreground">
              A carefully crafted toolkit to configure event forms, secure
              tickets, collect globally, and authorize door access.
            </p>
          </div>

          <FeaturesGrid />
        </div>
      </section>

      {/* ── ACCESS SCANNER INFO ── */}
      <section
        id="process"
        className="py-32 px-6 md:px-12 relative border-b border-border/40 bg-card/10 dark:bg-[#0A0908]/20 overflow-hidden"
      >
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[2rem_2rem] opacity-30 dark:opacity-10 pointer-events-none z-0" />

        <div className="max-w-7xl mx-auto space-y-16 relative z-10 text-center">
          {/* Centered Heading */}
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tight text-foreground">
              One-click usher scan clients.
              <br />
              <span className="text-copper">No passwords required.</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Empower your door staff without password configurations. Generate
              temporary, secure links that load scanner cameras inside standard
              web browsers on any mobile device.
            </p>
          </div>

          {/* Staggered grid of Masked Image Cards representing features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full pt-4">
            {[
              {
                icon: Smartphone,
                title: "Zero Configuration",
                desc: "Usher scan links load instantly in any mobile browser.",
                image:
                  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80",
                maskClass: "rounded-3xl rounded-bl-[4rem]",
                hoverOffset: -8,
              },
              {
                icon: ShieldCheck,
                title: "Double-Entry Shield",
                desc: "Automatically prevent duplicate or re-scanned tickets.",
                image:
                  "https://images.unsplash.com/photo-1590608897129-79da98d15969?auto=format&fit=crop&w=600&q=80",
                maskClass: "rounded-3xl rounded-tr-[4.5rem]",
                hoverOffset: -12,
              },
              {
                icon: Activity,
                title: "Live Coordinator Hub",
                desc: "Sync check-in statuses in real-time across multiple gates.",
                image:
                  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
                maskClass: "rounded-3xl rounded-br-[4.5rem]",
                hoverOffset: -8,
              },
              {
                icon: Clock,
                title: "Dynamic Expiry",
                desc: "Scan links invalidate automatically when gates close.",
                image:
                  "https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=600&q=80",
                maskClass: "rounded-3xl rounded-tl-[4rem]",
                hoverOffset: -12,
              },
            ].map((feat, index) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={index}
                  whileHover={{ y: feat.hoverOffset, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={cn(
                    "overflow-hidden border border-border/40 dark:border-border/10 bg-stone-900 shadow-2xl relative h-76 flex flex-col justify-end p-5 select-none transition-colors duration-300 group cursor-pointer",
                    feat.maskClass,
                  )}
                >
                  {/* Masked Backdrop Image */}
                  <div className="absolute inset-0 z-0">
                    <Image
                      src={feat.image}
                      alt={feat.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover opacity-65 group-hover:opacity-50 group-hover:scale-105 transition-all duration-700 filter grayscale group-hover:grayscale-0"
                    />
                    {/* Bottom gradient fade */}
                    <div className="absolute inset-0 bg-linear-to-t from-stone-950 via-stone-950/40 to-stone-950/15 z-10" />
                  </div>

                  {/* Feature Content Overlay */}
                  <div className="relative z-20 text-left space-y-3">
                    <div className="w-8 h-8 rounded-lg bg-copper/10 border border-copper/20 flex items-center justify-center text-copper shadow-xs">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-foreground tracking-tight">
                        {feat.title}
                      </h3>
                      <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
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
            <span className="font-sans text-xs text-muted-foreground/70 font-semibold tracking-wider uppercase">
              STEPS 01 - 04
            </span>
          </div>

          <ProcessTimeline />
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
            Focus on gathering.
            <br />
            We’ll manage the door.
          </h2>
          <p className="text-base text-muted-foreground max-w-lg mx-auto">
            Design spaces, manage capacities, collect payments, and welcome
            guests with absolute ease. Set up takes less than five minutes.
          </p>

          <div className="pt-4">
            <Link
              href={user ? "/events" : "/login"}
              className="inline-flex items-center gap-2 bg-foreground text-background text-sm font-bold px-10 py-4.5 rounded-full hover:bg-copper hover:text-white transition-all duration-300 shadow-xl shadow-black/10 dark:shadow-black/30"
            >
              Start Hosting for Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <span className="block font-sans text-xs text-muted-foreground/60 font-medium">
            No credit card required. Free to get started.
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
              <span className="block font-sans text-xs text-muted-foreground/60 mt-1">
                © 2026 Crenelle. All rights reserved.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-8 font-semibold text-xs">
            {[
              ["#hero", "Overview"],
              ["#showcase", "Showcase"],
              ["#features", "Features"],
              ["#process", "How It Works"],
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
  );
}
