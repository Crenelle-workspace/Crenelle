'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface SpotlightCardProps {
  children: React.ReactNode
  className?: string
  bgClass?: string
}

export function SpotlightCard({ children, className, bgClass }: SpotlightCardProps) {
  const [mouseX, setMouseX] = useState(0)
  const [mouseY, setMouseY] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    setMouseX(e.clientX - rect.left)
    setMouseY(e.clientY - rect.top)
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative rounded-3xl border border-border/40 dark:border-border/10 p-6 flex flex-col justify-between overflow-hidden bg-card hover:border-copper/30 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.015)] dark:shadow-none",
        bgClass,
        className
      )}
    >
      {/* Moving Border Spotlight Glow */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px rounded-3xl border border-transparent z-10 transition-opacity duration-300"
          style={{
            background: `radial-gradient(140px circle at ${mouseX}px ${mouseY}px, rgba(191, 132, 48, 0.12), transparent 80%)`,
          }}
        />
      )}
      {children}
    </div>
  )
}
