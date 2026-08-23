import type { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Building2,
} from "lucide-react";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { PricingCalculator } from "@/components/pricing/pricing-calculator";

export const metadata: Metadata = {
  title: "Pricing — Transparent & Simple Event Ticketing | Crenelle",
  description:
    "100% free for free events. 5% flat fee for paid tickets with instant Paystack direct bank settlement. No monthly subscriptions, no hidden charges.",
};

const TIERS = [
  {
    name: "Free & Community",
    price: "₦0",
    period: "always free",
    description:
      "For meetups, private salons, community gatherings, and RSVP events that don't charge admission.",
    features: [
      "Unlimited free events & RSVPs",
      "Unique, scan-once QR passes",
      "Instant 1-click browser scanner links",
      "Email invitations & automated reminders",
      "Guest approval & waitlist workflows",
      "Executive PDF summary reports & CSV logs",
    ],
    cta: "Start Free",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Paid Events",
    price: "5%",
    period: "per paid ticket + processing",
    description:
      "For conferences, concerts, exhibitions, workshops, and gatherings selling paid entry tickets.",
    features: [
      "All Free features included",
      "Direct Paystack bank settlement (T+1)",
      "Multi-currency: NGN, USD, GHS, KES, ZAR",
      "Multi-tier tickets & early-bird pricing",
      "Capacity limits & automated sold-out stops",
      "Full attendance & financial reports (PDF/CSV/Excel)",
      "Dedicated co-host permissions",
    ],
    cta: "Create Paid Event",
    href: "/signup",
    highlight: true,
  },
  {
    name: "Enterprise & Scale",
    price: "Custom",
    period: "tailored volume rates",
    description:
      "For multi-day festivals, university summits, institutions, and high-volume recurring events.",
    features: [
      "All Paid Event features included",
      "Volume-discounted commission rates",
      "Dedicated on-site usher & technical support",
      "Custom domain sender email profiles",
      "Custom badge printing integrations",
      "Dedicated account manager & priority support",
    ],
    cta: "Contact Team",
    href: "mailto:support@crenelle.org?subject=Enterprise%20Inquiry%20-%20Crenelle",
    highlight: false,
  },
];

const COMPARISON_ROWS = [
  { feature: "Free event registrations", free: "Unlimited", paid: "Unlimited", enterprise: "Unlimited" },
  { feature: "Platform commission per ticket", free: "0%", paid: "5%", enterprise: "Volume Discount" },
  { feature: "QR access passes", free: "Included", paid: "Included", enterprise: "Included" },
  { feature: "Browser scanner links (no app required)", free: "Unlimited", paid: "Unlimited", enterprise: "Unlimited" },
  { feature: "Email invites & reminders", free: "Included", paid: "Included", enterprise: "Included + Custom Sender" },
  { feature: "Multi-currency Paystack settlements", free: "—", paid: "NGN, USD, GHS, KES, ZAR", enterprise: "All Supported" },
  { feature: "Direct bank account payout", free: "—", paid: "Automatic (T+1)", enterprise: "Automatic + Custom Schedule" },
  { feature: "Tiered tickets & capacity caps", free: "Single Tier", paid: "Unlimited Tiers", enterprise: "Unlimited Tiers" },
  { feature: "Co-host team roles (Viewer/Scanner/Co-Organiser)", free: "Included", paid: "Included", enterprise: "Custom Permissions" },
  { feature: "Executive PDF reports & CSV exports", free: "Included", paid: "Included", enterprise: "Custom Exports" },
  { feature: "On-site gate support", free: "Self-serve", paid: "Self-serve & Support", enterprise: "Dedicated On-Site Team" },
];

