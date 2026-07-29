"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground min-h-screen flex flex-col justify-between overflow-x-hidden relative selection:bg-copper/30 selection:text-white font-['Inter',ui-sans-serif,system-ui,sans-serif]">
        {/* Immersive background mesh glows */}
        <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-copper/8 blur-[140px] pointer-events-none z-0" />
        <div className="absolute top-[30%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-amber-500/6 blur-[120px] pointer-events-none z-0" />

        {/* Grid structure overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[6rem_6rem] opacity-20 pointer-events-none z-0" />

        {/* Navigation Bar */}
        <header className="px-6 md:px-12 py-5 border-b border-border/45 bg-background/60 backdrop-blur-lg relative z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/Brand Logos/CRENELLE FULLH W.png"
                alt="Crenelle"
                width={150}
                height={34}
                className="h-8 w-auto object-contain"
                priority
              />
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 relative z-10 max-w-2xl mx-auto w-full text-center">
          <div className="w-full bg-card/40 backdrop-blur-xl rounded-3xl border border-border/40 p-8 sm:p-12 shadow-2xl shadow-black/20">
            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-copper bg-copper/10 border border-copper/20 px-4 py-1.5 rounded-full mb-6">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Critical Boundary Error</span>
            </div>

            <h1 className="font-sans font-black text-3xl sm:text-5xl text-foreground tracking-tight mb-4">
              Fatal System <span className="text-copper italic">Exception</span>.
            </h1>

            <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed mb-8">
              A critical layout error prevented the application from rendering.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => reset()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background font-sans text-xs font-bold px-8 py-3.5 hover:bg-copper hover:text-white transition-all duration-300 shadow-lg shadow-black/5 w-full sm:w-auto cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card/50 text-foreground font-sans text-xs font-bold px-8 py-3.5 hover:border-copper/50 hover:bg-copper/5 transition-all duration-300 w-full sm:w-auto"
              >
                <Home className="w-4 h-4" />
                <span>Return to Safety</span>
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
