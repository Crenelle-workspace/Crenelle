import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { FaqClient } from "@/components/faq/faq-client";

export const metadata: Metadata = {
  title: "Frequently Asked Questions (FAQ) | Crenelle",
  description:
    "Everything you need to know about hosting events with Crenelle: Paystack payouts, refund policies, door scanner links, ticket fees, and anti-duplicate QR verification.",
};

export default function FaqPage() {
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col font-['Inter',ui-sans-serif,system-ui,sans-serif] selection:bg-copper/30 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-copper/8 dark:bg-copper/5 blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-[30%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-500/6 dark:bg-amber-500/4 blur-[130px] pointer-events-none z-0" />

      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[6rem_6rem] opacity-35 dark:opacity-10 pointer-events-none z-0" />

      <SiteHeader />

      <main className="flex-1 relative z-10 pt-32 md:pt-40 pb-20">
        {/* ── HERO SECTION ── */}
        <section className="max-w-5xl mx-auto px-6 md:px-10 text-center space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-copper/30 bg-copper/10 text-copper text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-copper" />
            Knowledge Base & Support
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] text-foreground">
            Frequently Asked{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-copper to-amber-400">
              Questions.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Get clear, immediate answers on ticket fees, Paystack bank payouts, refund handling,
            and our zero-hardware door scanning technology.
          </p>
        </section>

        {/* ── FAQ CLIENT COMPONENT (Search + Categories + Accordions) ── */}
        <section className="max-w-5xl mx-auto px-6 md:px-10">
          <FaqClient />
        </section>

        {/* ── CALL TO ACTION ── */}
        <section className="max-w-4xl mx-auto px-6 md:px-10 mt-24 text-center">
          <div className="rounded-3xl border border-copper/30 bg-linear-to-b from-copper/15 to-transparent p-10 md:p-14 space-y-6">
            <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
              Ready to create your first event?
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              Issue unique QR passes, share scanner links with your gate team in seconds, and collect payouts with ease.
            </p>
            <div className="pt-2">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2.5 bg-foreground text-background font-sans text-xs font-bold px-8 py-3.5 rounded-full hover:bg-copper hover:text-white transition-all duration-300 shadow-xl"
              >
                Get Started for Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
