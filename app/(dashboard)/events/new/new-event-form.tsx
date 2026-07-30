'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, Globe, Mail, Plus, Loader2 } from 'lucide-react'
import { createEvent } from '@/app/actions/events'
import { createSenderProfile, getSenderProfiles } from '@/app/actions/sender-profiles'
import { Button } from '@/components/ui/button'
import { EventBannerInput } from '@/components/event-banner-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { fieldCls, labelCls, hintCls } from '@/lib/form-styles'
import { toast } from 'sonner'
import type { SenderProfile } from '@/lib/types'

interface NewEventFormProps {
  profiles: Pick<SenderProfile, 'id' | 'display_name' | 'reply_to' | 'is_default'>[]
}

export function NewEventForm({ profiles: initialProfiles }: NewEventFormProps) {
  const [profilesList, setProfilesList] = useState(initialProfiles)
  const defaultProfile = initialProfiles.find((p) => p.is_default)
  const [selectedProfileId, setSelectedProfileId] = useState<string>(defaultProfile?.id ?? '')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [eventType, setEventType] = useState<'closed' | 'open'>('closed')
  const [timezone, setTimezone] = useState('Africa/Lagos')
  const [showTzPicker, setShowTzPicker] = useState(false)
  const isSubmitting = useRef(false)

  // Inline Sender Profile Creation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

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

  async function handleCreateProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsCreatingProfile(true)
    setProfileError(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    const result = await createSenderProfile(formData)
    if (result?.error) {
      setProfileError(result.error)
      setIsCreatingProfile(false)
      return
    }

    // Refresh profiles list
    const res = await getSenderProfiles()
    const updated = (res.profiles ?? []) as SenderProfile[]
    setProfilesList(updated)

    // Select newly created profile (or last added)
    if (updated.length > 0) {
      const created = updated[updated.length - 1]
      if (created) {
        setSelectedProfileId(created.id)
      }
    }

    toast.success('Sender profile created and selected!')
    setIsModalOpen(false)
    setIsCreatingProfile(false)
    form.reset()
  }

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
        <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-copper bg-copper/10 border border-copper/20 px-3 py-1 rounded-full inline-block mb-3">
          Create New Event
        </span>
        <h1 className="font-sans text-4xl font-bold tracking-tight text-foreground">Create Event</h1>
        <p className="font-sans text-xs text-muted-foreground mt-2 leading-relaxed max-w-xl">
          {eventType === 'closed' ? (
            <>
              New events start as <span className="font-bold text-foreground">Draft</span>.
              Set to <span className="font-bold text-foreground">Published</span> when your guest list is ready,
              then <span className="font-bold text-copper">Live</span> on event day to open usher camera scanning.
            </>
          ) : (
            <>
              <span className="font-bold text-foreground">Public</span> events generate a public registration page.
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
                <p className="font-sans text-base font-semibold leading-none">Invite-Only</p>
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
                <p className="font-sans text-base font-semibold leading-none">Public Event</p>
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
            <input
              id="new-ev-date"
              name="date"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              required
              className={fieldCls}
            />
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
          <div className="flex items-center justify-between">
            <label htmlFor="new-ev-sender-profile" className={labelCls}>
              Sending Identity
            </label>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="font-mono text-[10px] font-bold uppercase tracking-widest text-copper hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="size-3" /> Create New Profile
            </button>
          </div>

          {profilesList.length === 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-dashed border-copper/30 bg-copper/5 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <Mail className="size-4 text-copper shrink-0" aria-hidden="true" />
                <p className="font-sans text-xs text-muted-foreground">
                  No sender profiles created yet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="font-sans text-xs font-semibold uppercase tracking-wider text-background bg-copper px-4 py-2 rounded-xl hover:opacity-90 transition-opacity cursor-pointer shrink-0"
              >
                + Create Profile On-The-Spot
              </button>
            </div>
          ) : (
            <select
              id="new-ev-sender-profile"
              name="sender_profile_id"
              className={fieldCls}
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
            >
              <option value="">
                {defaultProfile
                  ? `Default — ${defaultProfile.display_name}`
                  : 'Use account default'}
              </option>
              {profilesList.map((p) => (
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

      {/* ── On-The-Spot Sender Profile Creation Dialog ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-card border border-border max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="font-sans text-base font-bold text-foreground">
              Create Sender Profile
            </DialogTitle>
            <DialogDescription className="font-sans text-xs text-muted-foreground">
              Define a custom sending brand name and reply-to email without leaving this event form.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProfile} className="flex flex-col gap-4 mt-2">
            {profileError && (
              <div role="alert" className="border border-denied/50 bg-denied/10 px-4 py-2.5 font-mono text-xs text-denied uppercase tracking-wide">
                ⚠ {profileError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="modal-display-name" className={labelCls}>
                Display Name *
              </label>
              <input
                id="modal-display-name"
                name="display_name"
                required
                placeholder="e.g. Acme Foundation, Tech Arm Lagos"
                className={fieldCls}
              />
              <p className={hintCls}>Shown in the &quot;From:&quot; field of event emails</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="modal-reply-to" className={labelCls}>
                Reply-To Email *
              </label>
              <input
                id="modal-reply-to"
                name="reply_to"
                type="email"
                required
                placeholder="e.g. events@acmefoundation.org"
                className={fieldCls}
              />
              <p className={hintCls}>Guest replies land in this inbox</p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="modal-is-default"
                name="is_default"
                type="checkbox"
                value="true"
                className="size-4 accent-copper rounded-none cursor-pointer"
              />
              <label htmlFor="modal-is-default" className="font-sans text-xs text-foreground cursor-pointer font-medium">
                Set as account default sender profile
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="h-10 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="copper"
                disabled={isCreatingProfile}
                className="h-10 text-xs font-semibold px-6 gap-2"
              >
                {isCreatingProfile && <Loader2 className="size-3.5 animate-spin" />}
                {isCreatingProfile ? 'Creating...' : 'Create & Select'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
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
