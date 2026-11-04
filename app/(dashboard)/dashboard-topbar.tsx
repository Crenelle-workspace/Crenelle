'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Plus, LogOut } from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { ModeToggle } from '@/components/mode-toggle'
import type { SidebarEvent } from './dashboard-sidebar'

const EVENT_SUB_TABS: Record<string, string> = {
  tickets: 'Tickets',
  registrations: 'Registrations',
  guests: 'Guests',
  dashboard: 'Live Dashboard',
  'scanner-links': 'Scanner Links',
  email: 'Email',
  cards: 'Passes',
  team: 'Team',
  edit: 'Edit',
}

const SETTINGS_TABS: Record<string, string> = {
  'sender-profiles': 'Sender Profiles',
  account: 'Account',
  general: 'General',
  payments: 'Payments',
}

interface DashboardTopbarProps {
  events?: SidebarEvent[]
}

export function DashboardTopbar({ events = [] }: DashboardTopbarProps) {
  const pathname = usePathname()

  // Calculate hierarchical breadcrumbs
  const crumbs: Array<{ label: string; href?: string }> = [
    { label: 'Workspace', href: '/home' },
  ]

  const eventMatch = pathname.match(/^\/events\/([^/]+)(?:\/([^/]+))?$/)

  if (pathname === '/home') {
    crumbs.push({ label: 'Home' })
  } else if (pathname === '/events') {
    crumbs.push({ label: 'Events' })
  } else if (pathname === '/events/new') {
    crumbs.push({ label: 'Events', href: '/events' }, { label: 'New Event' })
  } else if (eventMatch && eventMatch[1] !== 'new') {
    const eventId = eventMatch[1]
    const subRoute = eventMatch[2]
    const matchedEvent = events.find((e) => e.id === eventId)
    const eventLabel = matchedEvent?.name || 'Event'

    crumbs.push({ label: 'Events', href: '/events' })

    if (!subRoute) {
      crumbs.push({ label: eventLabel })
    } else {
      crumbs.push({ label: eventLabel, href: `/events/${eventId}` })
      crumbs.push({ label: EVENT_SUB_TABS[subRoute] ?? subRoute })
    }
  } else if (pathname.startsWith('/finances')) {
    crumbs.push({ label: 'Finances' })
  } else if (pathname.startsWith('/settings')) {
    crumbs.push({ label: 'Settings', href: '/settings/sender-profiles' })
    const settingKey = pathname.replace('/settings/', '')
    if (settingKey && SETTINGS_TABS[settingKey]) {
      crumbs.push({ label: SETTINGS_TABS[settingKey] })
    }
  } else {
    crumbs.push({ label: 'Overview' })
  }

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between transition-colors">
      {/* ── Left: Mobile/Tablet brand logo OR Desktop section crumbs ── */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {/* Mobile & Tablet brand logo (< lg) */}
        <Link
          href="/home"
          className="flex lg:hidden items-center gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper/40 rounded-lg"
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

        {/* iPad Top Navigation Links (md:flex lg:hidden) */}
        <nav
          aria-label="Tablet navigation"
          className="hidden md:flex lg:hidden items-center gap-1 border-l border-border/40 pl-4"
        >
          <Link
            href="/home"
            className={`font-sans text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
              pathname === '/home'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-stone-500/10'
            }`}
          >
            Home
          </Link>
          <Link
            href="/events"
            className={`font-sans text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
              pathname.startsWith('/events')
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-stone-500/10'
            }`}
          >
            Events
          </Link>
          <Link
            href="/finances"
            className={`font-sans text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
              pathname.startsWith('/finances')
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-stone-500/10'
            }`}
          >
            Finances
          </Link>
          <Link
            href="/settings/sender-profiles"
            className={`font-sans text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
              pathname.startsWith('/settings')
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-stone-500/10'
            }`}
          >
            Settings
          </Link>
        </nav>

        {/* Desktop hierarchical breadcrumbs (lg+) */}
        <nav
          aria-label="Breadcrumb"
          className="hidden lg:flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-wider uppercase select-none min-w-0"
        >
          {crumbs.map((crumb, idx) => {
            const isLast = idx === crumbs.length - 1
            const isFirst = idx === 0
            return (
              <div key={`${crumb.label}-${idx}`} className="flex items-center gap-1.5 min-w-0">
                {idx > 0 && (
                  <span className="text-border/70 shrink-0" aria-hidden="true">
                    /
                  </span>
                )}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className={`truncate hover:text-foreground transition-colors ${
                      isFirst ? 'text-copper' : 'text-muted-foreground'
                    }`}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={`truncate ${
                      isLast
                        ? 'text-foreground max-w-45 lg:max-w-70'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {crumb.label}
                  </span>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* ── Right tools ── */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <Link
          href="/events/new"
          className="inline-flex items-center gap-1.5 font-sans text-xs font-bold text-white bg-copper hover:bg-copper-dark px-3.5 sm:px-4 py-2 rounded-full transition-all duration-300 shadow-md shadow-copper/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper/40"
          aria-label="New Event"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden xs:inline">New Event</span>
        </Link>

        <ModeToggle />

        {/* Mobile & Tablet Sign out button (< lg) */}
        <div className="lg:hidden">
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex items-center justify-center p-2 rounded-full text-muted-foreground hover:text-foreground border border-border/40 hover:border-border hover:bg-stone-500/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper/40"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}

