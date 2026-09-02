'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, ChevronDown, ChevronUp, User } from 'lucide-react'
import { SectionShell, SectionHeader } from './ShowcaseSection'
import { resolveAvatarUrl } from '@/lib/images'
import type { SpeakerInfo } from '@/lib/types'

interface EventSpeakersProps {
  speakers?: SpeakerInfo[] | null
  index: string
}

function SpeakerCard({ speaker, index }: { speaker: SpeakerInfo; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isLongBio = (speaker.bio?.length ?? 0) > 160

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      className="group relative flex flex-col bg-card p-6 transition-colors hover:bg-secondary/40"
    >
      {/* Copper top reveal */}
      <span className="absolute inset-x-0 top-0 h-px scale-x-0 bg-copper transition-transform duration-300 group-hover:scale-x-100" />

      <div className="flex items-start gap-4">
        {speaker.avatar_url ? (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveAvatarUrl(speaker.avatar_url)}
              alt={speaker.name}
              className="h-full w-full object-cover object-center grayscale transition-all duration-500 group-hover:grayscale-0"
            />
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-border bg-secondary/40 text-copper">
            <User size={24} strokeWidth={1.5} className="text-copper" />
          </div>
        )}

        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="truncate font-display text-xl font-medium leading-tight text-foreground">
            {speaker.name}
          </h3>
          <p className="mt-0.5 truncate text-sm font-medium text-copper-light">
            {speaker.role}
          </p>
          {speaker.company && (
            <p className="mt-1 flex items-center gap-1.5 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <Building2 size={11} strokeWidth={1.75} />
              {speaker.company}
            </p>
          )}
        </div>
      </div>

      {speaker.bio && (
        <div className="mt-4 border-t border-border pt-4">
          <p
            className={`text-sm leading-relaxed text-muted-foreground ${
              !isExpanded && isLongBio ? 'line-clamp-4' : ''
            }`}
          >
            {speaker.bio}
          </p>
          {isLongBio && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="mt-2 inline-flex items-center gap-1 font-mono text-xs font-medium text-copper transition-colors hover:text-copper-light cursor-pointer focus:outline-hidden"
            >
              {isExpanded ? (
                <>
                  <span>Show less</span>
                  <ChevronUp size={13} strokeWidth={2} />
                </>
              ) : (
                <>
                  <span>Read more</span>
                  <ChevronDown size={13} strokeWidth={2} />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

export function EventSpeakers({ speakers, index }: EventSpeakersProps) {
  if (!speakers || speakers.length === 0) return null

  return (
    <SectionShell className="p-6 sm:p-9">
      <SectionHeader index={index} kicker="Line-up" title="Speakers & hosts" />

      <div className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
        {speakers.map((speaker, idx) => (
          <SpeakerCard key={speaker.id || idx} speaker={speaker} index={idx} />
        ))}
      </div>
    </SectionShell>
  )
}

