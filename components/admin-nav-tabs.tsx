'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, TrendingUp } from 'lucide-react'

export function AdminNavTabs() {
  const pathname = usePathname()

  const tabs = [
    {
      name: 'Overview',
      href: '/admin',
      icon: LayoutDashboard,
      active: pathname === '/admin',
    },
    {
      name: 'Revenue & Income',
      href: '/admin/revenue',
      icon: TrendingUp,
      active: pathname.startsWith('/admin/revenue'),
    },
  ]

  return (
    <div className="border-b border-border bg-background/50 backdrop-blur-md px-6 md:px-10">
      <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-2.25 ${
                tab.active
                  ? 'border-copper text-foreground font-semibold bg-copper/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${tab.active ? 'text-copper' : 'text-muted-foreground'}`} />
              <span>{tab.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
