'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * Editorial section primitives for the public event showcase.
 *
 * The Crenelle brand language is architectural, not glassmorphic:
 * hairline borders, near-square corners, a copper hairline accent,
 * Cormorant serif display headings, and mono index labels. These
 * primitives keep every showcase section speaking that one language.
 */

interface SectionShellProps {
  children: ReactNode
  className?: string
}

/** A bordered editorial panel. No blur, no glow — just structure. */
export function SectionShell({ children, className = '' }: SectionShellProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`border border-border bg-card ${className}`}
    >
      {children}
    </motion.section>
  )
}

interface SectionHeaderProps {
  /** Two-digit index, e.g. "02" */
  index: string
  /** Small mono kicker above the title */
  kicker: string
  /** Serif display title */
  title: string
}

/** Numbered editorial header: mono index + kicker, serif title, copper rule. */
export function SectionHeader({ index, kicker, title }: SectionHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs font-medium tracking-[0.2em] text-copper">
          {index}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {kicker}
        </span>
      </div>
      <h2 className="mt-2 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <div className="mt-5 h-px w-full bg-linear-to-r from-copper/60 via-border to-transparent" />
    </div>
  )
}
