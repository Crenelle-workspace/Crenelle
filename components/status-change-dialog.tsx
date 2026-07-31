'use client'

import { useState, useTransition } from 'react'
import { updateEventStatus } from '@/app/actions/events'
import { toast } from 'sonner'

interface StatusChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  eventName: string
  currentStatus: string
}

const statuses = [
  { value: 'draft',     label: 'Draft',     desc: 'Setup in progress, scanning closed' },
  { value: 'published', label: 'Published', desc: 'Ready to go, scanning not yet open' },
  { value: 'live',      label: 'Live',      desc: 'Scanning open — ushers can admit guests' },
  { value: 'ended',     label: 'Ended',     desc: 'Event over, all scanning blocked' },
]

export function StatusChangeDialog({
  open, onOpenChange, eventId, eventName, currentStatus
}: StatusChangeDialogProps) {
  const [selected, setSelected] = useState(currentStatus)
  const [isPending, startTransition] = useTransition()

  if (!open) return null

  function handleConfirm() {
    startTransition(async () => {
      const result = await updateEventStatus(eventId, selected)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`Status updated to ${selected}`)
        onOpenChange(false)
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div className="relative z-10 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/40">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-copper mb-1">
            Change Event Status
          </p>
          <h2 id="status-dialog-title" className="font-sans text-xl font-bold text-foreground tracking-tight">
            {eventName}
          </h2>
        </div>

        {/* Status options */}
        <div className="p-6 flex flex-col gap-2.5">
          {statuses.map(s => {
            const isActive = selected === s.value
            const isCurrent = currentStatus === s.value
            return (
              <button
                key={s.value}
                onClick={() => setSelected(s.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'border-copper bg-copper/10 text-foreground shadow-xs'
                    : 'border-border/50 hover:border-copper/40 bg-stone-100/60 dark:bg-stone-900/30 text-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-sans text-sm font-bold text-foreground">{s.label}</span>
                  <div className="flex items-center gap-2">
                    {isCurrent && (
                      <span className="font-mono text-[9px] uppercase font-bold tracking-wider text-stone-700 dark:text-stone-300 border border-border/60 px-2 py-0.5 rounded-full bg-stone-200/80 dark:bg-stone-800/80">
                        Current
                      </span>
                    )}
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-copper shadow-[0_0_8px_#BF8430]" />
                    )}
                  </div>
                </div>
                <p className={`font-sans text-xs mt-0.5 leading-relaxed ${
                  isActive
                    ? 'text-foreground/90 font-medium'
                    : 'text-stone-600 dark:text-stone-300 font-medium'
                }`}>
                  {s.desc}
                </p>
              </button>
            )
          })}
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-6 flex items-center gap-3">
          <button
            onClick={handleConfirm}
            disabled={isPending || selected === currentStatus}
            className="flex-1 bg-copper hover:bg-copper-dark text-white font-sans text-xs font-bold px-5 py-3 rounded-full transition-all duration-300 shadow-md shadow-copper/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? 'Updating...' : `Set to ${statuses.find(s => s.value === selected)?.label}`}
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="px-5 py-3 font-sans text-xs font-bold text-stone-700 dark:text-stone-300 border border-border/60 hover:border-border hover:text-foreground rounded-full transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
