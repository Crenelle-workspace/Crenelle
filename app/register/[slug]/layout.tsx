import type { Metadata } from 'next'
import { Bebas_Neue } from 'next/font/google'

const bebasNeue = Bebas_Neue({ 
  weight: '400', 
  subsets: ['latin'],
  variable: '--font-display'
})

export const metadata: Metadata = {
  title: 'Event Registration',
  description: 'Register for an upcoming event.',
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${bebasNeue.variable} min-h-screen bg-background`}>
      {children}
    </div>
  )
}
