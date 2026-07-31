'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { submitRegistration } from '@/app/actions/registrations'
import { EventHero } from '@/components/event-showcase/EventHero'
import { EventDescription } from '@/components/event-showcase/EventDescription'
import { EventAgendaTimeline } from '@/components/event-showcase/EventAgendaTimeline'
import { EventSpeakers } from '@/components/event-showcase/EventSpeakers'
import { EventFAQ } from '@/components/event-showcase/EventFAQ'
import {
  Ticket,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Loader2,
  ArrowRight,
  CreditCard,
  AlertTriangle,
  Receipt,
  ArrowLeft,
  Lock,
} from 'lucide-react'
import type { RegisterEventInfo } from '@/lib/register-event'
import { calculatePaymentBreakdown, formatKoboAsNGN } from '@/lib/paystack'

export default function RegistrationClient({ event }: { event: RegisterEventInfo }) {
  const searchParams = useSearchParams()
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [waitlisted, setWaitlisted] = useState(false)
  const [selectedTierId, setSelectedTierId] = useState(event.tiers[0]?.id ?? '')
  const [redirectingToPaystack, setRedirectingToPaystack] = useState(false)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [previewDetails, setPreviewDetails] = useState<{
    fullName: string
    email: string
    phone: string
    tier: { id: string; name: string; price: number; currency: string }
  } | null>(null)

  const rsvpFormRef = useRef<HTMLDivElement>(null)
  const isSubmitting = useRef(false)

  // Payment reference from Paystack redirect callback
  const paymentRef = searchParams.get('reference')

  const [verifyingPayment, setVerifyingPayment] = useState(false)
  const [verifiedPaymentStatus, setVerifiedPaymentStatus] = useState<
    'paid' | 'pending' | 'failed' | 'not_found' | null
  >(null)

  useEffect(() => {
    if (!paymentRef) return

    setVerifyingPayment(true)
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status?reference=${paymentRef}`)
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (
          json.status === 'paid' ||
          json.status === 'failed' ||
          json.status === 'not_found'
        ) {
          setVerifiedPaymentStatus(json.status)
          setVerifyingPayment(false)
          clearInterval(pollInterval)
        }
      } catch {
        // Retry next poll
      }
    }, 2500)

    const timeout = setTimeout(() => {
      clearInterval(pollInterval)
      setVerifyingPayment(false)
    }, 30000)

    return () => {
      clearInterval(pollInterval)
      clearTimeout(timeout)
    }
  }, [paymentRef])

  useEffect(() => {
    const target = rsvpFormRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFormVisible(entry.isIntersecting)
      },
      { threshold: 0 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  const scrollToRSVP = () => {
    rsvpFormRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleConfirmPaystackPayment() {
    if (!previewDetails || isSubmitting.current) return
    isSubmitting.current = true
    setRedirectingToPaystack(true)
    setError(null)

    try {
      const res = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          ticket_tier_id: previewDetails.tier.id,
          payer_email: previewDetails.email,
          payer_name: previewDetails.fullName,
          payer_phone: previewDetails.phone || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to initialize payment. Please try again.')
        setRedirectingToPaystack(false)
        isSubmitting.current = false
        return
      }

      if (data.authorization_url) {
        window.location.href = data.authorization_url
        return
      }
    } catch {
      setError('An unexpected error occurred during payment initialization.')
      setRedirectingToPaystack(false)
      isSubmitting.current = false
    }
  }

  async function handleSubmit(formData: FormData) {
    if (isSubmitting.current) return
    isSubmitting.current = true
    setSubmitting(true)
    setError(null)

    const fullName = (formData.get('full_name') as string) || ''
    const email = (formData.get('email') as string) || ''
    const phone = (formData.get('phone') as string) || ''
    const tierId = (formData.get('ticket_tier_id') as string) || selectedTierId

    const selectedTier = event.tiers?.find((t) => t.id === tierId)
    const isPaidTier = selectedTier ? selectedTier.price > 0 : false

    try {
      if (isPaidTier && selectedTier) {
        // Open payment preview breakdown step
        setPreviewDetails({
          fullName,
          email,
          phone,
          tier: selectedTier,
        })
        isSubmitting.current = false
        setSubmitting(false)
        return
      } else {
        // Free ticket tier or waitlist
        const result = await submitRegistration(event.id, formData)
        if (result.error) {
          setError(result.error)
          isSubmitting.current = false
          setSubmitting(false)
          return
        }

        if (result.waitlisted) {
          setWaitlisted(true)
        }
        setSubmitted(true)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      isSubmitting.current = false
      setSubmitting(false)
    }
  }

  // Payment Verification Polling Screen
  if (verifyingPayment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md border border-border bg-card p-10 text-center">
          <Loader2 size={32} strokeWidth={1.75} className="mx-auto mb-6 animate-spin text-copper" />
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper">
            Verifying payment
          </p>
          <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Checking transaction{' '}
            <span className="font-mono text-foreground">{paymentRef}</span>. Please keep this page open.
          </p>
        </div>
      </div>
    )
  }

  // Payment Paid Confirmed Screen
  if (verifiedPaymentStatus === 'paid') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md border border-border bg-card p-10 text-center"
        >
          <CheckCircle2 size={40} strokeWidth={1.5} className="mx-auto mb-5 text-emerald-600 dark:text-emerald-400" />
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-400">
            Payment confirmed
          </p>
          <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight text-foreground">
            You&apos;re going to {event.name}
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Your ticket is confirmed and your QR entry pass has been emailed to you.
          </p>
          {paymentRef && (
            <p className="mt-6 border-t border-border pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Ref&nbsp;·&nbsp;{paymentRef}
            </p>
          )}
        </motion.div>
      </div>
    )
  }

  // Free Tier Submission Success Screen
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md border border-border bg-card p-10 text-center"
        >
          {waitlisted ? (
            <>
              <Clock size={38} strokeWidth={1.5} className="mx-auto mb-5 text-copper" />
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper">
                Added to waitlist
              </p>
              <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight text-foreground">
                You&apos;re on the list
              </h1>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                <span className="text-foreground">{event.name}</span> is at capacity. We&apos;ll notify you the moment a spot opens up.
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 size={40} strokeWidth={1.5} className="mx-auto mb-5 text-emerald-600 dark:text-emerald-400" />
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-400">
                Registration confirmed
              </p>
              <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight text-foreground">
                You&apos;re going to {event.name}
              </h1>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Your spot is confirmed. Check your email for your entry pass.
              </p>
            </>
          )}
        </motion.div>
      </div>
    )
  }

  const isFull =
    event.max_registrations !== null &&
    event.registration_count >= event.max_registrations

  // ── Shared editorial form styles ──
  const labelClass =
    'mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground'
  const inputClass =
    'w-full border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/40 focus:border-copper focus:outline-none'
  const submitClass =
    'mt-1 flex w-full items-center justify-center gap-2 bg-foreground py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-background transition-colors hover:bg-copper hover:text-white disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-copper selection:text-black">
      {/* Official Crenelle Header Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            {/* Crenelle Official Brand Logo */}
            <Image
              src="/Brand Logos/CRENELLE WORDMARK B.png"
              alt="Crenelle Logo"
              width={150}
              height={34}
              className="h-5 w-auto object-contain block dark:hidden"
              priority
            />
            <Image
              src="/Brand Logos/CRENELLE WORDMARK W.png"
              alt="Crenelle Logo"
              width={150}
              height={34}
              className="h-5 w-auto object-contain hidden dark:block"
              priority
            />
            <span className="hidden items-center gap-1.5 border-l border-border pl-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:inline-flex">
              <ShieldCheck size={13} strokeWidth={1.75} className="text-emerald-400" />
              Verified event
            </span>
          </div>

          <button
            onClick={scrollToRSVP}
            className="group inline-flex items-center gap-2 bg-foreground px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-background transition-colors hover:bg-copper hover:text-white"
          >
            <span>Register</span>
            <ArrowRight
              size={13}
              strokeWidth={2}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </div>
      </header>

      {/* Main Content Showcase Layout */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:py-12 pb-24 sm:pb-12">
        {/* Hero Showcase Header */}
        <EventHero
          name={event.name}
          date={event.date}
          time={event.time}
          timezone={event.timezone}
          venue={event.venue}
          bannerUrl={event.banner_url}
          locationUrl={event.location_url}
          description={event.description}
        />

        {/* Split Grid: Details Showcase (Left) + Registration Widget (Right) */}
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
          {/* Left Column (Showcase Sections) */}
          <div className="space-y-10 lg:col-span-7 xl:col-span-8">
            <EventDescription description={event.description} />
            <EventAgendaTimeline agenda={event.agenda} />
            <EventSpeakers speakers={event.speakers} />
            <EventFAQ faqs={event.faqs} />
          </div>

          {/* Right Column (High-Visibility Sticky RSVP Card) */}
          <div ref={rsvpFormRef} className="sticky top-20 lg:col-span-5 xl:col-span-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="border border-border bg-card p-6 sm:p-8"
            >
              <div className="mb-6 border-b border-border pb-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper">
                  Registration
                </p>
                <h2 className="mt-2 font-display text-3xl font-medium tracking-tight text-foreground">
                  Reserve your place
                </h2>
              </div>

              {/* Capacity */}
              {event.max_registrations && (
                <div className="mb-6">
                  <div className="mb-2 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    <span>Capacity</span>
                    <span>
                      <span className="text-foreground">{event.registration_count}</span>
                      {' / '}
                      {event.max_registrations}
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden bg-secondary">
                    <div
                      className="h-full bg-copper transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (event.registration_count / event.max_registrations) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 border border-ember/50 bg-ember/10 p-3 text-xs leading-relaxed text-foreground"
                >
                  <AlertTriangle size={16} strokeWidth={1.75} className="mt-px shrink-0 text-ember" />
                  <span>{error}</span>
                </div>
              )}

              {/* Registration / Waitlist Form or Payment Preview */}
              {previewDetails ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <Receipt size={18} strokeWidth={1.5} className="text-copper" />
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
                        Payment Preview
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewDetails(null)}
                      disabled={redirectingToPaystack}
                      className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-copper transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <ArrowLeft size={12} />
                      Edit Details
                    </button>
                  </div>

                  {/* Attendee & Ticket Info Summary */}
                  <div className="space-y-1.5 rounded-lg border border-border/60 bg-secondary/20 p-3.5 font-mono text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Attendee</span>
                      <span className="font-semibold text-foreground">{previewDetails.fullName}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Email</span>
                      <span className="truncate max-w-50 text-foreground">{previewDetails.email}</span>
                    </div>
                    {previewDetails.phone && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Phone</span>
                        <span className="text-foreground">{previewDetails.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground border-t border-border/40 pt-1.5 mt-1.5">
                      <span>Ticket Tier</span>
                      <span className="font-semibold text-copper">{previewDetails.tier.name}</span>
                    </div>
                  </div>

                  {/* Breakdown Table */}
                  {(() => {
                    const breakdown = calculatePaymentBreakdown(
                      previewDetails.tier.price,
                      event.platform_fee_percent ?? 5
                    )
                    return (
                      <div className="space-y-2 border border-border/80 bg-background p-4 rounded-xl shadow-inner">
                        <div className="flex justify-between font-mono text-xs py-1">
                          <span className="text-muted-foreground">Ticket Fee</span>
                          <span className="font-medium text-foreground">
                            {formatKoboAsNGN(breakdown.ticketFeeKobo)}
                          </span>
                        </div>

                        <div className="flex justify-between font-mono text-xs py-1 border-t border-border/30">
                          <span className="text-muted-foreground">
                            Crenelle Processing Fee
                          </span>
                          <span className="font-mono text-muted-foreground">
                            {formatKoboAsNGN(breakdown.crenelleChargeKobo)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center font-mono text-sm font-semibold py-2.5 px-3 border-t border-copper/30 bg-copper/5 rounded-lg mt-2 text-foreground">
                          <span className="uppercase tracking-wider text-[11px] text-copper">Total Amount</span>
                          <span className="text-copper text-base font-bold">
                            {formatKoboAsNGN(breakdown.totalAmountKobo)}
                          </span>
                        </div>
                      </div>
                    )
                  })()}

                  <div className="flex items-center gap-2 py-1 px-2 text-[10px] font-mono text-muted-foreground">
                    <Lock size={12} className="text-emerald-400 shrink-0" />
                    <span>Redirects to Paystack 256-bit SSL encrypted payment page</span>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleConfirmPaystackPayment}
                      disabled={redirectingToPaystack}
                      className={submitClass}
                    >
                      {redirectingToPaystack ? (
                        <>
                          <Loader2 size={15} className="animate-spin" /> Redirecting to Paystack…
                        </>
                      ) : (
                        <>
                          <span>Proceed to Paystack</span>
                          <ArrowRight size={15} strokeWidth={2} />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewDetails(null)}
                      disabled={redirectingToPaystack}
                      className="w-full py-2.5 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Back to form
                    </button>
                  </div>
                </motion.div>
              ) : isFull ? (

                <div>
                  <div className="mb-6 flex items-start gap-3 border border-border bg-secondary/30 p-4">
                    <Clock size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-copper" />
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        This event is at capacity
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Join the waitlist and we&apos;ll notify you if a spot opens.
                      </p>
                    </div>
                  </div>

                  <form action={handleSubmit} className="space-y-5">
                    <div>
                      <label className={labelClass}>Full name</label>
                      <input name="full_name" required placeholder="Alex Morgan" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Email address</label>
                      <input
                        name="email"
                        type="email"
                        required
                        placeholder="alex@example.com"
                        className={inputClass}
                      />
                    </div>
                    <button type="submit" disabled={submitting} className={submitClass}>
                      {submitting ? 'Joining…' : 'Join the waitlist'}
                      {!submitting && <ArrowRight size={15} strokeWidth={2} />}
                    </button>
                    <p className="mt-2.5 text-center font-sans text-[11px] leading-relaxed text-muted-foreground/80">
                      By registering, you agree to our{' '}
                      <Link
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-copper font-medium hover:underline underline-offset-2"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </p>
                  </form>
                </div>
              ) : (
                <form action={handleSubmit} className="space-y-5">
                  <div>
                    <label className={labelClass}>Full name</label>
                    <input name="full_name" required placeholder="Alex Morgan" className={inputClass} />
                  </div>

                  <div>
                    <label className={labelClass}>Email address</label>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="alex@example.com"
                      className={inputClass}
                    />
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      Your QR entry pass will be sent here.
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Phone <span className="text-muted-foreground/60">· optional</span>
                    </label>
                    <input name="phone" placeholder="+234…" className={inputClass} />
                  </div>

                  {event.tiers && event.tiers.length > 0 && (
                    <div>
                      <label className={labelClass}>Ticket</label>
                      <select
                        name="ticket_tier_id"
                        value={selectedTierId}
                        onChange={(e) => setSelectedTierId(e.target.value)}
                        required
                        className={`${inputClass} cursor-pointer`}
                      >
                        {event.tiers.map((t) => (
                          <option key={t.id} value={t.id} className="bg-card text-foreground">
                            {t.name}{' '}
                            {t.price === 0
                              ? '(Free)'
                              : `— ₦${Math.ceil(t.price / 100).toLocaleString('en-NG')}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(() => {
                    const selectedTier = event.tiers?.find(
                      (t) => t.id === selectedTierId
                    )
                    const isPaidTier = selectedTier ? selectedTier.price > 0 : false
                    const isProcessing = submitting || redirectingToPaystack
                    return (
                      <div className="pt-1">
                        {isPaidTier && (
                          <div className="mb-4 flex items-start gap-2.5 border-l-2 border-copper/50 bg-secondary/30 py-2.5 pl-3 pr-2 text-[11px] leading-relaxed text-muted-foreground">
                            <CreditCard size={15} strokeWidth={1.5} className="mt-px shrink-0 text-copper" />
                            <span>
                              Secure checkout via Paystack — card, bank transfer, or USSD.
                            </span>
                          </div>
                        )}

                        <button type="submit" disabled={isProcessing} className={submitClass}>
                          {redirectingToPaystack
                            ? 'Redirecting…'
                            : submitting
                            ? 'Submitting…'
                            : isPaidTier
                            ? `Pay ₦${Math.ceil(
                                (selectedTier?.price ?? 0) / 100
                              ).toLocaleString('en-NG')} & register`
                            : 'Confirm registration'}
                          {!isProcessing && <ArrowRight size={15} strokeWidth={2} />}
                        </button>
                        <p className="mt-3 text-center font-sans text-[11px] leading-relaxed text-muted-foreground/80">
                          By registering, you agree to our{' '}
                          <Link
                            href="/privacy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-copper font-medium hover:underline underline-offset-2"
                          >
                            Privacy Policy
                          </Link>
                          .
                        </p>
                      </div>
                    )
                  })()}
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Floating RSVP Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/90 p-3 backdrop-blur-xl transition-all duration-300 sm:hidden ${
          isFormVisible ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
        <button
          onClick={scrollToRSVP}
          className="flex w-full items-center justify-center gap-2 bg-foreground py-3.5 rounded-full font-sans text-sm font-bold text-background transition-colors active:bg-copper active:text-white shadow-lg"
        >
          <Ticket size={16} strokeWidth={1.75} />
          <span>Register for Event</span>
          <ArrowRight size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
