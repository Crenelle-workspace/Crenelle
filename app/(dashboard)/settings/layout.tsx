import { ReactNode } from 'react'
import { SettingsSidebar } from './settings-sidebar'

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-125">
      <div className="mb-6">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-copper bg-copper/10 border border-copper/20 px-2.5 py-1 rounded-full inline-block mb-2">
          Settings Menu
        </span>
        <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase text-foreground leading-[0.95] tracking-tight">
          Workspace Settings
        </h1>
      </div>
      <div className="lg:hidden">
        <SettingsSidebar />
      </div>
      <div className="min-w-0">
        {children}
      </div>
    </div>
  )
}