export default function PricingPage() {
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col font-['Inter',ui-sans-serif,system-ui,sans-serif] selection:bg-copper/30 selection:text-white overflow-x-hidden w-full">
      {/* Background atmosphere glows - contained safely to prevent horizontal overflow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
        <div className="absolute -top-[10%] -right-[10%] w-[55vw] max-w-150 h-[55vw] max-h-150 rounded-full bg-copper/8 dark:bg-copper/5 blur-[140px]" />
        <div className="absolute top-[35%] -left-[10%] w-[50vw] max-w-130 h-[50vw] max-h-130 rounded-full bg-amber-500/6 dark:bg-amber-500/4 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[6rem_6rem] opacity-35 dark:opacity-10" />
      </div>

      <SiteHeader />

      <main className="flex-1 relative z-10 pt-32 md:pt-40 pb-20 w-full max-w-7xl mx-auto px-6 md:px-12 space-y-24 md:space-y-32">
        {/* ── HERO SECTION ── */}
        <section className="max-w-4xl mx-auto text-center space-y-6 pt-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] text-foreground">
            Simple, honest pricing.{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-copper to-amber-400">
              Zero hidden fees.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Free for free events. When you sell paid tickets, we take a simple 5% platform commission
            and settle revenue directly to your bank account via Paystack.
          </p>
        </section>

        {/* ── PRICING CARDS ── */}
        <section className="w-full max-w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {TIERS.map((tier, idx) => (
              <div
                key={idx}
                className={`relative rounded-3xl border flex flex-col justify-between p-8 md:p-10 transition-all duration-300 ${
                  tier.highlight
                    ? "border-copper bg-card/80 shadow-2xl shadow-copper/10 ring-1 ring-copper/50"
                    : "border-border/50 bg-card/50 backdrop-blur-xl hover:border-copper/40"
                }`}
              >
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">{tier.name}</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed min-h-10">
                      {tier.description}
                    </p>
                  </div>

                  <div className="pt-2 pb-4 border-y border-border/40">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl md:text-5xl font-black text-foreground">
                        {tier.price}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        / {tier.period}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 text-sm">
                    {tier.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-3 text-muted-foreground">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-foreground/90 text-xs sm:text-sm">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8 mt-8 border-t border-border/40">
                  <Link
                    href={tier.href}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-full py-3.5 px-6 font-sans text-xs font-bold transition-all duration-300 shadow-md ${
                      tier.highlight
                        ? "bg-copper text-white hover:bg-copper-light"
                        : "bg-foreground text-background hover:bg-copper hover:text-white"
                    }`}
                  >
                    {tier.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CALCULATOR SECTION ── */}
        <section className="max-w-4xl mx-auto w-full">
          <PricingCalculator />
        </section>

        {/* ── COMPARISON MATRIX TABLE ── */}
        <section className="w-full max-w-5xl mx-auto space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
              Compare Plan Features
            </h2>
            <p className="text-sm text-muted-foreground">
              Everything you need to host professional events of any size.
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden shadow-xl w-full max-w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-140">
                <thead>
                  <tr className="border-b border-border/50 bg-card/80 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    <th className="p-4 md:p-5 font-bold">Feature</th>
                    <th className="p-4 md:p-5 font-bold">Free</th>
                    <th className="p-4 md:p-5 font-bold text-copper">Paid</th>
                    <th className="p-4 md:p-5 font-bold">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs md:text-sm">
                  {COMPARISON_ROWS.map((row, idx) => (
                    <tr key={idx} className="hover:bg-card/40 transition-colors">
                      <td className="p-4 md:p-5 font-semibold text-foreground">{row.feature}</td>
                      <td className="p-4 md:p-5 text-muted-foreground">{row.free}</td>
                      <td className="p-4 md:p-5 font-medium text-foreground">{row.paid}</td>
                      <td className="p-4 md:p-5 text-muted-foreground">{row.enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── TRUST HIGHLIGHTS ── */}
        <section className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-6 rounded-2xl border border-border/40 bg-card/40 space-y-2">
            <CreditCard className="w-6 h-6 text-copper mx-auto" />
            <h4 className="font-bold text-foreground">No Upfront Card Required</h4>
            <p className="text-xs text-muted-foreground">Create free events instantly without entering billing details.</p>
          </div>
          <div className="p-6 rounded-2xl border border-border/40 bg-card/40 space-y-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h4 className="font-bold text-foreground">Direct Bank Settlements</h4>
            <p className="text-xs text-muted-foreground">Ticket revenue goes straight to your bank account on T+1 schedule.</p>
          </div>
          <div className="p-6 rounded-2xl border border-border/40 bg-card/40 space-y-2">
            <Building2 className="w-6 h-6 text-copper mx-auto" />
            <h4 className="font-bold text-foreground">Transparent Commission</h4>
            <p className="text-xs text-muted-foreground">5% platform fee with zero subscription or monthly hosting lock-in.</p>
          </div>
        </section>

        {/* ── CALL TO ACTION ── */}
        <section className="max-w-4xl mx-auto text-center pb-8">
          <div className="rounded-3xl border border-copper/30 bg-linear-to-b from-copper/15 to-transparent p-10 md:p-14 space-y-6 overflow-hidden">
            <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
              Have questions about payouts or custom volume?
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              We’ve answered all common host questions about bank setups, attendee refunds, and supported currencies.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/faq"
                className="inline-flex items-center gap-2 bg-foreground text-background font-sans text-xs font-bold px-8 py-3.5 rounded-full hover:bg-copper hover:text-white transition-all duration-300 shadow-xl"
              >
                Read the FAQ
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground px-6 py-3.5 transition-colors"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
