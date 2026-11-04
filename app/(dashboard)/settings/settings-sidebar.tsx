'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mail, User, Sliders, CreditCard } from 'lucide-react'

export function SettingsSidebar() {
  const pathname = usePathname()

  const navItems = [
    {
      label: 'Sender Profiles',
      href: '/settings/sender-profiles',
      icon: Mail,
      disabled: false,
    },
    {
      label: 'Account',
      href: '/settings/account',
      icon: User,
      disabled: false,
    },
    {
      label: 'General',
      href: '/settings/general',
      icon: Sliders,
      disabled: false,
    },
    {
      label: 'Payments',
      href: '/settings/payments',
      icon: CreditCard,
      disabled: false,
    },
  ]

  return (
    <nav
      aria-label="Settings sections"
      className="mb-8 select-none w-full max-w-full overflow-x-auto no-scrollbar py-1"
    >
      <div className="inline-flex min-w-max gap-1.5 border border-border/40 bg-card/40 backdrop-blur-xl p-1.5 rounded-full shadow-xs">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href) && !item.disabled

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-2 font-sans text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 ${
                isActive
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-stone-500/10'
              }`}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

