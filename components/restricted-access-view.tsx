import Link from 'next/link'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RestrictedAccessViewProps {
  title?: string
  description?: string
  eventId: string
  requiredRole?: string
}

export function RestrictedAccessView({
  title = 'Organizer Access Required',
  description = 'Team member invitations and permission management are restricted to the primary event organizer.',
  eventId,
  requiredRole = 'Event Organizer',
}: RestrictedAccessViewProps) {
  return (
    <div className="w-full py-16 px-4 flex flex-col items-center justify-center text-center">
      <div className="size-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6 shadow-xs">
        <ShieldAlert className="size-8" aria-hidden="true" />
      </div>

      <span className="font-mono text-[10px] uppercase font-bold tracking-[0.2em] text-copper bg-copper/10 border border-copper/20 px-3 py-1 rounded-full mb-3">
        Action Restricted // {requiredRole}
      </span>

      <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight max-w-lg mb-3">
        {title}
      </h2>

      <p className="font-sans text-sm text-muted-foreground max-w-md leading-relaxed mb-8">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href={`/events/${eventId}`}>
          <Button variant="copper" className="gap-2 h-10 px-5 text-xs font-bold rounded-full">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to Event Overview
          </Button>
        </Link>
      </div>
    </div>
  )
}

