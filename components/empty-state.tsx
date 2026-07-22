import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'relative border border-border/40 bg-card/20 backdrop-blur-md rounded-2xl py-16 px-6 flex flex-col items-center justify-center text-center overflow-hidden min-h-[350px] group/empty select-none',
        className
      )}
    >
      {/* Subtle grid background pattern */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[20px_20px] opacity-30 dark:opacity-10 pointer-events-none" 
      />

      {icon && (
        <div className="w-14 h-14 rounded-2xl border border-copper/30 flex items-center justify-center bg-copper/10 text-copper mb-5 shrink-0 relative transition-all duration-300 group-hover/empty:border-copper/60 group-hover/empty:scale-105 shadow-md shadow-copper/5">
          <div className="w-7 h-7 flex items-center justify-center">
            {icon}
          </div>
        </div>
      )}

      <h3 className="font-sans text-xl font-bold tracking-tight text-foreground mb-2 relative">
        {title}
      </h3>

      {subtitle && (
        <p className="font-sans text-xs text-muted-foreground max-w-sm leading-relaxed relative">
          {subtitle}
        </p>
      )}

      {action && <div className="mt-6 relative z-10">{action}</div>}
    </div>
  )
}
