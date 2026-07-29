'use client'

import { motion } from 'framer-motion'
import { Mic } from 'lucide-react'
import { SectionShell, SectionHeader } from './ShowcaseSection'
import type { AgendaItem } from '@/lib/types'

interface EventAgendaTimelineProps {
  agenda?: AgendaItem[] | null
}

export function EventAgendaTimeline({ agenda }: EventAgendaTimelineProps) {
  if (!agenda || agenda.length === 0) return null

  return (
    <SectionShell className="p-6 sm:p-9">
      <SectionHeader index="02" kicker="Itinerary" title="Schedule & agenda" />

      <ol className="relative">
        {agenda.map((item, index) => (
          <motion.li
            key={item.id || index}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, delay: index * 0.06 }}
            className="group grid grid-cols-[auto_1fr] gap-x-5 sm:grid-cols-[7rem_1fr] sm:gap-x-8"
          >
            {/* Time column */}
            <div className="pb-8 text-right">
              <span className="font-display text-lg font-semibold leading-tight text-copper-light sm:text-xl">
                {item.time}
              </span>
            </div>

            {/* Spine + content */}
            <div className="relative border-l border-border pb-8 pl-5 sm:pl-7 group-last:border-transparent">
              {/* Node */}
              <span className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full border border-copper bg-background transition-colors group-hover:bg-copper" />

              <h3 className="font-display text-lg font-medium leading-snug text-foreground sm:text-xl">
                {item.title}
              </h3>

              {item.speaker && (
                <p className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <Mic size={12} strokeWidth={1.75} className="text-copper" />
                  {item.speaker}
                </p>
              )}

              {item.description && (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              )}
            </div>
          </motion.li>
        ))}
      </ol>
    </SectionShell>
  )
}
