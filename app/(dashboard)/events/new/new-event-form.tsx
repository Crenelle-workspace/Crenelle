'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, Globe, Mail } from 'lucide-react'
import { createEvent } from '@/app/actions/events'
import { Button } from '@/components/ui/button'
import { EventBannerInput } from '@/components/event-banner-input'
import { fieldCls, labelCls, hintCls } from '@/lib/form-styles'
import type { SenderProfile } from '@/lib/types'

interface NewEventFormProps {
  profiles: Pick<SenderProfile, 'id' | 'display_name' | 'reply_to' | 'is_default'>[]
}

export function NewEventForm({ profiles }: NewEventFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [eventType, setEventType] = useState<'closed' | 'open'>('closed')
  const [timezone, setTimezone] = useState('Africa/Lagos')
  const [showTzPicker, setShowTzPicker] = useState(false)
  const isSubmitting = useRef(false)

  // Auto-detect the organiser's local timezone on mount
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (detected) {
        queueMicrotask(() => setTimezone(detected))
      }
    } catch {
      // keep default
    }
  }, [])

  async function handleSubmit(formData: FormData) {
    if (isSubmitting.current) return
    isSubmitting.current = true
    setLoading(true)
    setError(null)
    const result = await createEvent(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      isSubmitting.current = false
    }
  }

  const defaultProfile = profiles.find((p) => p.is_default)

  return (
    <div className="max-w-2xl">
      <Link
        href="/events"
        className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-foreground/70 hover:text-signal transition-colors mb-8 group"
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
        Back to Events
      </Link>

      <div className="mb-8">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-copper bg-copper/10 border border-copper/20 px-2.5 py-1 rounded-full inline-block mb-3">
          Event Setup Wizard
        </span>
        <h1 className="font-display text-5xl uppercase text-foreground leading-none">Create Event</h1>
        <p className="font-sans text-xs text-muted-foreground mt-2 leading-relaxed max-w-xl">
          {eventType === 'closed' ? (
            <>
              New events start as <span className="font-bold text-foreground">Draft</span>.
              Set to <span className="font-bold text-foreground">Published</span> when your guest list is ready,
              then <span className="font-bold text-copper">Live</span> on event day to open usher camera scanning.
            </>
          ) : (
            <>
              <span className="font-bold text-foreground">Open</span> events generate a public registration page.
              Guests sign up online, you review applications, and approved guests receive QR pass cards.
            </>
          )}
        </p>
      </div>

      <form action={handleSubmit} className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-3xl p-8 sm:p-10 shadow-2xl flex flex-col gap-6 select-none">
        {error && (
          <div role="alert" aria-live="assertive" className="border-l-2 border-red-500 bg-red-500/10 px-4 py-3 rounded-r-xl font-sans text-xs text-red-400 leading-relaxed">
            {error}
          </div>
        )}

        {/* Event Type Selector */}
        <div className="flex flex-col gap-2">
          <span className={labelCls}>Event Access Type *</span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setEventType('closed')}
              className={`flex items-start gap-3 p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                eventType === 'closed'
                  ? 'border-copper bg-copper/10 text-foreground shadow-xs'
                  : 'border-border/40 bg-stone-900/30 text-foreground/60 hover:border-border/70 hover:text-foreground'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${eventType === 'closed' ? 'bg-copper/20 text-copper' : 'bg-stone-500/10 text-muted-foreground'}`}>
                <Lock className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="font-display text-xl uppercase leading-none">Closed</p>
                <p className="font-sans text-[10.5px] text-muted-foreground mt-1 leading-normal">
                  You manage and upload guest lists directly.
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setEventType('open')}
              className={`flex items-start gap-3 p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                eventType === 'open'
                  ? 'border-copper bg-copper/10 text-foreground shadow-xs'
                  : 'border-border/40 bg-stone-900/30 text-foreground/60 hover:border-border/70 hover:text-foreground'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${eventType === 'open' ? 'bg-copper/20 text-copper' : 'bg-stone-500/10 text-muted-foreground'}`}>
                <Globe className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="font-display text-xl uppercase leading-none">Open</p>
                <p className="font-sans text-[10.5px] text-muted-foreground mt-1 leading-normal">
                  Generates public registration & checkout link.
                </p>
              </div>
            </button>
          </div>
          <input type="hidden" name="event_type" value={eventType} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-ev-name" className={labelCls}>Event Name *</label>
          <input
            id="new-ev-name"
            name="name"
            required
            placeholder="e.g. Amaka & Chidi's Wedding"
            className={fieldCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="new-ev-date" className={labelCls}>Date *</label>
            <input id="new-ev-date" name="date" type="date" required className={fieldCls} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="new-ev-time" className={labelCls}>Time</label>
            <input id="new-ev-time" name="time" type="time" className={fieldCls} />
            {/* Timezone: auto-detected, shown as hint with optional override */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[9px] uppercase tracking-widest text-foreground/40">
                Timezone: {timezone}
              </span>
              <button
                type="button"
                onClick={() => setShowTzPicker((v) => !v)}
                className="font-mono text-[9px] uppercase tracking-widest text-signal/70 hover:text-signal underline underline-offset-2 transition-colors"
              >
                {showTzPicker ? 'close' : 'change?'}
              </button>
            </div>
            {showTzPicker && (
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={`${fieldCls} text-xs`}
                aria-label="Event timezone"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                ))}
              </select>
            )}
            <input type="hidden" name="timezone" value={timezone} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="new-ev-venue" className={labelCls}>Venue *</label>
          <input
            id="new-ev-venue"
            name="venue"
            required
            placeholder="e.g. Eko Hotels & Suites, Lagos"
            className={fieldCls}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="new-ev-capacity" className={labelCls}>Total Capacity</label>
          <input
            id="new-ev-capacity"
            name="capacity"
            type="number"
            min="1"
            placeholder="e.g. 300"
            className={fieldCls}
          />
          <p className={hintCls}>Maximum number of people allowed in</p>
        </div>

        {/* Open event specific fields */}
        {eventType === 'open' && (
          <div className="flex flex-col gap-4 border-2 border-signal/20 bg-signal/5 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal font-bold">
              OPEN EVENT SETTINGS
            </p>

            <div className="flex flex-col gap-2">
              <label htmlFor="new-ev-max-reg" className={labelCls}>Max Registrations</label>
              <input
                id="new-ev-max-reg"
                name="max_registrations"
                type="number"
                min="1"
                placeholder="Leave empty for unlimited"
                className={fieldCls}
              />
              <p className={hintCls}>Cap on how many people can sign up (leave empty for no limit)</p>
            </div>

            <div className="border-l-4 border-signal/40 pl-3">
              <p className="font-mono text-[9px] text-foreground/60 uppercase tracking-wide leading-relaxed">
                When published, a unique registration link will be generated.
                Share it publicly — users can register without creating an account.
                You&apos;ll review and manually accept or reject each registration.
              </p>
            </div>
          </div>
        )}

        <EventBannerInput />

        {/* ── Sending Identity ── */}
        <div className="flex flex-col gap-2">
          <label htmlFor="new-ev-sender-profile" className={labelCls}>
            Sending Identity
          </label>

          {profiles.length === 0 ? (
            <div className="flex items-center gap-3 border border-dashed border-border px-4 py-3">
              <Mail className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
              <p className="font-sans text-xs text-muted-foreground">
                No sender profiles yet.{' '}
                <a
                  href="/settings/sender-profiles"
                  className="text-copper hover:underline underline-offset-2"
                >
                  Create one in Settings →
                </a>
              </p>
            </div>
          ) : (
            <select
              id="new-ev-sender-profile"
              name="sender_profile_id"
              className={fieldCls}
              defaultValue=""
            >
              <option value="">
                {defaultProfile
                  ? `Default — ${defaultProfile.display_name}`
                  : 'Use account default'}
              </option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name} ({p.reply_to}){p.is_default ? ' — default' : ''}
                </option>
              ))}
            </select>
          )}
          <p className={hintCls}>
            Which brand or organisation sends emails for this event
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="new-ev-desc" className={labelCls}>Description</label>
          <textarea
            id="new-ev-desc"
            name="description"
            placeholder="Optional notes about the event..."
            rows={3}
            className={`${fieldCls} resize-none`}
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-border/30">
          <Button type="submit" variant="copper" disabled={loading} className="flex-1 h-11 text-xs font-bold rounded-full">
            {loading ? 'Creating...' : 'Create Event →'}
          </Button>
          <Link href="/events">
            <Button type="button" variant="outline" className="h-11 px-6 font-sans text-xs font-bold rounded-full">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}

// 34 common IANA timezones covering every major region.
// Shown in the collapsible override picker when the auto-detected zone is wrong
// (e.g. a Lagos organiser running a London event).
const COMMON_TIMEZONES = [
  // Africa
  'Africa/Abidjan', 'Africa/Accra', 'Africa/Cairo',
  'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
  // Americas
  'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/New_York', 'America/Sao_Paulo', 'America/Toronto',
  'America/Mexico_City', 'America/Bogota', 'America/Buenos_Aires',
  // Asia
  'Asia/Calcutta', 'Asia/Dubai', 'Asia/Hong_Kong',
  'Asia/Jakarta', 'Asia/Karachi', 'Asia/Riyadh',
  'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Tokyo',
  // Europe
  'Europe/Amsterdam', 'Europe/Berlin', 'Europe/Istanbul',
  'Europe/London', 'Europe/Madrid', 'Europe/Moscow', 'Europe/Paris',
  // Oceania
  'Australia/Sydney', 'Pacific/Auckland',
  // UTC
  'UTC',
]
