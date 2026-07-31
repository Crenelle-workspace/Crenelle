"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertOctagon, RefreshCw, LayoutDashboard, ChevronDown, ChevronUp } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Log unexpected errors for telemetry
    console.error("Root App Error caught:", error);
  }, [error]);

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
              className="h-8 w-auto hidden dark:block object-contain"
              priority
            />
            <Image
              src="/Brand Logos/CRENELLE FULLH B.png"
              alt="Crenelle"
              width={150}
              height={34}
              className="h-8 w-auto block dark:hidden object-contain"
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
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-16 relative z-10 max-w-3xl mx-auto w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-20 w-full bg-card/40 backdrop-blur-xl rounded-3xl border border-border/40 p-8 sm:p-12 shadow-2xl shadow-black/10 overflow-hidden"
        >
          {/* Top highlight bar */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-linear-to-r from-transparent via-amber-500 to-transparent rounded-full opacity-80" />

          <div className="inline-flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 rounded-full mb-6">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Unexpected Error &bull; 500</span>
          </div>

          <h1 className="font-sans font-black text-4xl sm:text-5xl text-foreground leading-[1.05] tracking-tight mb-4">
            Something went <span className="text-copper italic">unexpectedly wrong</span>.
          </h1>

          <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto leading-relaxed mb-8">
            We ran into an unexpected error while processing your request. Please try again or return to your dashboard.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2.5 rounded-full bg-foreground text-background font-sans text-xs font-bold px-8 py-3.5 hover:bg-copper hover:text-white transition-all duration-300 shadow-lg shadow-black/5 w-full sm:w-auto cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card/50 text-foreground font-sans text-xs font-bold px-8 py-3.5 hover:border-copper/50 hover:bg-copper/5 transition-all duration-300 w-full sm:w-auto"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </Link>
          </div>

          {/* Technical Error Details Accordion */}
          {error?.message && (
            <div className="pt-6 border-t border-border/40 text-left">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground py-2 transition-colors cursor-pointer"
              >
                <span>Technical Trace Summary</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 p-4 rounded-2xl bg-black/40 border border-border/40 font-mono text-xs text-rose-300/90 overflow-x-auto"
                >
                  <p className="font-bold text-rose-400 mb-1">Error: {error.message}</p>
                  {error.digest && <p className="text-[10px] text-muted-foreground">Digest: {error.digest}</p>}
                </motion.div>
              )}
            </div>
          )}
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
          </div>
        </div>
      </footer>
    </div>
  );
}
