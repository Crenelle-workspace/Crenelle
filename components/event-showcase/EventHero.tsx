'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { getOptimizedBannerUrl } from '@/lib/images'
import { AddToCalendar } from './AddToCalendar'
import { Calendar, Clock, MapPin, ArrowUpRight, Share2, Check } from 'lucide-react'
import { toast } from 'sonner'

interface EventHeroProps {
  name: string
  date: string
  time?: string | null
  timezone?: string
  venue: string
  bannerUrl?: string | null
  locationUrl?: string | null
  description?: string | null
}

export function EventHero({
  name,
  date,
  time,
  timezone = 'Africa/Lagos',
  venue,
  bannerUrl,
  locationUrl,
  description,
}: EventHeroProps) {
  const [copied, setCopied] = useState(false)
  const optimizedBanner = getOptimizedBannerUrl(bannerUrl, 'web')

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: name,
          text: `Join us at ${name}!`,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        toast.success('Event link copied to clipboard!')
        setTimeout(() => setCopied(false), 2500)
      }
    } catch {
      // User cancelled share
    }
  }

  const parsed = (() => {
    try {
      const d = new Date(date)
      if (isNaN(d.getTime())) return null
      return {
        weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
        day: d.toLocaleDateString('en-US', { day: '2-digit' }),
        month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        year: d.getFullYear().toString(),
        full: d.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      }
    } catch {
      return null
    }
  })()

  return (
    <section className="border border-border bg-card">
      {/* ── Cinematic banner ── */}
      <div className="relative w-full">
        {optimizedBanner ? (
          <div className="relative h-[52vh] min-h-95 w-full overflow-hidden sm:h-[62vh] sm:min-h-115">
            <motion.img
              initial={{ scale: 1.08, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              src={optimizedBanner}
              alt={name}
              className="h-full w-full object-cover object-center"
            />
            {/* Editorial gradient: heavy floor, clean top */}
            <div className="absolute inset-0 bg-linear-to-t from-ink via-ink/70 to-ink/10" />
            <div className="absolute inset-0 bg-linear-to-r from-ink/60 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="relative h-[40vh] min-h-80 w-full overflow-hidden">
            {/* Fallback: architectural grid on deep ink, no banner */}
            <div className="absolute inset-0 bg-linear-to-br from-graphite via-lead to-ink" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[2.5rem_2.5rem] opacity-30" />
            <div className="absolute inset-0 bg-linear-to-t from-ink via-ink/70 to-transparent" />
          </div>
        )}

        {/* ── Overlaid title block ── */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-8 sm:px-10 sm:pb-10">
          <div className="mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2"
            >
              <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-copper-light">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-copper" />
                Featured Event
              </span>
              <span className="h-3 w-px bg-white/20" />
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/60">
                {timezone}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-4xl font-display text-4xl font-medium leading-[1.02] tracking-tight text-white drop-shadow-sm sm:text-6xl lg:text-7xl"
            >
              {name}
            </motion.h1>
          </div>
        </div>
      </div>

      {/* ── Spec bar: date · time · location ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mx-auto max-w-5xl px-6 sm:px-10"
      >
        <div className="grid grid-cols-1 divide-y divide-border border-b border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {/* Date */}
          <div className="py-6 sm:pr-8">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <Calendar size={13} strokeWidth={1.75} className="text-copper" />
              Date
            </p>
            <p className="mt-2 text-[15px] font-semibold leading-snug text-foreground">
              {parsed ? parsed.full : date}
            </p>
          </div>

          {/* Time */}
          <div className="py-6 sm:px-8">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <Clock size={13} strokeWidth={1.75} className="text-copper" />
              Time
            </p>
            <p className="mt-2 text-[15px] font-semibold leading-snug text-foreground">
              {time || 'To be announced'}
            </p>
          </div>

          {/* Location */}
          <div className="flex items-start justify-between gap-4 py-6 sm:pl-8">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <MapPin size={13} strokeWidth={1.75} className="text-copper" />
                Location
              </p>
              <p className="mt-2 truncate text-[15px] font-semibold leading-snug text-foreground">
                {venue}
              </p>
            </div>
            {locationUrl && (
              <a
                href={locationUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open venue in maps"
                className="group mt-0.5 inline-flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.15em] text-copper transition-colors hover:text-copper-light"
              >
                Map
                <ArrowUpRight
                  size={13}
                  strokeWidth={2}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </a>
            )}
          </div>
        </div>

        {/* ── Action row ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-5">
          <AddToCalendar
            eventName={name}
            startDate={date}
            startTime={time}
            venue={venue}
            description={description}
          />

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 border border-border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/80 transition-colors hover:border-copper/50 hover:text-copper"
          >
            {copied ? (
              <Check size={15} strokeWidth={2} className="text-emerald-400" />
            ) : (
              <Share2 size={15} strokeWidth={1.75} />
            )}
            <span>{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </motion.div>
    </section>
  )
}
