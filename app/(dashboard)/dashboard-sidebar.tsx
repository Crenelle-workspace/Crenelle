'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Home,
  Calendar,
  Wallet,
  ScanLine,
  LayoutDashboard,
  Ticket,
  FileText,
  Users,
  Activity,
  Mail,
  QrCode,
  UserPlus,
  Settings,
  User,
  Sliders,
  CreditCard,
  LogOut,
  ArrowLeft,
  ChevronRight,
  Plus,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { StatusChangeDialog } from '@/components/status-change-dialog'
import type { EventStatus, EventType } from '@/lib/types'
import type { SetupStatus } from '@/components/workspace-setup-card'

export interface SidebarEvent {
  id: string
  name: string
  date: string
  status: EventStatus
  event_type: EventType
  isOwner?: boolean
  role?: string
}

interface DashboardSidebarProps {
  userEmail: string
  events?: SidebarEvent[]
  setupStatus?: SetupStatus
}

export function DashboardSidebar({
  userEmail,
  events = [],
  setupStatus = {
    hasOrgName: true,
    hasSenderProfile: true,
    hasPaymentSubaccount: true,
    hasEmailFooter: true,
  },
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  // Ensure unique events by id defensively
  const uniqueEvents = Array.from(new Map(events.map((e) => [e.id, e])).values())

  // ── Context resolution ───────────────────────────────────────
  // Detect /events/[id]/* (excluding /events/new and /events)
  const eventMatch = pathname.match(/^\/events\/([^/]+)(?:\/.*)?$/)
  const isEventDetail = Boolean(eventMatch && eventMatch[1] !== 'new')
  const activeEventId = isEventDetail && eventMatch ? eventMatch[1] : null
  const activeEvent = activeEventId ? uniqueEvents.find((e) => e.id === activeEventId) : null

  const isSettings = pathname.startsWith('/settings')
  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : 'U'

  // Readiness calculations
  const setupItems = [
    { label: 'Org Details', isComplete: setupStatus.hasOrgName, href: '/settings/general' },
    { label: 'Sender Profile', isComplete: setupStatus.hasSenderProfile, href: '/settings/sender-profiles' },
    { label: 'Payout Account', isComplete: setupStatus.hasPaymentSubaccount, href: '/settings/payments' },
    { label: 'Email Footer', isComplete: setupStatus.hasEmailFooter, href: '/settings/general' },
  ]
  const completedSetupCount = setupItems.filter((i) => i.isComplete).length
  const setupPercent = Math.round((completedSetupCount / setupItems.length) * 100)
  const nextIncompleteSetup = setupItems.find((i) => !i.isComplete)

  // ── Mode-specific navigation items ───────────────────────────
  const eventTabs = activeEventId
    ? [
        { label: 'Overview', href: `/events/${activeEventId}`, exact: true, icon: LayoutDashboard },
        { label: 'Tickets', href: `/events/${activeEventId}/tickets`, exact: false, icon: Ticket },
        ...(activeEvent?.event_type === 'open'
          ? [{ label: 'Registrations', href: `/events/${activeEventId}/registrations`, exact: false, icon: FileText }]
          : []),
        { label: 'Guests', href: `/events/${activeEventId}/guests`, exact: false, icon: Users },
        {
          label: 'Live Dashboard',
          href: `/events/${activeEventId}/dashboard`,
          exact: false,
          icon: Activity,
          isLive: activeEvent?.status === 'live',
        },
        { label: 'Scanner Links', href: `/events/${activeEventId}/scanner-links`, exact: false, icon: ScanLine },
        { label: 'Email', href: `/events/${activeEventId}/email`, exact: false, icon: Mail },
        { label: 'Passes', href: `/events/${activeEventId}/cards`, exact: false, icon: QrCode },
        ...(activeEvent?.isOwner !== false
          ? [{ label: 'Team', href: `/events/${activeEventId}/team`, exact: false, icon: UserPlus }]
          : []),
      ]
    : []

  const settingsTabs = [
    { label: 'Sender Profiles', href: '/settings/sender-profiles', icon: Mail },
    { label: 'Account', href: '/settings/account', icon: User },
    { label: 'General', href: '/settings/general', icon: Sliders },
    { label: 'Payments', href: '/settings/payments', icon: CreditCard },
  ]

  const canEditStatus = activeEvent?.isOwner !== false && activeEvent?.role !== 'viewer' && activeEvent?.role !== 'checkin_staff'

  return (
    <aside
      aria-label="Sidebar navigation"
      className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 z-30 border-r border-border/40 bg-background/80 backdrop-blur-xl transition-colors select-none"
    >
      {/* ── Brand Logo Header ── */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-border/40 shrink-0">
        <Link
          href="/home"
          className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper/40 rounded-lg"
          aria-label="Crenelle — go to workspace home"
        >
          <Image
            src="/Brand Logos/CRENELLE WORDMARK W.png"
            alt="Crenelle"
            width={130}
            height={30}
            className="h-5 w-auto hidden dark:block object-contain"
            priority
          />
          <Image
            src="/Brand Logos/CRENELLE WORDMARK B.png"
            alt="Crenelle"
            width={130}
            height={30}
            className="h-5 w-auto block dark:hidden object-contain"
            priority
          />
        </Link>
      </div>

      {/* ── Scrollable Body Area ── */}
      <div className="flex-1 flex flex-col justify-between px-3 py-4 overflow-y-auto no-scrollbar space-y-6">
        {/* ========================================================= */}
        {/* MODE A: EVENT CONTEXTUAL MODE (/events/[id]/*)            */}
        {/* ========================================================= */}
        {isEventDetail && activeEventId ? (
          <div className="space-y-4">
            {/* Back link */}
            <div>
              <Link
                href="/events"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-stone-500/10 rounded-lg transition-colors group"
              >
                <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>All events</span>
              </Link>
            </div>

            {/* Active Event Card Badge */}
            <div className="p-3 rounded-2xl bg-card/50 border border-border/40 shadow-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-copper">
                  {activeEvent?.event_type === 'open' ? 'Open Event' : 'Event Workspace'}
                </span>
                {activeEvent && (
                  <>
                    {canEditStatus ? (
                      <button
                        type="button"
                        onClick={() => setStatusDialogOpen(true)}
                        className={`inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all cursor-pointer hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-copper ${
                          activeEvent.status === 'live'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : activeEvent.status === 'published'
                            ? 'bg-copper/10 text-copper border-copper/30'
                            : 'bg-stone-500/10 text-muted-foreground border-border/40'
                        }`}
                        title="Click to change event status"
                        aria-label={`Change event status. Current: ${activeEvent.status}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            activeEvent.status === 'live'
                              ? 'bg-emerald-500 animate-pulse'
                              : activeEvent.status === 'published'
                              ? 'bg-copper'
                              : 'bg-muted-foreground'
                          }`}
                        />
                        <span>{activeEvent.status}</span>
                      </button>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          activeEvent.status === 'live'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : activeEvent.status === 'published'
                            ? 'bg-copper/10 text-copper border-copper/30'
                            : 'bg-stone-500/10 text-muted-foreground border-border/40'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            activeEvent.status === 'live'
                              ? 'bg-emerald-500 animate-pulse'
                              : activeEvent.status === 'published'
                              ? 'bg-copper'
                              : 'bg-muted-foreground'
                          }`}
                        />
                        <span>{activeEvent.status}</span>
                      </span>
                    )}

                    {statusDialogOpen && (
                      <StatusChangeDialog
                        open={statusDialogOpen}
                        onOpenChange={setStatusDialogOpen}
                        eventId={activeEvent.id}
                        eventName={activeEvent.name}
                        currentStatus={activeEvent.status}
                      />
                    )}
                  </>
                )}
              </div>

              <h2
                className="font-sans text-xs font-bold text-foreground line-clamp-1"
                title={activeEvent?.name ?? 'Event Workspace'}
              >
                {activeEvent?.name ?? 'Event Workspace'}
              </h2>

              <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[10px] text-muted-foreground font-sans">
                <span>
                  {activeEvent?.date
                    ? new Date(activeEvent.date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Scheduled'}
                </span>
                {activeEvent && !activeEvent.isOwner && activeEvent.role && (
                  <span className="font-mono text-[9px] uppercase text-copper font-semibold">
                    {activeEvent.role}
                  </span>
                )}
              </div>
            </div>

            {/* Event Tabs Navigation */}
            <div>
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/75 px-3 mb-2 block">
                Event Sections
              </span>
              <nav aria-label="Event navigation" className="space-y-1">
                {eventTabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)

                  return (
                    <Link
                      key={tab.label}
                      href={tab.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex items-center justify-between px-3.5 py-2 rounded-xl font-sans text-xs font-bold transition-all duration-200 ${
                        isActive
                          ? 'bg-foreground text-background shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-stone-500/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive ? 'text-background' : 'text-copper'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate">{tab.label}</span>
                      </div>

                      {tab.isLive && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-1.5" />
                      )}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>
        ) : isSettings ? (
          /* ========================================================= */
          /* MODE B: SETTINGS CONTEXTUAL MODE (/settings/*)            */
          /* ========================================================= */
          <div className="space-y-4">
            <div>
              <Link
                href="/events"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-stone-500/10 rounded-lg transition-colors group"
              >
                <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>All events</span>
              </Link>
            </div>

            <div>
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/75 px-3 mb-2.5 block">
                Workspace Settings
              </span>
              <nav aria-label="Settings navigation" className="space-y-1">
                {settingsTabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = pathname.startsWith(tab.href)

                  return (
                    <Link
                      key={tab.label}
                      href={tab.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-xs font-bold transition-all duration-200 ${
                        isActive
                          ? 'bg-foreground text-background shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-stone-500/10'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive ? 'text-background' : 'text-copper'
                        }`}
                        aria-hidden="true"
                      />
                      <span>{tab.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* MODE C: WORKSPACE GLOBAL MODE (/events, /finances)        */
          /* ========================================================= */
          <div className="space-y-6">
            {/* Primary Hub */}
            <div>
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/75 px-3 mb-2 block">
                Workspace Hub
              </span>
              <nav aria-label="Main sections" className="space-y-1">
                {/* Home */}
                <Link
                  href="/home"
                  aria-current={pathname === '/home' ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-xs font-bold transition-all duration-200 ${
                    pathname === '/home'
                      ? 'bg-foreground text-background shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-stone-500/10'
                  }`}
                >
                  <Home
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      pathname === '/home' ? 'text-background' : 'text-copper'
                    }`}
                    aria-hidden="true"
                  />
                  <span>Home</span>
                </Link>

                {/* Events */}
                <Link
                  href="/events"
                  aria-current={pathname === '/events' ? 'page' : undefined}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-sans text-xs font-bold transition-all duration-200 ${
                    pathname === '/events'
                      ? 'bg-foreground text-background shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-stone-500/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Calendar
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        pathname === '/events' ? 'text-background' : 'text-copper'
                      }`}
                      aria-hidden="true"
                    />
                    <span>Events</span>
                  </div>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
                      pathname === '/events'
                        ? 'bg-background/20 text-background'
                        : 'bg-stone-500/10 text-muted-foreground border border-border/30'
                    }`}
                  >
                    {uniqueEvents.length}
                  </span>
                </Link>

                {/* Finances */}
                <Link
                  href="/finances"
                  aria-current={pathname.startsWith('/finances') ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-xs font-bold transition-all duration-200 ${
                    pathname.startsWith('/finances')
                      ? 'bg-foreground text-background shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-stone-500/10'
                  }`}
                >
                  <Wallet
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      pathname.startsWith('/finances') ? 'text-background' : 'text-copper'
                    }`}
                    aria-hidden="true"
                  />
                  <span>Finances</span>
                </Link>
              </nav>
            </div>

            {/* Recent & Active Events Quick List */}
            {uniqueEvents.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-3 mb-2">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/75 block">
                    Active Events
                  </span>
                  <Link
                    href="/events/new"
                    className="text-copper hover:text-copper-dark transition-colors p-0.5 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-copper"
                    title="Create new event"
                    aria-label="Create new event"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="space-y-1">
                  {uniqueEvents.slice(0, 4).map((ev) => {
                    const isEvLive = ev.status === 'live'
                    return (
                      <Link
                        key={ev.id}
                        href={`/events/${ev.id}`}
                        className="group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans text-muted-foreground hover:text-foreground hover:bg-stone-500/10 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              isEvLive
                                ? 'bg-emerald-500 animate-pulse'
                                : ev.status === 'published'
                                ? 'bg-copper'
                                : 'bg-stone-400/50'
                            }`}
                          />
                          <span className="truncate font-medium group-hover:font-semibold transition-all">
                            {ev.name}
                          </span>
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Workspace Readiness Mini Widget */}
            <div className="p-3.5 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-copper inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Readiness
                </span>
                <span className="font-mono text-[9px] font-bold text-muted-foreground">
                  {completedSetupCount}/{setupItems.length}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-stone-500/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-copper rounded-full transition-all duration-500"
                  style={{ width: `${setupPercent}%` }}
                />
              </div>

              {completedSetupCount === setupItems.length ? (
                <div className="flex items-center gap-1.5 text-[11px] font-sans font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Workspace configured</span>
                </div>
              ) : nextIncompleteSetup ? (
                <Link
                  href={nextIncompleteSetup.href}
                  className="group flex items-center justify-between text-[11px] font-sans font-medium text-muted-foreground hover:text-copper transition-colors"
                >
                  <span className="truncate">Setup: {nextIncompleteSetup.label}</span>
                  <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Link>
              ) : null}
            </div>

            {/* Preferences */}
            <div>
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/75 px-3 mb-2 block">
                Preferences
              </span>
              <nav aria-label="Preferences" className="space-y-1">
                <Link
                  href="/settings/sender-profiles"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-stone-500/10 transition-all duration-200"
                >
                  <Settings className="h-4 w-4 shrink-0 text-copper" aria-hidden="true" />
                  <span>Settings</span>
                </Link>
              </nav>
            </div>
          </div>
        )}

        {/* ── Persistent User Profile & Sign Out Footer ── */}
        <div className="pt-3 border-t border-border/40 space-y-2.5">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-stone-500/5 border border-border/30">
            <div
              className="w-7 h-7 rounded-full bg-copper/15 text-copper flex items-center justify-center font-mono text-[11px] font-bold shrink-0"
              aria-hidden="true"
            >
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <span
                className="block font-mono text-[10px] font-bold text-foreground truncate"
                title={userEmail}
              >
                {userEmail}
              </span>
              <span className="block font-sans text-[10px] text-muted-foreground">
                Workspace Owner
              </span>
            </div>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 font-sans text-xs font-bold text-muted-foreground hover:text-foreground border border-border/40 hover:border-border hover:bg-stone-500/10 px-3.5 py-2 rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper/40"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
