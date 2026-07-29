"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Compass,
  LayoutDashboard,
  Calendar,
  Home,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
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

export default function NotFound() {
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col justify-between overflow-x-hidden relative selection:bg-copper/30 selection:text-white font-['Inter',ui-sans-serif,system-ui,sans-serif]">
      {/* Immersive background mesh glows matching landing page */}
      <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-copper/8 dark:bg-copper/5 blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-[30%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-amber-500/6 dark:bg-amber-500/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-copper-light/5 dark:bg-copper-light/3 blur-[160px] pointer-events-none z-0" />

      {/* Grid structure overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[6rem_6rem] opacity-35 dark:opacity-10 pointer-events-none z-0" />

      {/* ── HEADER NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-4 border-b border-border/45 bg-background/60 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/Brand Logos/CRENELLE FULLH W.png"
              alt="Crenelle"
              width={150}
              height={34}
              className="h-8 w-auto hidden dark:block object-contain transition-transform group-hover:scale-[1.02]"
              priority
            />
            <Image
              src="/Brand Logos/CRENELLE FULLH B.png"
              alt="Crenelle"
              width={150}
              height={34}
              className="h-8 w-auto block dark:hidden object-contain transition-transform group-hover:scale-[1.02]"
              priority
            />
          </Link>

          <div className="flex items-center gap-4">
            <ModeToggle />
            <Link
              href="/events"
              className="inline-flex items-center justify-center rounded-full bg-foreground text-background font-sans text-xs font-bold px-6 py-2.5 hover:bg-copper hover:text-white transition-all duration-300 shadow-md shadow-black/5"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-16 relative z-10 max-w-4xl mx-auto w-full text-center">
        {/* Giant Watermark 404 */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-sans font-black text-center pointer-events-none select-none text-foreground/4 dark:text-foreground/3 tracking-tighter"
          style={{
            fontSize: "clamp(140px, 35vw, 420px)",
            lineHeight: 0.8,
          }}
          aria-hidden="true"
        >
          404
        </div>

        {/* Central Dark Glass Card */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="relative z-20 w-full bg-card/40 backdrop-blur-xl rounded-3xl border border-border/40 p-8 sm:p-12 shadow-2xl shadow-black/10 overflow-hidden"
        >
          {/* Subtle card glow accent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-copper to-transparent rounded-full opacity-80" />

          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-copper bg-copper/10 border border-copper/20 px-4 py-1.5 rounded-full mb-6">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Entry Denied &bull; 404</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="font-sans font-black text-4xl sm:text-6xl text-foreground leading-[1.05] tracking-tight mb-4"
          >
            Access <span className="text-copper italic">Revoked</span>.
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto leading-relaxed mb-8"
          >
            The route you requested has expired, been relocated, or is protected by restricted security permissions.
          </motion.p>

          {/* Primary Action Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
          >
            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2.5 rounded-full bg-foreground text-background font-sans text-xs font-bold px-8 py-3.5 hover:bg-copper hover:text-white transition-all duration-300 shadow-lg shadow-black/5 w-full sm:w-auto"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card/50 text-foreground font-sans text-xs font-bold px-8 py-3.5 hover:border-copper/50 hover:bg-copper/5 transition-all duration-300 w-full sm:w-auto"
            >
              <Home className="w-4 h-4" />
              <span>Return Home</span>
            </Link>
          </motion.div>

          {/* Quick Shortcuts Grid */}
          <motion.div variants={itemVariants} className="pt-8 border-t border-border/40">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Explore Available Destinations
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
              <Link
                href="/events"
                className="group flex items-center gap-3 p-3.5 rounded-2xl bg-card/30 hover:bg-card/70 border border-border/30 hover:border-copper/40 transition-all duration-300 text-left"
              >
                <div className="p-2.5 rounded-xl bg-copper/10 text-copper border border-copper/20 group-hover:scale-105 transition-transform">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground group-hover:text-copper transition-colors">
                    Events Directory
                  </div>
                  <div className="text-[10px] text-muted-foreground">Manage active events</div>
                </div>
              </Link>

              <Link
                href="/login"
                className="group flex items-center gap-3 p-3.5 rounded-2xl bg-card/30 hover:bg-card/70 border border-border/30 hover:border-copper/40 transition-all duration-300 text-left"
              >
                <div className="p-2.5 rounded-xl bg-copper/10 text-copper border border-copper/20 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground group-hover:text-copper transition-colors">
                    Organizer Portal
                  </div>
                  <div className="text-[10px] text-muted-foreground">Access your account</div>
                </div>
              </Link>

              <Link
                href="/#features"
                className="group flex items-center gap-3 p-3.5 rounded-2xl bg-card/30 hover:bg-card/70 border border-border/30 hover:border-copper/40 transition-all duration-300 text-left"
              >
                <div className="p-2.5 rounded-xl bg-copper/10 text-copper border border-copper/20 group-hover:scale-105 transition-transform">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground group-hover:text-copper transition-colors">
                    Platform Features
                  </div>
                  <div className="text-[10px] text-muted-foreground">Explore Crenelle tools</div>
                </div>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/40 py-6 px-6 md:px-12 z-10 bg-background/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Crenelle Inc. All rights reserved.</p>
          <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-wider">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/events" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
