interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  sub: string
  accent?: 'admitted' | 'signal' | 'copper'
}

export function StatCard({ icon, label, value, sub, accent }: StatCardProps) {
  const valueColor =
    accent === 'admitted'
      ? 'text-admitted'
      : accent === 'signal'
      ? 'text-signal'
      : accent === 'copper'
      ? 'text-copper'
      : 'text-foreground'

  return (
    <div className="bg-background p-5 flex flex-col gap-2" role="listitem">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/70">
          {label}
        </span>
      </div>
      <p
        className={`font-display text-4xl leading-none ${valueColor}`}
        aria-label={`${label}: ${value}`}
      >
        {value}
      </p>
      <p className="font-mono text-[9px] uppercase tracking-widest text-foreground/40">
        {sub}
      </p>
    </div>
  )
}
