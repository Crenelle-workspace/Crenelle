import { cn } from "@/lib/utils"

interface ControlBarProps {
  filter: string
  setFilter: (filter: string) => void
  sortBy: "updated" | "created" | "name"
  setSortBy: (sort: "updated" | "created" | "name") => void
}

export function ControlBar({ filter, setFilter, sortBy, setSortBy }: ControlBarProps) {
  const filters = [
    { id: "all",       label: "All" },
    { id: "active",    label: "Live" },
    { id: "published", label: "Published" },
    { id: "draft",     label: "Draft" },
    { id: "closed",    label: "Ended" },
  ]

  return (
    <div className="flex flex-col sm:flex-row gap-5 mb-8 pb-6 border-b border-border/40 justify-between items-start sm:items-center">
      {/* Status filter pills */}
      <div className="flex flex-col gap-2 flex-1">
        <span className="font-mono text-[9px] uppercase font-bold tracking-wider text-muted-foreground/75">
          Filter Events
        </span>
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const isActive = filter === f.id
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "px-3.5 py-1.5 font-sans text-xs font-bold rounded-full border transition-all duration-300 cursor-pointer select-none",
                  isActive
                    ? "bg-foreground text-background border-foreground shadow-xs"
                    : "bg-stone-500/10 dark:bg-stone-900/30 text-muted-foreground border-border/40 hover:border-border hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sort select */}
      <div className="flex flex-col gap-2 min-w-40">
        <span className="font-mono text-[9px] uppercase font-bold tracking-wider text-muted-foreground/75">
          Sort Order
        </span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "updated" | "created" | "name")}
          className="bg-stone-900/30 dark:bg-stone-900/50 border border-border/40 px-3.5 py-2 rounded-xl font-sans text-xs font-semibold text-foreground focus:outline-none focus:border-copper focus:ring-2 focus:ring-copper/20 appearance-none cursor-pointer h-9.5"
          style={{
            backgroundImage:
              "linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%)",
            backgroundPosition: "calc(100% - 14px) center, calc(100% - 9px) center",
            backgroundSize: "4px 4px, 4px 4px",
            backgroundRepeat: "no-repeat",
          }}
        >
          <option value="updated">Last updated</option>
          <option value="created">Date created</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
    </div>
  )
}
