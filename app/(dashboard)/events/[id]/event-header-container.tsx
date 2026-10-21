'use client'

import { usePathname } from 'next/navigation'

interface EventHeaderContainerProps {
  id: string
  children: React.ReactNode
}

/**
 * On laptop & larger screens (lg+), the event overview page (/events/[id]) displays
 * the full event profile header. On sub-pages (/tickets, /email, /guests, etc.),
 * the bulky header is hidden on lg+ because the sidebar and topbar already provide full
 * context, allowing the sub-page content to take center stage.
 *
 * On mobile and tablet (< lg), the header is always rendered across all sub-pages since
 * there is no permanent sidebar.
 */
export function EventHeaderContainer({ id, children }: EventHeaderContainerProps) {
  const pathname = usePathname()
  const isOverview = pathname === `/events/${id}` || pathname === `/events/${id}/`

  return (
    <div className={isOverview ? 'block' : 'block lg:hidden'}>
      {children}
    </div>
  )
}
