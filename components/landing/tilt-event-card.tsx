'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TiltEventCardProps {
  children: React.ReactNode
  imageUrl: string
  className?: string
  bgClass?: string
}

export function TiltEventCard({ children, imageUrl, className, bgClass }: TiltEventCardProps) {
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [glareX, setGlareX] = useState(50)
  const [glareY, setGlareY] = useState(50)
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const percentX = (mouseX / width) - 0.5
    const percentY = (mouseY / height) - 0.5

    setRotateX(-percentY * 8)
    setRotateY(percentX * 8)

    setGlareX((mouseX / width) * 100)
    setGlareY((mouseY / height) * 100)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setRotateX(0)
    setRotateY(0)
  }

  return (
    <div
      className="perspective-1000 w-full"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        animate={{
          rotateX: isHovered ? rotateX : 0,
          rotateY: isHovered ? rotateY : 0,
          scale: isHovered ? 1.01 : 1,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={cn(
          "relative rounded-3xl border border-border/40 dark:border-border/10 overflow-hidden min-h-[320px] flex flex-col justify-end p-6 select-none shadow-[0_8px_30px_rgba(0,0,0,0.015)] dark:shadow-none transition-colors duration-300 w-full group",
          bgClass,
          className
        )}
      >
        {/* Background Event Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={imageUrl}
            alt="Event cover banner"
            className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-102 transition-all duration-700"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/50 to-black/10 z-10" />
        </div>

        {/* Glare sheen */}
        {isHovered && (
          <div
            className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle 200px at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.08), transparent 85%)`,
            }}
          />
        )}

        {/* Dynamic Card Content Overlaid on Dark Gradient */}
        <div className="relative z-20 text-stone-100 space-y-2 text-left">
          {children}
        </div>
      </motion.div>
    </div>
  )
}
