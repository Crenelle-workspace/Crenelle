'use client'

import { useState } from 'react'
import { Shield, Lock, Check, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { TeamRole } from '@/lib/types'

interface EventRoleBannerProps {
  role: TeamRole
  eventName: string
}

const roleDescriptions: Record<string, { label: string; summary: string; description: string }> = {
  co_organiser: {
    label: 'Co-Organiser',
    summary: 'Manage guests, registrations, invitations, and scanner links.',
    description: 'You have operational management access. You can approve or reject registrations, manage the guest list, send pass notifications, create door scanner links, and review reports. Core event settings, ticket pricing, and co-host assignments remain managed by the event organizer.',
  },
  scanner_manager: {
    label: 'Scanner Manager',
    summary: 'Manage usher scanner links and observe live check-in attendance.',
    description: 'You are authorized to create, share, and revoke door scanner links for ushers, as well as monitor live entry logs and attendance stats. Guest list editing, ticket pricing, and broadcast messaging are restricted.',
  },
  viewer: {
    label: 'Viewer',
    summary: 'Read-only access across guests, registrations, and attendance metrics.',
    description: 'You have read-only access to observe event performance, guest lists, public registrations, and scanner links. You cannot modify event details, approve registrations, or dispatch messages.',
  },
}

const permissionsMatrix: Array<{
  feature: string
  owner: boolean
  co_organiser: boolean
  scanner_manager: boolean
  viewer: boolean
}> = [
  { feature: 'Core Event Settings (Name, Venue, Date, Details)', owner: true, co_organiser: false, scanner_manager: false, viewer: false },
  { feature: 'Event Status Transitions (Draft, Published, Live, Ended)', owner: true, co_organiser: false, scanner_manager: false, viewer: false },
  { feature: 'Ticket Pricing, Tiers & Coupon Codes', owner: true, co_organiser: false, scanner_manager: false, viewer: false },
  { feature: 'Team & Co-host Invitations', owner: true, co_organiser: false, scanner_manager: false, viewer: false },
  { feature: 'Email Theme Customization', owner: true, co_organiser: false, scanner_manager: false, viewer: false },
  { feature: 'Manage Guests (Add, Edit, Delete Guests)', owner: true, co_organiser: true, scanner_manager: false, viewer: false },
  { feature: 'Registration Approvals (Accept, Reject, Waitlist)', owner: true, co_organiser: true, scanner_manager: false, viewer: false },
  { feature: 'Broadcast Reminders & Re-send Passes', owner: true, co_organiser: true, scanner_manager: false, viewer: false },
  { feature: 'Door Scanner Links (Create, Revoke links)', owner: true, co_organiser: true, scanner_manager: true, viewer: false },
  { feature: 'Live Attendance & Check-in Logs', owner: true, co_organiser: true, scanner_manager: true, viewer: true },
  { feature: 'Guest & Registration List Viewing', owner: true, co_organiser: true, scanner_manager: true, viewer: true },
]

export function EventRoleBanner({ role, eventName }: EventRoleBannerProps) {
  const [scopeOpen, setScopeOpen] = useState(false)
  const config = roleDescriptions[role] ?? {
    label: role,
    summary: 'Collaborating as a team member on this event.',
    description: 'You have delegated access to this event.',
  }

  return (
    <>
      <aside
        aria-label="Collaboration role notice"
        className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-copper/30 bg-copper/5 dark:bg-copper/10 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xs"
      >
        <div className="flex items-start sm:items-center gap-3">
          <div className="size-7 rounded-full bg-copper/15 border border-copper/30 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 text-copper">
            <Shield className="size-3.5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-sans text-foreground leading-snug">
              <span className="font-bold text-copper font-mono uppercase tracking-wider">
                {config.label}
              </span>
              <span className="hidden sm:inline text-muted-foreground mx-1.5">•</span>
              <span className="text-muted-foreground block sm:inline mt-0.5 sm:mt-0">
                {config.summary}
              </span>
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setScopeOpen(true)}
          className="self-start sm:self-auto h-7 px-3 text-[10px] font-mono uppercase tracking-wider text-copper hover:text-copper-light hover:bg-copper/10 border border-copper/20 rounded-full shrink-0 flex items-center gap-1.5"
        >
          <Info className="size-3" aria-hidden="true" />
          View Permissions Scope
        </Button>
      </aside>

      <Dialog open={scopeOpen} onOpenChange={setScopeOpen}>
        <DialogContent className="max-w-2xl bg-background border border-border/60">
          <DialogHeader className="pb-2 border-b border-border/40">
            <div className="flex items-center gap-2 text-copper mb-1">
              <Shield className="size-4" />
              <span className="font-mono text-[10px] uppercase font-bold tracking-widest">
                Team Role Scope
              </span>
            </div>
            <DialogTitle className="font-display text-2xl font-semibold text-foreground">
              {config.label} Permissions on {eventName}
            </DialogTitle>
            <p className="text-xs text-muted-foreground leading-relaxed pt-1">
              {config.description}
            </p>
          </DialogHeader>

          <div className="py-2">
            <h4 className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-3">
              Role Capabilities Matrix
            </h4>
            <div className="border border-border/40 rounded-xl overflow-hidden divide-y divide-border/20 text-xs">
              <div className="grid grid-cols-12 bg-stone-500/10 px-3 py-2 font-mono text-[10px] uppercase font-bold text-muted-foreground">
                <span className="col-span-8">Capability</span>
                <span className="col-span-4 text-center">Your Access</span>
              </div>
              {permissionsMatrix.map((item) => {
                const isAllowed = item[role as keyof typeof item] as boolean
                return (
                  <div
                    key={item.feature}
                    className={`grid grid-cols-12 px-3 py-2.5 items-center transition-colors ${
                      isAllowed ? 'bg-background' : 'bg-muted/10 opacity-75'
                    }`}
                  >
                    <span className="col-span-8 font-sans text-xs text-foreground font-medium flex items-center gap-2">
                      {isAllowed ? (
                        <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Lock className="size-3.5 text-muted-foreground/60 shrink-0" />
                      )}
                      {item.feature}
                    </span>
                    <span className="col-span-4 flex justify-center">
                      {isAllowed ? (
                        <span className="font-mono text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          Allowed
                        </span>
                      ) : (
                        <span className="font-mono text-[9px] uppercase font-bold text-muted-foreground bg-stone-500/10 border border-border/30 px-2 py-0.5 rounded-full">
                          Restricted
                        </span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

