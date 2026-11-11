import { Lock, Eye } from 'lucide-react'

interface ReadOnlyPillProps {
  label?: string
  hint?: string
  mode?: 'read-only' | 'view-only' | 'preview'
  className?: string
}

export function ReadOnlyPill({
  label,
  hint,
  mode = 'read-only',
  className = '',
}: ReadOnlyPillProps) {
  const defaultLabel =
    label ??
    (mode === 'preview'
      ? 'PREVIEW MODE'
      : mode === 'view-only'
        ? 'VIEW-ONLY MODE'
        : 'READ-ONLY // OWNER MANAGED')

  const defaultHint =
    hint ??
    (mode === 'preview'
      ? 'Configuration can only be saved by the event organizer'
      : mode === 'view-only'
        ? 'Modifications are restricted for your role'
        : 'Configured exclusively by the event organizer')

  return (
    <span
      title={defaultHint}
      className={`inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-border/60 bg-stone-500/10 text-muted-foreground select-none cursor-help ${className}`}
    >
      {mode === 'view-only' ? (
        <Eye className="size-2.5 text-copper shrink-0" aria-hidden="true" />
      ) : (
        <Lock className="size-2.5 text-copper shrink-0" aria-hidden="true" />
      )}
      {defaultLabel}
    </span>
  )
}

