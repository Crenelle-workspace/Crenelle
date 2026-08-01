import { Globe } from "lucide-react"
import { cn } from "@/lib/utils"

interface EventCardProps {
  name: string
  date: string
  time: string
  guestCount: number
  capacity: number
  status: "OPEN" | "CLOSED" | "LIVE" | "PUBLISHED" | "DRAFT"
  eventType?: "closed" | "open"
  onStatusClick?: (e: React.MouseEvent) => void
  className?: string
  guestLabel?: string
}

export function EventCard({
  name,
  date,
  time,
  guestCount,
  capacity,
  status,
  eventType = 'closed',
  onStatusClick,
  className,
  guestLabel,
}: EventCardProps) {
  const percentage = capacity > 0 ? Math.min((guestCount / capacity) * 100, 100) : 0

  const statusConfig: Record<string, { cls: string; label: string }> = {
    LIVE:      { cls: "status-live",      label: "Live" },
    PUBLISHED: { cls: "status-published", label: "Published" },
    DRAFT:     { cls: "status-draft",     label: "Draft" },
    OPEN:      { cls: "status-open",      label: "Open" },
    CLOSED:    { cls: "status-ended",     label: "Closed" },
  }

  const { cls, label } = statusConfig[status] ?? statusConfig.DRAFT
  const manifestNum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 9000 + 1000

  return (
    <div className={cn(
      "relative w-full bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl overflow-hidden flex hover:border-copper/40 hover:shadow-lg hover:shadow-copper/5 transition-all duration-300 group select-none",
      className
    )}>
      {/* Copper left accent bar */}
      <div className="w-1.5 shrink-0 bg-copper/60 group-hover:bg-copper group-hover:shadow-[0_0_12px_#BF8430] transition-all duration-300" />

      {/* Ticket body */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top: identity */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-start gap-4">
            {/* Name + meta — takes all space EXCEPT status */}
            <div className="flex-1 min-w-0 pr-2 space-y-2">
              <h2
                className="font-sans font-bold leading-tight tracking-tight text-foreground truncate"
                style={{ fontSize: 'clamp(18px, 2.2vw, 24px)' }}
              >
                {name}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/80 bg-stone-500/10 border border-border/30 px-2 py-0.5 rounded-md">
                  #{manifestNum}
                </span>
                <span className="font-sans text-xs text-muted-foreground font-medium">
                  {date} {time && `· ${time}`}
                </span>
                {eventType === 'open' && (
                  <span className="flex items-center gap-1 font-sans text-[10px] tracking-wider text-copper border border-copper/30 bg-copper/10 px-2.5 py-0.5 rounded-full font-bold">
                    <Globe className="h-2.5 w-2.5" />
                    Public Event
                  </span>
                )}
              </div>
            </div>

            {/* Status badge — clickable if handler provided */}
            {onStatusClick ? (
              <button
                onClick={onStatusClick}
                className={cn(
                  "shrink-0 mt-0.5 cursor-pointer hover:opacity-85 transition-opacity px-2.5 py-0.5 text-[10px] font-bold rounded-full border",
                  cls
                )}
                title="Click to change status"
                aria-label={`Status: ${label} — click to change`}
              >
                {label}
              </button>
            ) : (
              <span className={cn("shrink-0 mt-0.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full border", cls)}>{label}</span>
            )}
          </div>
        </div>

        {/* Perforated divider */}
        <div className="relative mx-4">
          <div className="border-t border-dashed border-border/40" />
          <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-background border-r border-border/40" />
          <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-background border-l border-border/40" />
        </div>

        {/* Bottom: metrics */}
        <div className="px-6 py-4 flex items-center gap-8">
          <div>
            <p className="font-sans text-[9px] uppercase font-bold tracking-wider text-muted-foreground/75 mb-1">
              {guestLabel || "Guests"}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-2xl font-bold text-foreground leading-none">
                {guestCount.toString().padStart(3, '0')}
              </span>
              <span className="font-mono text-xs text-muted-foreground">/ {capacity}</span>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex justify-between mb-1.5">
              <p className="font-sans text-[9px] uppercase font-bold tracking-wider text-muted-foreground/75">Capacity</p>
              <p className="font-mono text-[9px] font-bold text-copper">{Math.round(percentage)}%</p>
            </div>
            <div className="w-full h-1.5 bg-stone-200/50 dark:bg-stone-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-copper rounded-full transition-all duration-700 shadow-xs shadow-copper/50"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Fine print */}
        <div className="px-6 py-2.5 border-t border-border/20 flex justify-between bg-stone-500/2">
          <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/50">
            CRENELLE SECURITY PASS
          </span>
          <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/50">
            256-BIT ENCRYPTED
          </span>
        </div>
      </div>
    </div>
  )
}
