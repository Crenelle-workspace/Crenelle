import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Zap,
  Users,
  Lock,
  ArrowRight,
  MapPin,
  Mail,
  MessageCircle,
} from "lucide-react";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";

export const metadata: Metadata = {
  title: "About Us — The Access Credential Layer for Modern Events | Crenelle",
  description:
    "Learn about Crenelle's founding story in Lagos, Nigeria, our mission to eliminate door friction, and the team building modern physical access control.",
};

const VALUES = [
  {
    icon: Zap,
    title: "Zero Friction at the Door",
    description:
      "Ushers don't need app downloads or passwords. A secure scanner link opens in any phone browser in one second.",
  },
  {
    icon: Users,
    title: "Complete Organizer Sovereignty",
    description:
      "You own your guest relationships and attendee data. We never sell lists, run ads, or market third-party events to your community.",
  },
  {
    icon: ShieldCheck,
    title: "Uncompromising Gate Integrity",
    description:
      "Unique, scan-once QR passes prevent ticket duplication and ensure only authorized guests enter your event.",
  },
  {
    icon: Lock,
    title: "Direct & Transparent Payouts",
    description:
      "Ticket revenues settle directly to your verified bank account via Paystack on a predictable schedule with zero hidden markups.",
  },
];

const FOUNDERS = [
  {
    name: "David Gbadamosi",
    role: "Founder",
    bio: "Leading Crenelle's product vision, partnerships, and operations. Dedicated to building world-class access credential infrastructure for events and institutions across Africa and beyond.",
    location: "Lagos, Nigeria",
    linkedin: "https://www.linkedin.com/in/david-gbadamosi",
    email: "david@crenelle.org",
  },
  {
    name: "Jeremiah Ogunleye",
    role: "Co-Founder & Technical Lead",
    bio: "Software engineer leading Crenelle's technical architecture, check-in scanning engine, and payment integrations. Focused on building ultra-fast, reliable tools that keep door operations moving smoothly.",
    location: "Lagos, Nigeria",
    linkedin: "https://www.linkedin.com/in/jeremiah-ogunleye",
    email: "jeremiah@crenelle.org",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col font-['Inter',ui-sans-serif,system-ui,sans-serif] selection:bg-copper/30 selection:text-white overflow-x-hidden w-full">
      {/* Background atmosphere glows - contained safely to prevent overflow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[55vw] max-w-150 h-[55vw] max-h-150 rounded-full bg-copper/8 dark:bg-copper/5 blur-[140px]" />
        <div className="absolute top-[35%] -right-[10%] w-[50vw] max-w-130 h-[50vw] max-h-130 rounded-full bg-amber-500/6 dark:bg-amber-500/4 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[6rem_6rem] opacity-35 dark:opacity-10" />
      </div>

      <SiteHeader />

      <main className="flex-1 relative z-10 pt-32 md:pt-40 pb-20 w-full max-w-7xl mx-auto px-6 md:px-12 space-y-24 md:space-y-32">
        {/* ── HERO SECTION ── */}
        <section className="max-w-4xl mx-auto text-center space-y-6 pt-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] text-foreground">
            The access credential layer for{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-copper to-amber-400">
              modern gatherings.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Gathering is an art, but door operations have always been chaos. Crenelle was built to replace
            clipboards, clunky apps, and opaque ticketing markups with instant browser-based QR verification and direct bank settlements.
          </p>
        </section>

        {/* ── ORIGIN STORY SECTION ── */}
        <section className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-8 md:p-12 shadow-xl space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              Born in Lagos out of real hosting frustration.
            </h2>

            <div className="space-y-4 text-sm md:text-base text-muted-foreground leading-relaxed">
              <p>
                Anyone who has hosted a salon, warehouse concert, tech summit, or private dinner in Lagos
                knows the agony of the front gate: paper spreadsheets with crossed-out names, battery-drained phones,
                ushers struggling with complicated app downloads, and long lines of guests waiting at the door.
              </p>
              <p>
                Existing ticketing platforms charged high commissions, held organizer funds for weeks,
                and bombarded attendees with marketing emails for unrelated events.
              </p>
              <p>
                We built <strong className="text-foreground font-semibold">Crenelle</strong> to provide a modern, dignified hosting experience. By focusing on what hosts actually need —{" "}
                <span className="font-mono text-copper font-medium">Invite → Issue Pass → Scan at Door → Track Attendance</span> — we created a platform that delivers fast gate flow with zero hardware and zero app installs.
              </p>
            </div>
          </div>
        </section>

        {/* ── CORE PRINCIPLES ── */}
        <section className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
              What we stand for.
            </h2>
            <p className="text-sm text-muted-foreground">
              Built on transparency, reliability, and respect for host and guest privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {VALUES.map(({ icon: Icon, title, description }, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md p-8 space-y-4 hover:border-copper/40 transition-colors duration-300 shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-copper/10 border border-copper/30 flex items-center justify-center text-copper">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── TEAM & FOUNDERS SECTION ── */}
        <section className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
              The Founders
            </h2>
            <p className="text-sm text-muted-foreground">
              Software builders and hosts focused on physical access excellence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {FOUNDERS.map((founder, idx) => (
              <div
                key={idx}
                className="relative rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-8 space-y-6 flex flex-col justify-between hover:border-copper/40 transition-all duration-300 shadow-lg"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-copper/30 to-amber-500/20 border border-copper/40 flex items-center justify-center font-bold text-xl text-copper">
                      {founder.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 text-copper" />
                      {founder.location}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-foreground">{founder.name}</h3>
                    <p className="text-xs font-mono uppercase tracking-wider text-copper mt-1">
                      {founder.role}
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">{founder.bio}</p>
                </div>

                <div className="pt-4 border-t border-border/40 flex items-center gap-4 text-xs font-semibold">
                  <a
                    href={`mailto:${founder.email}`}
                    className="inline-flex items-center gap-1.5 text-foreground hover:text-copper transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-copper" />
                    {founder.email}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── COMPANY & JURISDICTION ── */}
        <section className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-border/40 bg-card/30 p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-base font-bold text-foreground">Crenelle Technologies</h3>
              <p className="text-xs text-muted-foreground">
                Lagos State, Nigeria · Operating in compliance with the Nigeria Data Protection Act 2023 (NDPA).
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
              <a
                href="mailto:support@crenelle.org"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 text-xs font-semibold text-foreground hover:text-copper hover:border-copper/40 transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-copper" />
                Email Us
              </a>
              <a
                href="https://wa.me/2349014724115"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                WhatsApp
              </a>
            </div>
          </div>
        </section>

        {/* ── CALL TO ACTION ── */}
        <section className="max-w-4xl mx-auto text-center pb-8">
          <div className="relative rounded-3xl border border-copper/30 bg-linear-to-b from-copper/15 to-transparent p-10 md:p-14 space-y-6 overflow-hidden">
            <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
              Ready to host your next event flawlessly?
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              Create your event page, issue unique QR passes, and start scanning in under 5 minutes.
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
