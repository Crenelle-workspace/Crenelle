"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Calendar,
  Clock,
  Globe,
  LayoutGrid,
  List,
  Lock,
  MapPin,
  QrCode,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { EventCard } from "@/components/event-card";
import { DeleteEventDialog } from "@/components/delete-event-dialog";
import { StatusChangeDialog } from "@/components/status-change-dialog";
import { deleteEvent } from "@/app/actions/events";
import { EmptyState } from "@/components/empty-state";
import { getOptimizedBannerUrl } from "@/lib/images";
import { formatEventTime } from "@/lib/date-time";
import type { Event, Invitation } from "@/lib/types";

import {
  WorkspaceSetupCard,
  type SetupStatus,
} from "@/components/workspace-setup-card";
import {
  useDashboardData,
  type DashboardAttendee,
  type DashboardTier,
} from "./hooks/use-dashboard-data";

interface EventsDashboardClientProps {
  initialEvents: Event[];
  initialInvitations: Invitation[];
  initialLogs: { invitation_id: string }[];
  initialAttendees?: DashboardAttendee[];
  initialTiers?: DashboardTier[];
  coHostedEvents?: Array<Event & { memberRole: string }>;
  setupStatus?: SetupStatus;
}

const roleLabels: Record<string, string> = {
  viewer: "Viewer",
  scanner_manager: "Scanner Manager",
  co_organiser: "Co-Organiser",
};

