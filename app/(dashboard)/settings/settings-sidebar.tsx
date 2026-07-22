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
    <div className="flex flex-col gap-6 select-none">
      <div>
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-copper bg-copper/10 border border-copper/20 px-2.5 py-1 rounded-full inline-block mb-4">
          Settings Menu
        </span>
        <nav aria-label="Settings sections" className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-visible border-b md:border-b-0 border-border/40 pb-3 md:pb-0">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href) && !item.disabled

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-2.5 px-4 py-2.5 font-sans text-xs font-bold rounded-xl transition-all duration-300 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-foreground text-background shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-stone-500/10'
                }`}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
