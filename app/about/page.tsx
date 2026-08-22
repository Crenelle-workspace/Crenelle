import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Zap,
  Users,
  Lock,
  ArrowRight,
  Sparkles,
  MapPin,
  Mail,
  MessageCircle,
  Award,
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
      "Ushers shouldn't need app downloads, passwords, or training. A secure scanner link opens in any mobile browser in one second.",
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
    bio: "Product strategist and entrepreneur leading Crenelle's vision, organizer partnerships, and operations. Dedicated to building world-class access credential infrastructure for events and institutions across Africa and beyond.",
    location: "Lagos, Nigeria",
    linkedin: "https://www.linkedin.com/in/david-gbadamosi",
    email: "david@crenelle.org",
  },
  {
    name: "Jeremiah Ogunleye",
    role: "Co-Founder & Technical Lead",
    bio: "Software engineer leading Crenelle's product development, check-in scanning technology, and payment integrations. Focused on building ultra-fast, reliable tools that keep door operations moving smoothly under high attendance.",
    location: "Lagos, Nigeria",
    linkedin: "https://www.linkedin.com/in/jeremiah-ogunleye",
    email: "jeremiah@crenelle.org",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col font-['Inter',ui-sans-serif,system-ui,sans-serif] selection:bg-copper/30 selection:text-white">
      {/* Background atmosphere glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-copper/8 dark:bg-copper/5 blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-[30%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-500/6 dark:bg-amber-500/4 blur-[130px] pointer-events-none z-0" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[6rem_6rem] opacity-35 dark:opacity-10 pointer-events-none z-0" />

      <SiteHeader />

      <main className="flex-1 relative z-10 pt-32 md:pt-40 pb-20">
        {/* ── HERO SECTION ── */}
        <section className="max-w-5xl mx-auto px-6 md:px-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-copper/30 bg-copper/10 text-copper text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-copper" />
            Who We Are
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] text-foreground">
            The physical access credential layer for{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-copper to-amber-400">
              modern gatherings.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Gathering is an art, but door operations have always been chaos. Crenelle was built to replace
            clipboards, clunky apps, and opaque ticketing fees with instant browser-based QR verification and direct bank settlements.
          </p>
        </section>

        {/* ── ORIGIN STORY SECTION ── */}
        <section className="max-w-4xl mx-auto px-6 md:px-10 mt-20 md:mt-28">
          <div className="relative rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-8 md:p-12 shadow-2xl space-y-8 overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-copper/10 border border-copper/30 flex items-center justify-center text-copper">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-[0.16em] text-copper">
                  Our Origin Story
                </h2>
                <p className="text-xl md:text-2xl font-bold text-foreground">
                  Born in Lagos out of real hosting frustration.
                </p>
              </div>
            </div>

            <div className="space-y-5 text-sm md:text-base text-muted-foreground leading-relaxed">
              <p>
                Anyone who has hosted a salon, warehouse concert, tech summit, or intimate private dinner in Lagos
                knows the agony of the front gate: paper spreadsheets with crossed-out names, battery-drained phones,
                ushers struggling with complicated login credentials, and long lines of guests waiting in the humidity.
              </p>
              <p>
                Existing ticketing giants charged exorbitant 10–15% commissions, held organizer funds hostage for weeks,
                and bombarded attendees with promotional emails for unrelated events.
              </p>
              <p>
                We built <strong className="text-foreground font-semibold">Crenelle</strong> to prove there is a better way. By stripping physical access control down to what hosts actually need —{" "}
                <span className="font-mono text-copper font-medium">Invite → Issue Pass → Scan at Door → Track Attendance</span> — we created a platform that delivers effortless gate flow with zero hardware and zero app installs.
              </p>
            </div>

            <div className="pt-4 border-t border-border/40 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-xl bg-background/50 border border-border/40">
                <p className="text-2xl md:text-3xl font-black text-foreground">0</p>
                <p className="text-xs font-mono uppercase text-muted-foreground mt-1">App Installs Needed</p>
              </div>
              <div className="p-4 rounded-xl bg-background/50 border border-border/40">
                <p className="text-2xl md:text-3xl font-black text-foreground">&lt; 1s</p>
                <p className="text-xs font-mono uppercase text-muted-foreground mt-1">Gate Verification</p>
              </div>
              <div className="p-4 rounded-xl bg-background/50 border border-border/40">
                <p className="text-2xl md:text-3xl font-black text-foreground">100%</p>
                <p className="text-xs font-mono uppercase text-muted-foreground mt-1">Direct Bank Payout</p>
              </div>
              <div className="p-4 rounded-xl bg-background/50 border border-border/40">
                <p className="text-2xl md:text-3xl font-black text-foreground">Free</p>
                <p className="text-xs font-mono uppercase text-muted-foreground mt-1">For Free Events</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CORE PRINCIPLES ── */}
        <section className="max-w-6xl mx-auto px-6 md:px-10 mt-24 md:mt-32 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-[0.16em] text-copper">
              Core Principles
            </h2>
            <p className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
              What we stand for and what we guarantee.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {VALUES.map(({ icon: Icon, title, description }, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md p-8 space-y-4 hover:border-copper/40 transition-colors duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-copper/10 border border-copper/30 flex items-center justify-center text-copper">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── TEAM & FOUNDERS SECTION ── */}
        <section className="max-w-6xl mx-auto px-6 md:px-10 mt-24 md:mt-32 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-[0.16em] text-copper">
              The Team Behind Crenelle
            </h2>
            <p className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
              Builders committed to physical access excellence.
            </p>
            <p className="text-sm text-muted-foreground">
              We are engineers, operators, and hosts crafting software that powers real-world gatherings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground bg-secondary/60 px-3 py-1 rounded-full border border-border/40">
                      <MapPin className="w-3 h-3 text-copper" />
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

                <div className="pt-4 border-t border-border/40 flex items-center gap-3">
                  <a
                    href={`mailto:${founder.email}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-copper transition-colors"
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
        <section className="max-w-4xl mx-auto px-6 md:px-10 mt-24">
          <div className="rounded-2xl border border-border/40 bg-card/30 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-base font-bold text-foreground">Crenelle Technologies</h3>
              <p className="text-xs font-mono text-muted-foreground">
                Lagos State, Nigeria · Operating in compliance with the Nigeria Data Protection Act 2023 (NDPA).
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="mailto:support@crenelle.org"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 text-xs font-semibold text-foreground hover:text-copper hover:border-copper/40 transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-copper" />
                support@crenelle.org
              </a>
              <a
                href="https://wa.me/2349014724115"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                WhatsApp Direct
              </a>
            </div>
          </div>
        </section>

        {/* ── CALL TO ACTION ── */}
        <section className="max-w-4xl mx-auto px-6 md:px-10 mt-24 text-center">
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