function getBannerStyle(event: Event) {
  const optimizedUrl = getOptimizedBannerUrl(event.banner_url, "web");
  if (optimizedUrl) {
    return {
      backgroundImage: `url(${optimizedUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return {
    background:
      "radial-gradient(circle at 80% 20%, rgba(196, 114, 58, 0.35), transparent 55%), radial-gradient(circle at 20% 80%, rgba(16, 185, 129, 0.14), transparent 50%), linear-gradient(135deg, #171412 0%, #0c0a09 100%)",
  };
}

export function EventsDashboardClient({
  initialEvents,
  initialInvitations,
  initialLogs,
  initialAttendees = [],
  initialTiers = [],
  coHostedEvents = [],
  setupStatus,
}: EventsDashboardClientProps) {
  const { events, invitations, logs, eventStats, summaryMetrics } =
    useDashboardData({
      initialEvents,
      initialInvitations,
      initialLogs,
      initialAttendees,
      initialTiers,
      coHostedEvents,
    });

  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [statusTarget, setStatusTarget] = useState<Event | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"updated" | "created" | "name">(
    "updated",
  );
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isPending, startTransition] = useTransition();

  const filtered = [...events]
    .filter((e) => {
      if (search.trim()) {
        const s = search.toLowerCase();
        const matchesSearch =
          e.name.toLowerCase().includes(s) ||
          (e.venue && e.venue.toLowerCase().includes(s));
        if (!matchesSearch) return false;
      }
      if (filter === "all") return true;
      if (filter === "active") return e.status === "live";
      if (filter === "closed") return e.status === "ended";
      return e.status === filter;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "created")
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });

  const filterTabs = [
    { id: "all", label: "All Events", count: summaryMetrics.totalEvents },
    {
      id: "active",
      label: "Live",
      count: summaryMetrics.liveCount,
      isLive: true,
    },
    {
      id: "published",
      label: "Published",
      count: summaryMetrics.publishedCount,
    },
    { id: "draft", label: "Drafts", count: summaryMetrics.draftCount },
    { id: "closed", label: "Ended", count: summaryMetrics.endedCount },
  ];

  return (
    <div className="space-y-8">
      {/* Setup checklist on tablet/mobile (< lg); desktop has the sidebar Readiness widget */}
      {setupStatus && (
        <div className="lg:hidden">
          <WorkspaceSetupCard status={setupStatus} />
        </div>
      )}

      {/* ── Top 4-Card Workspace KPI Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Events */}
        <div className="rounded-2xl border border-border/50 bg-card/45 backdrop-blur-md p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Total Events
            </span>
            {summaryMetrics.liveCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {summaryMetrics.liveCount} Live • {summaryMetrics.publishedCount} Published
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-copper/10 text-copper border border-copper/20">
                {summaryMetrics.publishedCount} Published
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground tabular-nums">
              {summaryMetrics.totalEvents}
            </span>
            <span className="font-sans text-xs text-muted-foreground">
              {coHostedEvents.length > 0
                ? `+${coHostedEvents.length} co-hosted`
                : `${summaryMetrics.draftCount} in draft`}
            </span>
          </div>
        </div>

        {/* Card 2: Total Registered / Invited */}
        <div className="rounded-2xl border border-border/50 bg-card/45 backdrop-blur-md p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Total Guests
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-stone-500/10 text-foreground border border-border/60">
              {summaryMetrics.overallCapacityPercent !== null
                ? `${summaryMetrics.overallCapacityPercent}% Cap`
                : "Open Cap"}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground tabular-nums">
              {summaryMetrics.totalGuests.toLocaleString()}
            </span>
            <span className="font-sans text-xs text-muted-foreground">
              {summaryMetrics.hasCapacity && summaryMetrics.totalCapacity > 0
                ? `of ${summaryMetrics.totalCapacity.toLocaleString()} capacity`
                : summaryMetrics.pendingCount > 0
                  ? `+${summaryMetrics.pendingCount} pending review`
                  : "across open capacities"}
            </span>
          </div>
        </div>

        {/* Card 3: Checked In */}
        <div className="rounded-2xl border border-border/50 bg-card/45 backdrop-blur-md p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Checked In
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {summaryMetrics.overallShowUpPercent !== null
                ? `${summaryMetrics.overallShowUpPercent}% Show-Up`
                : "Pre-doors"}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground tabular-nums">
              {summaryMetrics.checkedIn.toLocaleString()}
            </span>
            <span className="font-sans text-xs text-muted-foreground">
              {summaryMetrics.overallShowUpPercent !== null
                ? "verified at doors"
                : "doors not yet open"}
            </span>
          </div>
        </div>

        {/* Card 4: Live Doors Status */}
        <div className="rounded-2xl border border-border/50 bg-card/45 backdrop-blur-md p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Live Rooms
            </span>
            {summaryMetrics.liveCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Now
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-stone-500/10 text-muted-foreground border border-border/60">
                Standby
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span
              className={`font-display text-3xl sm:text-4xl font-bold tracking-tight tabular-nums ${
                summaryMetrics.liveCount > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-foreground"
              }`}
            >
              {summaryMetrics.liveCount}
            </span>
            <span className="font-sans text-xs text-muted-foreground">
              {summaryMetrics.endedCount} completed
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Portfolio Section ── */}
      {events.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No events yet"
          subtitle="Create your first event to start issuing entry passes and scanning guests"
          action={
            <Link href="/events/new">
              <button className="inline-flex items-center gap-2 bg-foreground text-background font-sans text-xs font-bold rounded-full px-6 py-3 hover:opacity-90 transition-opacity cursor-pointer">
                Create your first event →
              </button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Unified Command Toolbar */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 rounded-2xl border border-border/50 bg-card/35 backdrop-blur-md p-3">
            {/* Segmented Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 xl:pb-0">
              {filterTabs.map((tab) => {
                const isActive = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-sans text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "bg-foreground text-background shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-stone-500/10"
                    }`}
                  >
                    {tab.isLive && tab.count > 0 && (
                      <span
                        className={`size-1.5 rounded-full ${
                          isActive
                            ? "bg-emerald-400"
                            : "bg-emerald-500 animate-pulse"
                        }`}
                      />
                    )}
                    <span>{tab.label}</span>
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? "bg-background/20 text-background"
                          : "bg-stone-500/10 text-muted-foreground"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search + Sort + View Mode Controls */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
              {/* Search Box */}
              <div className="relative flex-1 sm:w-64">
                <Search className="size-3.5 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search events or venues..."
                  className="w-full h-9 pl-9 pr-8 rounded-xl bg-background/60 border border-border/60 font-sans text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-copper transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 h-9 px-3 rounded-xl bg-background/60 border border-border/60">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:inline">
                  Sort:
                </span>
                <select
                  aria-label="Sort events by"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "updated" | "created" | "name")
                  }
                  className="bg-transparent font-sans text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                >
                  <option
                    value="updated"
                    className="bg-background text-foreground"
                  >
                    Last Updated
                  </option>
                  <option
                    value="created"
                    className="bg-background text-foreground"
                  >
                    Date Created
                  </option>
                  <option
                    value="name"
                    className="bg-background text-foreground"
                  >
                    Alphabetical
                  </option>
                </select>
              </div>

              {/* Grid / List View Switcher */}
              <div className="inline-flex items-center p-0.5 rounded-xl bg-background/60 border border-border/60 h-9">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`h-full px-2.5 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Grid view"
                  title="Grid view"
                >
                  <LayoutGrid className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`h-full px-2.5 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer ${
                    viewMode === "list"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="List view"
                  title="List view"
                >
                  <List className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Empty Filter State */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card/20 p-12 text-center space-y-3">
              <p className="font-display text-lg font-bold uppercase tracking-wide text-foreground">
                No matching events found
              </p>
              <p className="font-sans text-xs text-muted-foreground max-w-md mx-auto">
                No events matched your active filter or search query. Try
                clearing your filters to view your full portfolio.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilter("all");
                  setSearch("");
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-copper/15 text-copper border border-copper/30 font-sans text-xs font-semibold hover:bg-copper/25 transition-colors cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : viewMode === "grid" ? (
            /* ── GRID VIEW: 3-Column Editorial Cards ── */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((event) => {
                const s = eventStats[event.id] || {
                  checkedIn: 0,
                  totalInvited: 0,
                  totalCapacity: 0,
                  hasCapacity: false,
                  pendingCount: 0,
                  waitlistCount: 0,
                };
                const isLive = event.status === "live";
                const isPublished = event.status === "published";
                const isEnded = event.status === "ended";
                const isOpenEvent = event.event_type === "open";

                const primaryMetric = isLive ? s.checkedIn : s.totalInvited;
                const primaryLabel = isLive
                  ? "Checked in"
                  : isOpenEvent
                    ? "Registered"
                    : "Invited";
                const progressPct =
                  s.hasCapacity && s.totalCapacity > 0
                    ? Math.min(
                        Math.round((primaryMetric / s.totalCapacity) * 100),
                        100,
                      )
                    : null;

                const formattedDate = new Date(event.date).toLocaleDateString(
                  "en-GB",
                  {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  },
                );
                const formattedTime = formatEventTime(event.time);

                return (
                  <div
                    key={event.id}
                    className="group relative rounded-2xl border border-border/60 bg-card/45 hover:bg-card/75 hover:border-copper/40 transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-xs"
                  >
                    <div>
                      {/* Visual Banner Header (Permanent Dark Surface -> Explicit Light Text) */}
                      <div
                        className="relative h-36 bg-stone-950 p-4 flex flex-col justify-between overflow-hidden"
                        style={getBannerStyle(event)}
                      >
                        <div className="absolute inset-0 bg-linear-to-t from-stone-950/90 via-stone-950/35 to-stone-950/30" />

                        {/* Top Row: Event Type Pill + Interactive Status Pill */}
                        <div className="relative z-10 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider bg-stone-900/80 text-stone-100 border border-white/15 backdrop-blur-md">
                            {isOpenEvent ? (
                              <>
                                <Globe className="size-3 text-copper" />
                                Public Event
                              </>
                            ) : (
                              <>
                                <Lock className="size-3 text-stone-300" />
                                Invite-Only
                              </>
                            )}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setStatusTarget(event);
                              }}
                              title="Click to change event status"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md transition-transform active:scale-95 cursor-pointer ${
                                isLive
                                  ? "bg-emerald-950/90 text-emerald-400 border border-emerald-500/40 hover:border-emerald-400"
                                  : isPublished
                                    ? "bg-copper/90 text-white border border-copper hover:bg-copper"
                                    : isEnded
                                      ? "bg-stone-900/85 text-stone-300 border border-white/15 hover:border-white/30"
                                      : "bg-stone-900/85 text-stone-200 border border-white/20 hover:border-white/40"
                              }`}
                            >
                              {isLive && (
                                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              )}
                              {isLive
                                ? "LIVE"
                                : isPublished
                                  ? "PUBLISHED"
                                  : isEnded
                                    ? "ENDED"
                                    : "DRAFT"}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDeleteTarget(event);
                              }}
                              className="size-7 rounded-full bg-stone-900/80 text-stone-300 hover:text-red-400 hover:bg-stone-950 border border-white/15 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                              aria-label={`Delete ${event.name}`}
                              title="Delete event"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Bottom Banner Row: Date & Time */}
                        <div className="relative z-10 flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-medium text-stone-200 flex items-center gap-1.5">
                            <Calendar className="size-3 text-copper shrink-0" />
                            {formattedDate}
                          </span>
                          {formattedTime && (
                            <span className="font-mono text-[11px] text-stone-300 flex items-center gap-1">
                              <Clock className="size-3 text-stone-300" />
                              {formattedTime}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Body */}
                      <Link
                        href={`/events/${event.id}`}
                        className="block p-5 space-y-4"
                      >
                        <div className="space-y-1">
                          <h3 className="font-display text-xl font-bold tracking-tight text-foreground group-hover:text-copper transition-colors line-clamp-1">
                            {event.name}
                          </h3>
                          <p className="font-sans text-xs text-muted-foreground flex items-center gap-1.5 line-clamp-1">
                            <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                            {event.venue || "Venue TBA"}
                          </p>
                        </div>

                        {/* Capacity & Check-in Progress */}
                        <div className="space-y-2 pt-1">
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="font-sans text-muted-foreground flex items-center gap-1.5">
                              {primaryLabel}
                              {isOpenEvent && s.pendingCount > 0 && (
                                <span className="text-amber-600 dark:text-amber-400 font-mono text-[10px] font-semibold">
                                  (+{s.pendingCount} pending)
                                </span>
                              )}
                            </span>
                            <div className="font-mono text-xs tabular-nums">
                              <span className="font-bold text-foreground">
                                {primaryMetric.toLocaleString()}
                              </span>
                              {s.hasCapacity && s.totalCapacity > 0 ? (
                                <span className="text-muted-foreground">
                                  {" "}
                                  / {s.totalCapacity.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-muted-foreground"> / ∞</span>
                              )}
                            </div>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-stone-500/15 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isLive ? "bg-emerald-500" : "bg-copper"
                              }`}
                              style={{
                                width:
                                  s.hasCapacity && s.totalCapacity > 0
                                    ? `${progressPct}%`
                                    : primaryMetric > 0
                                      ? "100%"
                                      : "0%",
                                opacity: s.hasCapacity ? 1 : 0.6,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-0.5">
                            <span>
                              {s.checkedIn.toLocaleString()} checked in
                            </span>
                            <span>
                              {s.hasCapacity && progressPct !== null
                                ? `${progressPct}% full`
                                : "Open capacity"}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>

                    {/* Quick-Jump Footer */}
                    <div className="px-5 py-3 border-t border-border/40 bg-background/30 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Link
                          href={
                            isOpenEvent
                              ? `/events/${event.id}/registrations`
                              : `/events/${event.id}/guests`
                          }
                          className="font-sans text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                        >
                          <Users className="size-3 text-copper" />
                          {isOpenEvent ? "Registrations" : "Guests"}
                        </Link>
                        <Link
                          href={
                            isLive
                              ? `/events/${event.id}/live`
                              : `/events/${event.id}/scanner-links`
                          }
                          className="font-sans text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                        >
                          {isLive ? (
                            <>
                              <Activity className="size-3 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-600 dark:text-emerald-400">
                                Live Room
                              </span>
                            </>
                          ) : (
                            <>
                              <QrCode className="size-3 text-muted-foreground" />
                              Scanners
                            </>
                          )}
                        </Link>
                      </div>

                      <Link
                        href={`/events/${event.id}`}
                        className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-copper hover:underline"
                      >
                        Manage
                        <ArrowUpRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── LIST VIEW: Classic Brutalist EventCard Rows ── */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((event) => {
                const s = eventStats[event.id] || {
                  checkedIn: 0,
                  totalInvited: 0,
                  totalCapacity: 0,
                  hasCapacity: false,
                  pendingCount: 0,
                  waitlistCount: 0,
                };
                const cardStatus =
                  event.status === "live"
                    ? "LIVE"
                    : event.status === "published"
                      ? "PUBLISHED"
                      : event.status === "ended"
                        ? "CLOSED"
                        : "DRAFT";

                const isLive = event.status === "live";
                const isOpenEvent = event.event_type === "open";
                const guestCount = isLive ? s.checkedIn : s.totalInvited;
                const baseLabel = isLive
                  ? "Checked in"
                  : isOpenEvent
                    ? "Registered"
                    : "Invited";
                const guestLabel =
                  isOpenEvent && s.pendingCount > 0
                    ? `${baseLabel} (+${s.pendingCount} pend)`
                    : baseLabel;

                return (
                  <div key={event.id} className="relative group">
                    <Link href={`/events/${event.id}`}>
                      <EventCard
                        name={event.name}
                        date={new Date(event.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                        time={event.time?.slice(0, 5) ?? ""}
                        guestCount={guestCount}
                        guestLabel={guestLabel}
                        capacity={s.hasCapacity ? s.totalCapacity : null}
                        eventType={event.event_type || "closed"}
                        status={cardStatus}
                        onStatusClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setStatusTarget(event);
                        }}
                      />
                    </Link>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteTarget(event);
                      }}
                      className="absolute bottom-3 right-3 z-10 h-8 w-8 flex items-center justify-center border border-border text-muted-foreground bg-background hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/40 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                      aria-label={`Delete ${event.name}`}
                      title="Delete event"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <DeleteEventDialog
            open={!!deleteTarget}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
            eventName={deleteTarget?.name}
            isPending={isPending}
            onConfirm={() => {
              if (!deleteTarget) return;
              startTransition(async () => {
                await deleteEvent(deleteTarget.id);
                setDeleteTarget(null);
              });
            }}
          />
        </div>
      )}

      {/* ── Co-hosting section ── */}
      {coHostedEvents.length > 0 && (
        <div className="pt-8 border-t border-border/50 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-copper/10 border border-copper/25 flex items-center justify-center">
                <Sparkles className="size-3.5 text-copper" aria-hidden="true" />
              </div>
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-copper">
                  Co-Hosted Events
                </p>
                <p className="font-sans text-xs text-muted-foreground">
                  Events you collaborate on with other organizers
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {coHostedEvents.map((event) => {
              const s = eventStats[event.id] || {
                checkedIn: 0,
                totalInvited: 0,
                totalCapacity: 0,
                hasCapacity: false,
                pendingCount: 0,
                waitlistCount: 0,
              };
              const isLive = event.status === "live";
              const isPublished = event.status === "published";
              const isOpenEvent = event.event_type === "open";
              const guestCount = isLive ? s.checkedIn : s.totalInvited;
              const baseLabel = isLive
                ? "Checked in"
                : isOpenEvent
                  ? "Registered"
                  : "Invited";
              const guestLabel =
                isOpenEvent && s.pendingCount > 0
                  ? `${baseLabel} (+${s.pendingCount} pend)`
                  : baseLabel;
              const formattedDate = new Date(event.date).toLocaleDateString(
                "en-GB",
                {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                },
              );

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="group rounded-2xl border border-border/60 bg-card/45 hover:bg-card/75 hover:border-copper/40 transition-all duration-300 overflow-hidden flex flex-col justify-between"
                >
                  <div
                    className="relative h-32 bg-stone-950 p-4 flex flex-col justify-between overflow-hidden"
                    style={getBannerStyle(event)}
                  >
                    <div className="absolute inset-0 bg-linear-to-t from-stone-950/90 via-stone-950/35 to-stone-950/30" />
                    <div className="relative z-10 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-stone-900/85 text-copper border border-copper/40 backdrop-blur-md">
                        <Users className="size-3 text-copper" />
                        {roleLabels[event.memberRole] ?? "Co-host"}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md ${
                          isLive
                            ? "bg-emerald-950/90 text-emerald-400 border border-emerald-500/40"
                            : isPublished
                              ? "bg-copper/90 text-white border border-copper"
                              : "bg-stone-900/85 text-stone-200 border border-white/20"
                        }`}
                      >
                        {isLive && (
                          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                        {event.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="relative z-10 flex items-center justify-between">
                      <span className="font-mono text-[11px] text-stone-200 flex items-center gap-1.5">
                        <Calendar className="size-3 text-copper" />
                        {formattedDate}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="font-display text-lg font-bold text-foreground group-hover:text-copper transition-colors line-clamp-1">
                        {event.name}
                      </h3>
                      <p className="font-sans text-xs text-muted-foreground flex items-center gap-1.5 line-clamp-1 mt-0.5">
                        <MapPin className="size-3.5 shrink-0" />
                        {event.venue || "Venue TBA"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs font-mono">
                      <span className="text-muted-foreground">
                        {guestLabel}
                      </span>
                      <span className="font-bold text-foreground">
                        {guestCount.toLocaleString()}{" "}
                        {s.hasCapacity && s.totalCapacity > 0
                          ? `/ ${s.totalCapacity.toLocaleString()}`
                          : "/ ∞"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Status change dialog */}
      {statusTarget && (
        <StatusChangeDialog
          open={!!statusTarget}
          onOpenChange={(open) => !open && setStatusTarget(null)}
          eventId={statusTarget.id}
          eventName={statusTarget.name}
          currentStatus={statusTarget.status}
        />
      )}
    </div>
  );
}
