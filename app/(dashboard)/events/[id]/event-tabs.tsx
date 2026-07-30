'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Tab {
  label: string
  href: string
}

interface EventTabsProps {
  id: string
  tabs: Tab[]
}

export function EventTabs({ id, tabs }: EventTabsProps) {
  const pathname = usePathname()

  return (
    <nav aria-label="Event sections" className="mb-10 select-none w-full max-w-full overflow-x-auto no-scrollbar py-1">
      <div className="inline-flex min-w-max gap-1.5 border border-border/40 bg-card/40 backdrop-blur-xl p-1.5 rounded-full shadow-xs">
        {tabs.map((tab) => {
          const fullHref = `/events/${id}${tab.href}`
          const isActive = tab.href === ''
            ? pathname === fullHref
            : pathname === fullHref || pathname.startsWith(fullHref + '/')

          return (
            <Link
              key={tab.label}
              href={fullHref}
              aria-current={isActive ? 'page' : undefined}
              className={`font-sans text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 ${
                isActive
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-stone-500/10'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
