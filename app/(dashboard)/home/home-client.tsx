"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Plus,
  QrCode,
  Sparkles,
  Users,
  Activity,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { getOptimizedBannerUrl } from "@/lib/images";
import type { Event } from "@/lib/types";
import type { SetupStatus } from "@/components/workspace-setup-card";

export interface HomeEventSummary {
  event: Event;
  isOwner: boolean;
  memberRole?: string;
  totalGuests: number;
  checkedIn: number;
  pendingRegistrations: number;
  activeScanners: number;
  netRevenueNgn: number;
  paidOrdersCount: number;
  readinessPercent: number;
  readinessRemaining: number;
}

export interface HomeActivityItem {
  id: string;
  type: "registration" | "payment" | "checkin";
  title: string;
  subtitle: string;
  timestamp: string;
  href: string;
  initials: string;
}

export interface DailyPulsePoint {
  dateLabel: string;
  isoDate: string;
  count: number;
}

interface HomeClientProps {
  displayName: string;
  eventSummaries: HomeEventSummary[];
  recentActivity: HomeActivityItem[];
  pulsePoints: DailyPulsePoint[];
  totalRegistrations: number;
  addedThisWeek: number;
  totalNetRevenueNgn: number;
  totalActiveScanners: number;
  setupStatus: SetupStatus;
}

