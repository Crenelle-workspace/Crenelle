'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Building2, Mail, CreditCard, FileText, CheckCircle2, ChevronRight, X, Sparkles } from 'lucide-react'

export interface SetupStatus {
  hasOrgName: boolean
  hasSenderProfile: boolean
  hasPaymentSubaccount: boolean
  hasEmailFooter: boolean
}

interface WorkspaceSetupCardProps {
  status: SetupStatus
}

const STORAGE_KEY = 'crenelle_dismiss_setup_card'

const emptySubscribe = () => () => {}
const getSnapshot = () => (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) === 'true' : false)
const getServerSnapshot = () => false

export function WorkspaceSetupCard({ status }: WorkspaceSetupCardProps) {
  const isDismissedInStorage = useSyncExternalStore(
    emptySubscribe,
    getSnapshot,
    getServerSnapshot
  )
  const [userDismissed, setUserDismissed] = useState(false)
  const dismissed = isDismissedInStorage || userDismissed

  // Calculate completion
  const items = [
    {
      id: 'org',
      label: 'Organization Details',
      desc: 'Set your organization name, default timezone, and ticket currency.',
      isComplete: status.hasOrgName,
      requiredTag: null,
      href: '/settings/general',
      icon: Building2,
    },
    {
      id: 'sender',
      label: 'Sender Profile',
      desc: 'Define branded "From:" display name and reply-to email.',
      isComplete: status.hasSenderProfile,
      requiredTag: 'Recommended',
      href: '/settings/sender-profiles',
      icon: Mail,
    },
    {
      id: 'payout',
      label: 'Payout Account',
      desc: 'Connect your bank account to receive payouts for ticket sales.',
      isComplete: status.hasPaymentSubaccount,
      requiredTag: 'Required for Paid Tickets',
      href: '/settings/payments',
      icon: CreditCard,
    },
    {
      id: 'footer',
      label: 'Email Footer',
      desc: 'Append legal disclaimer or contact info to guest emails.',
      isComplete: status.hasEmailFooter,
      requiredTag: 'Optional',
      href: '/settings/general',
      icon: FileText,
    },
  ]

  const completedCount = items.filter((i) => i.isComplete).length
  const totalCount = items.length
  const percent = Math.round((completedCount / totalCount) * 100)

  // If all setup items are complete or card is dismissed, hide the full card
  if (dismissed || completedCount === totalCount) {
    return null
  }

  function handleDismiss() {
    setUserDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-copper/30 bg-card/60 backdrop-blur-xl p-6 sm:p-8 shadow-2xl transition-all duration-300 animate-fade-up">
      {/* Decorative accent top bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-copper via-copper/60 to-transparent" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-copper bg-copper/10 border border-copper/20 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
              <Sparkles className="size-3 text-copper" />
              Workspace Readiness
            </span>
            <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {completedCount}/{totalCount} Completed ({percent}%)
            </span>
          </div>
          <h2 className="font-sans text-lg font-bold text-foreground tracking-tight">
            Configure Your Workspace
          </h2>
          <p className="font-sans text-xs text-muted-foreground max-w-xl">
            Complete these quick setup items so your events run smoothly. You can set them up now or edit anytime.
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-full border border-border/40 text-muted-foreground hover:text-foreground hover:bg-stone-500/10 transition-colors cursor-pointer"
          aria-label="Dismiss setup card"
          title="Dismiss card"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-copper rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Checklist items grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`group flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-300 ${
                item.isComplete
                  ? 'border-emerald-500/20 bg-emerald-500/5 text-foreground'
                  : 'border-border/50 bg-stone-900/20 hover:border-copper/40 hover:bg-copper/5 text-foreground'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  item.isComplete
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-copper/10 text-copper group-hover:scale-105 transition-transform'
                }`}
              >
                {item.isComplete ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-sans text-xs font-bold text-foreground group-hover:text-copper transition-colors truncate">
                    {item.label}
                  </h3>
                  {item.isComplete ? (
                    <span className="font-mono text-[9px] font-bold text-emerald-400 uppercase tracking-widest shrink-0">
                      Done
                    </span>
                  ) : item.requiredTag ? (
                    <span
                      className={`font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                        item.requiredTag.includes('Required')
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-muted text-muted-foreground border border-border/40'
                      }`}
                    >
                      {item.requiredTag}
                    </span>
                  ) : null}
                </div>

                <p className="font-sans text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                  {item.desc}
                </p>
              </div>

              <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-copper group-hover:translate-x-0.5 transition-all shrink-0 self-center" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
