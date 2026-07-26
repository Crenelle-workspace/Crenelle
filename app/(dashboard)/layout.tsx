import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogOut, QrCode, Settings, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import { ModeToggle } from '@/components/mode-toggle'
import { MobileNav } from './mobile-nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Navigation ── */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl px-6 md:px-10 py-3.5 flex items-center justify-between transition-colors">
        <Link
          href="/events"
          className="flex items-center gap-3 group"
          aria-label="Crenelle — go to events dashboard"
        >
          <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center text-background group-hover:rotate-12 transition-transform duration-500 shadow-sm shrink-0">
            <QrCode className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-sans text-lg font-bold tracking-tight text-foreground leading-none group-hover:text-copper transition-colors">
              crenelle
            </span>
            <span className="font-mono text-[8px] text-muted-foreground/60 tracking-wider mt-0.5 uppercase hidden sm:block">
              Event Management
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <span
            className="font-mono text-[10px] font-bold text-muted-foreground/75 hidden sm:block truncate max-w-52 bg-stone-500/10 border border-border/30 px-3 py-1 rounded-full"
            aria-label={`Signed in as ${user.email}`}
          >
            {user.email}
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/events/new"
              className="items-center gap-1.5 font-sans text-xs font-bold text-white bg-copper hover:bg-copper-dark px-4 py-2 rounded-full transition-all duration-300 shadow-md shadow-copper/20 hidden sm:inline-flex"
              aria-label="New Event"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>New Event</span>
            </Link>
            <Link
              href="/settings/sender-profiles"
              className="inline-flex items-center gap-1.5 font-sans text-xs font-bold text-foreground border border-border/40 hover:border-border hover:bg-stone-500/10 px-3.5 py-2 rounded-full transition-all"
              aria-label="Settings"
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            <ModeToggle />
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 font-sans text-xs font-bold text-muted-foreground hover:text-foreground border border-border/40 hover:border-border hover:bg-stone-500/10 px-3.5 py-2 rounded-full transition-all cursor-pointer"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 px-4 pt-10 pb-24 sm:py-10 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* ── Mobile bottom navigation ── */}
      <MobileNav />
    </div>
  )
}
