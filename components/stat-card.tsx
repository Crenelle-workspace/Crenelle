interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  subtext?: string
  accent?: 'admitted' | 'signal' | 'copper'
}

export function StatCard({ icon, label, value, sub, subtext, accent }: StatCardProps) {
  const subtitle = sub ?? subtext ?? ''
  const valueColor =
    accent === 'admitted'
      ? 'text-admitted'
      : accent === 'signal'
      ? 'text-signal'
      : accent === 'copper'
      ? 'text-copper'
      : 'text-foreground'

  return (
    <div className="bg-card/40 backdrop-blur-md border border-border/40 p-5 rounded-2xl flex flex-col gap-2.5 hover:border-copper/30 transition-all duration-300 shadow-sm select-none" role="listitem">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-copper/10 text-copper shrink-0">
          {icon}
        </div>
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">
          {label}
        </span>
      </div>
      <p
        className={`font-mono text-3xl font-bold leading-none ${valueColor}`}
        aria-label={`${label}: ${value}`}
      >
        {value}
      </p>
      {subtitle && (
        <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
          {subtitle}
        </p>
      )}
    </div>
  )
}