function formatRelativeTime(isoTimestamp: string): string {
  const now = Date.now();
  const then = new Date(isoTimestamp).getTime();
  if (Number.isNaN(then)) return "Recently";
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(isoTimestamp).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatNGNCompact(amountNgn: number): string {
  if (amountNgn >= 1_000_000) {
    return `₦${(amountNgn / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}m`;
  }
  if (amountNgn >= 10_000) {
    return `₦${(amountNgn / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.ceil(amountNgn));
}

function getDaysUntil(dateStr: string): {
  label: string;
  isLiveOrToday: boolean;
} {
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const target = new Date(dateStr);
  const targetStart = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  ).getTime();
  const diffDays = Math.round(
    (targetStart - todayStart) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return { label: "Today", isLiveOrToday: true };
  if (diffDays === 1)
    return { label: "Up next · Tomorrow", isLiveOrToday: false };
  if (diffDays > 1)
    return { label: `Up next · ${diffDays} days`, isLiveOrToday: false };
  if (diffDays === -1) return { label: "Yesterday", isLiveOrToday: false };
  return { label: `${Math.abs(diffDays)} days ago`, isLiveOrToday: false };
}

export function HomeClient({
  displayName,
  eventSummaries,
  recentActivity,
  pulsePoints,
  totalRegistrations,
  addedThisWeek,
  totalActiveScanners,
  setupStatus,
}: HomeClientProps) {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const weekdayLong = now.toLocaleDateString("en-GB", { weekday: "long" });
  const dayNumber = now.toLocaleDateString("en-GB", { day: "2-digit" });
  const monthYear = now.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  const fullDateEyebrow = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // ── Choose Spotlight Event ──
  // Priority: 1. Live event, 2. Nearest upcoming event, 3. Most recent event
  const todayIso = now.toISOString().slice(0, 10);
  const liveEventSummary = eventSummaries.find(
    (s) => s.event.status === "live",
  );
  const upcomingEvents = eventSummaries
    .filter((s) => s.event.status !== "ended" && s.event.date >= todayIso)
    .sort((a, b) => a.event.date.localeCompare(b.event.date));

  const focusSummary =
    liveEventSummary ?? upcomingEvents[0] ?? eventSummaries[0] ?? null;

  // ── Build "Needs Attention" Action List ──
  const attentionItems: Array<{
    id: string;
    icon: "alert" | "scanner" | "setup" | "draft";
    title: string;
    subtitle: string;
    actionLabel: string;
    href: string;
  }> = [];

  for (const summary of eventSummaries) {
    if (summary.pendingRegistrations > 0) {
      attentionItems.push({
        id: `pending-reg-${summary.event.id}`,
        icon: "alert",
        title: `${summary.pendingRegistrations} ${
          summary.pendingRegistrations === 1
            ? "registration awaits"
            : "registrations await"
        } approval`,
        subtitle: summary.event.name,
        actionLabel: "Review →",
        href: `/events/${summary.event.id}/registrations`,
      });
    }
  }

  for (const summary of eventSummaries) {
    const isUpcomingOrLive =
      summary.event.status === "live" ||
      (summary.event.status === "published" && summary.event.date >= todayIso);
    if (isUpcomingOrLive && summary.activeScanners === 0) {
      attentionItems.push({
        id: `scanner-${summary.event.id}`,
        icon: "scanner",
        title: "Create door scanner links",
        subtitle: `${summary.event.name} · No active entrances`,
        actionLabel: "Setup →",
        href: `/events/${summary.event.id}/scanner-links`,
      });
    }
  }

  for (const summary of eventSummaries) {
    if (summary.event.status === "draft") {
      attentionItems.push({
        id: `draft-${summary.event.id}`,
        icon: "draft",
        title: "Event draft is unpublished",
        subtitle: summary.event.name,
        actionLabel: "Open →",
        href: `/events/${summary.event.id}`,
      });
    }
  }

  if (!setupStatus.hasSenderProfile) {
    attentionItems.push({
      id: "setup-sender",
      icon: "setup",
      title: "Add a custom email sender identity",
      subtitle: "Workspace readiness",
      actionLabel: "Configure →",
      href: "/settings/sender-profiles",
    });
  }
  if (!setupStatus.hasPaymentSubaccount) {
    attentionItems.push({
      id: "setup-payout",
      icon: "setup",
      title: "Connect payout bank account",
      subtitle: "Settle ticket revenue directly via Paystack",
      actionLabel: "Connect →",
      href: "/settings/payments",
    });
  }
  if (!setupStatus.hasOrgName) {
    attentionItems.push({
      id: "setup-org",
      icon: "setup",
      title: "Set your organisation name",
      subtitle: "Workspace defaults",
      actionLabel: "Update →",
      href: "/settings/general",
    });
  }

  const displayedAttention = attentionItems.slice(0, 4);

  // ── Build SVG Path for 14-Day Pulse Chart ──
  const chartWidth = 700;
  const chartHeight = 175;
  const padTop = 20;
  const padBottom = 20;
  const usableHeight = chartHeight - padTop - padBottom;
  const maxCount = Math.max(...pulsePoints.map((p) => p.count), 4);

  const coords = pulsePoints.map((pt, idx) => {
    const x =
      pulsePoints.length > 1
        ? (idx / (pulsePoints.length - 1)) * chartWidth
        : chartWidth / 2;
    const y = padTop + usableHeight - (pt.count / maxCount) * usableHeight;
    return { x, y, ...pt };
  });

  const linePath =
    coords.length > 0
      ? coords.reduce((acc, pt, i, arr) => {
          if (i === 0) return `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
          const prev = arr[i - 1];
          const cx1 = (prev.x + pt.x) / 2;
          const cy1 = prev.y;
          const cx2 = (prev.x + pt.x) / 2;
          const cy2 = pt.y;
          return `${acc} C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        }, "")
      : "";

  const areaPath =
    coords.length > 0
      ? `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`
      : "";

  function handleCopyRegistrationLink(slug: string) {
    const url = `${window.location.origin}/register/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    toast.success("Registration link copied to clipboard");
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  return (
    <div className="space-y-6 pb-8">
      {/* ── 1. HERO GREETING & EDITORIAL CALENDAR CARD ── */}
      <section className="rounded-3xl border border-border/50 bg-card/45 backdrop-blur-xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-copper">
            <span className="h-2 w-2 rounded-full bg-copper animate-pulse" />
            <span>{fullDateEyebrow}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.02]">
            {greeting}, {displayName}.
          </h1>
          <p className="font-sans text-xs sm:text-sm text-muted-foreground max-w-xl">
            Here is what needs your attention across your events and door
            operations.
          </p>
        </div>

        {/* Date Block */}
        <div className="hidden sm:flex flex-col items-end justify-center px-5 py-3.5 rounded-2xl border border-border/50 bg-background/60 shrink-0 text-right">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-copper">
            {weekdayLong}
          </span>
          <strong className="font-display text-4xl font-bold text-foreground leading-none my-1">
            {dayNumber}
          </strong>
          <span className="font-sans text-[11px] font-medium text-muted-foreground">
            {monthYear}
          </span>
        </div>
      </section>

      {/* ── 2. FOCUS EVENT SPOTLIGHT + NEEDS ATTENTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Focus Event Card */}
        <article className="lg:col-span-7 rounded-3xl border border-border/50 bg-card/45 backdrop-blur-xl overflow-hidden flex flex-col justify-between shadow-xs">
          {focusSummary ? (
            <>
              {/* Dark Visual Header Overlay — uses explicit light text per UI Invariants */}
              <div className="relative min-h-52 p-6 sm:p-7 flex flex-col justify-between bg-stone-950 overflow-hidden">
                {focusSummary.event.banner_url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getOptimizedBannerUrl(
                        focusSummary.event.banner_url,
                        "web",
                      )}
                      alt={focusSummary.event.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-45 scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-stone-950 via-stone-950/75 to-stone-950/30" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(191,130,45,0.28),transparent_60%),linear-gradient(to_bottom_right,#1c1917,#0c0a09)]" />
                )}

                {/* Top Badge Row */}
                <div className="relative z-10 flex items-center justify-between gap-3">
                  {focusSummary.event.status === "live" ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 backdrop-blur-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Now · Doors Open
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 text-stone-100 border border-white/15 backdrop-blur-md">
                      <Clock className="h-3 w-3 text-copper" />
                      {getDaysUntil(focusSummary.event.date).label}
                    </span>
                  )}

                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-black/40 text-stone-300 border border-white/10">
                    {focusSummary.event.event_type === "open"
                      ? "Open Registration"
                      : "Invite-Only"}
                  </span>
                </div>

                {/* Bottom Event Title & Meta over dark overlay */}
                <div className="relative z-10 pt-8 space-y-1.5">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-copper">
                    {new Date(focusSummary.event.date).toLocaleDateString(
                      "en-GB",
                      {
                        weekday: "short",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      },
                    )}
                    {focusSummary.event.time
                      ? ` · ${focusSummary.event.time.slice(0, 5)}`
                      : ""}
                  </p>
                  <h2 className="font-display text-2xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
                    {focusSummary.event.name}
                  </h2>
                  <p className="font-sans text-xs text-stone-300 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-copper shrink-0" />
                    <span className="truncate">{focusSummary.event.venue}</span>
                  </p>
                </div>
              </div>

              {/* Focus Body: Metrics & Quick Actions */}
              <div className="p-6 sm:p-7 space-y-6 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-3.5 rounded-2xl border border-border/40 bg-background/50">
                    <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      {focusSummary.event.status === "live"
                        ? "Checked In"
                        : "Registered"}
                    </span>
                    <strong className="block font-display text-xl sm:text-2xl font-bold text-foreground mt-1">
                      {focusSummary.event.status === "live"
                        ? focusSummary.checkedIn
                        : focusSummary.totalGuests}
                    </strong>
                    <span className="block font-sans text-[10px] text-muted-foreground mt-0.5">
                      {focusSummary.event.capacity
                        ? `of ${focusSummary.event.capacity} capacity`
                        : `${focusSummary.checkedIn} checked in`}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-border/40 bg-background/50">
                    <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      Net Revenue
                    </span>
                    <strong className="block font-display text-xl sm:text-2xl font-bold text-foreground mt-1">
                      {focusSummary.netRevenueNgn > 0
                        ? formatNGNCompact(focusSummary.netRevenueNgn)
                        : "—"}
                    </strong>
                    <span className="block font-sans text-[10px] text-muted-foreground mt-0.5">
                      {focusSummary.paidOrdersCount > 0
                        ? `${focusSummary.paidOrdersCount} paid ${
                            focusSummary.paidOrdersCount === 1
                              ? "order"
                              : "orders"
                          }`
                        : "No paid orders yet"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-border/40 bg-background/50">
                    <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      Readiness
                    </span>
                    <strong className="block font-display text-xl sm:text-2xl font-bold text-foreground mt-1">
                      {focusSummary.readinessPercent}%
                    </strong>
                    <span className="block font-sans text-[10px] text-muted-foreground mt-0.5">
                      {focusSummary.readinessRemaining === 0
                        ? "All checks ready"
                        : `${focusSummary.readinessRemaining} ${
                            focusSummary.readinessRemaining === 1
                              ? "step remains"
                              : "steps remain"
                          }`}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <Link
                    href={
                      focusSummary.event.status === "live"
                        ? `/events/${focusSummary.event.id}/dashboard`
                        : `/events/${focusSummary.event.id}`
                    }
                    className="inline-flex items-center gap-2 font-sans text-xs font-bold bg-foreground text-background hover:opacity-90 px-4 py-2.5 rounded-full transition-all"
                  >
                    <span>
                      {focusSummary.event.status === "live"
                        ? "Open live dashboard"
                        : "Continue preparing"}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>

                  {focusSummary.event.event_type === "open" &&
                  focusSummary.event.registration_slug ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyRegistrationLink(
                            focusSummary.event.registration_slug!,
                          )
                        }
                        className="inline-flex items-center gap-1.5 font-sans text-xs font-bold text-foreground border border-border/50 hover:border-border hover:bg-stone-500/10 px-4 py-2.5 rounded-full transition-all cursor-pointer"
                      >
                        {copiedSlug === focusSummary.event.registration_slug ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-copper" />
                        )}
                        <span>Copy registration link</span>
                      </button>

                      <Link
                        href={`/register/${focusSummary.event.registration_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-sans text-xs font-bold text-muted-foreground hover:text-foreground border border-border/40 hover:border-border hover:bg-stone-500/10 px-4 py-2.5 rounded-full transition-all"
                      >
                        <span>Preview page</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/events/${focusSummary.event.id}/guests`}
                        className="inline-flex items-center gap-1.5 font-sans text-xs font-bold text-foreground border border-border/50 hover:border-border hover:bg-stone-500/10 px-4 py-2.5 rounded-full transition-all"
                      >
                        <Users className="h-3.5 w-3.5 text-copper" />
                        <span>Manage guests</span>
                      </Link>
                      <Link
                        href={`/events/${focusSummary.event.id}/scanner-links`}
                        className="inline-flex items-center gap-1.5 font-sans text-xs font-bold text-muted-foreground hover:text-foreground border border-border/40 hover:border-border hover:bg-stone-500/10 px-4 py-2.5 rounded-full transition-all"
                      >
                        <QrCode className="h-3.5 w-3.5 text-copper" />
                        <span>Scanner links</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 sm:p-10 flex flex-col items-start justify-center min-h-80 space-y-4">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-copper bg-copper/10 border border-copper/20 px-3 py-1 rounded-full">
                Get Started
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Host your first gathering with Crenelle.
              </h2>
              <p className="font-sans text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed">
                Create an invite-only guest list or open ticketed registration
                page, issue QR entry passes, and track door arrivals in real
                time.
              </p>
              <Link
                href="/events/new"
                className="inline-flex items-center gap-2 font-sans text-xs font-bold text-white bg-copper hover:bg-copper-dark px-5 py-3 rounded-full transition-all shadow-md shadow-copper/20"
              >
                <Plus className="h-4 w-4" />
                <span>Create your first event</span>
              </Link>
            </div>
          )}
        </article>

        {/* Right 5 cols: Needs Attention Card */}
        <aside className="lg:col-span-5 rounded-3xl border border-border/50 bg-card/45 backdrop-blur-xl p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
                  Needs attention
                </h2>
                <p className="font-sans text-xs text-muted-foreground">
                  {displayedAttention.length === 0
                    ? "Everything is up to date"
                    : `${attentionItems.length} ${
                        attentionItems.length === 1
                          ? "item requires"
                          : "items require"
                      } review`}
                </p>
              </div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-copper/10 text-copper border border-copper/20">
                Action Center
              </span>
            </div>

            {displayedAttention.length === 0 ? (
              <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="font-sans text-xs font-bold text-foreground">
                    All caught up across your workspace
                  </p>
                  <p className="font-sans text-[11px] text-muted-foreground mt-0.5">
                    Registrations, scanner links, and workspace preferences are
                    ready.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {displayedAttention.map((item) => (
                  <div
                    key={item.id}
                    className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-copper/10 border border-copper/25 text-copper flex items-center justify-center font-mono text-xs font-bold shrink-0">
                        {item.icon === "alert" ? (
                          "!"
                        ) : item.icon === "scanner" ? (
                          <QrCode className="h-3.5 w-3.5" />
                        ) : item.icon === "setup" ? (
                          <Sparkles className="h-3.5 w-3.5" />
                        ) : (
                          "↗"
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="font-sans text-xs font-bold text-foreground truncate">
                          {item.title}
                        </p>
                        <p className="font-sans text-[11px] text-muted-foreground truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={item.href}
                      className="font-sans text-xs font-bold text-copper hover:underline shrink-0"
                    >
                      {item.actionLabel}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Door Readiness Pill */}
          <div
            className={`px-4 py-3 rounded-2xl border text-xs font-sans font-semibold flex items-center justify-between gap-2 ${
              totalActiveScanners > 0
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-stone-500/10 border-border/40 text-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {totalActiveScanners > 0
                  ? `Door setup ready · ${totalActiveScanners} active scanner ${
                      totalActiveScanners === 1 ? "link" : "links"
                    }`
                  : "No active scanner links deployed yet"}
              </span>
            </div>
            <Link
              href={
                focusSummary
                  ? `/events/${focusSummary.event.id}/scanner-links`
                  : "/events"
              }
              className="font-mono text-[10px] font-bold uppercase tracking-wider underline shrink-0"
            >
              Scanners
            </Link>
          </div>
        </aside>
      </div>

      {/* ── 3. REGISTRATION PULSE (14 DAYS) + RECENT ACTIVITY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Registration Pulse Chart */}
        <article className="lg:col-span-7 rounded-3xl border border-border/50 bg-card/45 backdrop-blur-xl p-6 sm:p-7 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
                  Registration pulse
                </h2>
                <p className="font-sans text-xs text-muted-foreground">
                  Guest additions & registrations over the last 14 days
                </p>
              </div>
              <Link
                href="/events"
                className="font-sans text-xs font-bold text-copper hover:underline"
              >
                View events →
              </Link>
            </div>

            <div className="flex items-baseline gap-3 mt-5">
              <strong className="font-display text-4xl sm:text-5xl font-bold text-foreground leading-none">
                {totalRegistrations.toLocaleString()}
              </strong>
              <div className="font-sans text-xs text-muted-foreground">
                <span>total guests across events</span>
                {addedThisWeek > 0 && (
                  <span className="block font-bold text-emerald-600 dark:text-emerald-400">
                    +{addedThisWeek} this week
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Smooth SVG Area + Line Chart */}
          <div className="mt-6">
            <div className="h-40 w-full overflow-hidden">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="none"
                className="w-full h-full overflow-visible"
                aria-label="14-day registration trend chart"
              >
                <defs>
                  <linearGradient
                    id="crenelle-pulse-area"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#bf822d" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#bf822d" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {areaPath && (
                  <path d={areaPath} fill="url(#crenelle-pulse-area)" />
                )}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#bf822d"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </div>
            {pulsePoints.length >= 3 && (
              <div className="flex items-center justify-between pt-2 border-t border-border/30 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>{pulsePoints[0]?.dateLabel}</span>
                <span>
                  {pulsePoints[Math.floor(pulsePoints.length / 2)]?.dateLabel}
                </span>
                <span>{pulsePoints[pulsePoints.length - 1]?.dateLabel}</span>
              </div>
            )}
          </div>
        </article>

        {/* Right 5 cols: Recent Activity */}
        <aside className="lg:col-span-5 rounded-3xl border border-border/50 bg-card/45 backdrop-blur-xl p-6 sm:p-7 flex flex-col justify-between shadow-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
                  Recent activity
                </h2>
                <p className="font-sans text-xs text-muted-foreground">
                  Live updates across your workspace
                </p>
              </div>
              <Link
                href="/finances"
                className="font-sans text-xs font-bold text-copper hover:underline"
              >
                Ledger →
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Activity className="h-7 w-7 text-muted-foreground/50 mx-auto" />
                <p className="font-sans text-xs font-bold text-foreground">
                  No recent activity yet
                </p>
                <p className="font-sans text-[11px] text-muted-foreground max-w-xs mx-auto">
                  Guest registrations, ticket purchases, and door check-ins will
                  appear here automatically.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {recentActivity.map((act) => (
                  <Link
                    key={act.id}
                    href={act.href}
                    className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3 group hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                          act.type === "payment"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : act.type === "checkin"
                              ? "bg-copper/15 text-copper border border-copper/30"
                              : "bg-stone-500/10 text-foreground border border-border/40"
                        }`}
                      >
                        {act.initials}
                      </span>
                      <div className="min-w-0">
                        <p className="font-sans text-xs font-bold text-foreground group-hover:text-copper transition-colors truncate">
                          {act.title}
                        </p>
                        <p className="font-sans text-[11px] text-muted-foreground truncate">
                          {act.subtitle}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                      {formatRelativeTime(act.timestamp)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border/30 flex items-center justify-between text-[11px] font-sans text-muted-foreground">
            <span>Synced with Crenelle Realtime</span>
            <Link
              href="/events"
              className="font-bold text-foreground hover:text-copper"
            >
              All events →
            </Link>
          </div>
        </aside>
      </div>

      {/* ── 4. YOUR EVENTS SNAPSHOT GRID ── */}
      {eventSummaries.length > 0 && (
        <section className="rounded-3xl border border-border/50 bg-card/45 backdrop-blur-xl p-6 sm:p-7 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
                Your events
              </h2>
              <p className="font-sans text-xs text-muted-foreground">
                Keep every room in view — jump directly to any event workspace.
              </p>
            </div>
            <Link
              href="/events"
              className="inline-flex items-center gap-1.5 font-sans text-xs font-bold text-copper hover:underline"
            >
              <span>View all {eventSummaries.length} events</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {eventSummaries.slice(0, 3).map((summary) => {
              const { event } = summary;
              const isLive = event.status === "live";
              const isPublished = event.status === "published";
              const capacityRatio =
                event.capacity && event.capacity > 0
                  ? Math.min(
                      100,
                      Math.round((summary.totalGuests / event.capacity) * 100),
                    )
                  : summary.readinessPercent;

              return (
                <Link
                  key={event.id}
                  href={
                    isLive
                      ? `/events/${event.id}/dashboard`
                      : `/events/${event.id}`
                  }
                  className="group rounded-2xl border border-border/50 bg-background/50 hover:border-copper/50 overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md"
                >
                  {/* Card Banner Strip */}
                  <div className="h-28 relative bg-stone-950 overflow-hidden p-4 flex items-start justify-between">
                    {event.banner_url ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getOptimizedBannerUrl(event.banner_url, "web")}
                          alt={event.name}
                          className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-stone-950 via-stone-950/40 to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(191,130,45,0.25),transparent_65%),linear-gradient(to_bottom,#1c1917,#0c0a09)]" />
                    )}

                    <span
                      className={`relative z-10 inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border backdrop-blur-md ${
                        isLive
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : isPublished
                            ? "bg-copper/20 text-copper border-copper/40"
                            : "bg-white/10 text-stone-200 border-white/15"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isLive
                            ? "bg-emerald-400 animate-pulse"
                            : isPublished
                              ? "bg-copper"
                              : "bg-stone-300"
                        }`}
                      />
                      {event.status}
                    </span>

                    {!summary.isOwner && summary.memberRole && (
                      <span className="relative z-10 font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/50 text-stone-200 border border-white/15">
                        Co-Host
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground group-hover:text-copper transition-colors line-clamp-1">
                        {event.name}
                      </h3>
                      <p className="font-sans text-[11px] text-muted-foreground mt-0.5 truncate">
                        {new Date(event.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {event.time ? ` · ${event.time.slice(0, 5)}` : ""} ·{" "}
                        {isLive
                          ? `${summary.checkedIn} checked in`
                          : `${summary.totalGuests} registered`}
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="w-full h-1 bg-stone-500/15 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isLive ? "bg-emerald-500" : "bg-copper"
                          }`}
                          style={{ width: `${capacityRatio}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-sans">
                        <span className="text-muted-foreground font-medium">
                          {event.capacity
                            ? `${capacityRatio}% capacity`
                            : `${summary.readinessPercent}% ready`}
                        </span>
                        <span className="font-bold text-foreground group-hover:text-copper inline-flex items-center gap-1">
                          {isLive ? "View live" : "Manage"}
                          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
