import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  eyebrow: string
  title: string
  subtitle?: React.ReactNode
  /** Renders a live blinking dot beside the eyebrow label */
  live?: boolean
  className?: string
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  live = false,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn(className)}>
      <div className="flex items-center gap-2 mb-1.5">
        {live && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        )}
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-copper">
          {eyebrow}
        </p>
      </div>
      <h2 className="font-sans text-3xl font-black tracking-tight text-foreground leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="font-sans text-xs text-muted-foreground leading-relaxed mt-1.5 max-w-xl">
          {subtitle}
        </p>
      )}
    </div>
  )
}
