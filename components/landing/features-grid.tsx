'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Mail, Users, Send, Plus, RefreshCw } from 'lucide-react'
import { SpotlightCard } from './spotlight-card'
import { cn } from '@/lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 90,
      damping: 15,
    },
  },
}

interface EmailLog {
  id: string
  recipient: string
  timestamp: string
  status: 'delivered' | 'dispatching'
}

export function FeaturesGrid() {
  // Paystack Infrastructure state (Bento 1)
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN')

  // Branded Outbox state (Bento 2)
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'delivered'>('idle')
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([
    { id: '1', recipient: 'sarah.chen@innovate.co', timestamp: '10:04:12', status: 'delivered' },
    { id: '2', recipient: 'alex.h@meridian.design', timestamp: '10:02:45', status: 'delivered' }
  ])

  // Capacity Waitlist state (Bento 3)
  const [attendees, setAttendees] = useState(118)
  const [waitlist, setWaitlist] = useState(14)
  const capacity = 120

  const handleSendTestEmail = () => {
    if (emailState !== 'idle') return

    setEmailState('sending')
    
    // Simulate API dispatch delay
    setTimeout(() => {
      const now = new Date()
      const timeStr = now.toTimeString().split(' ')[0]
      const randomNames = ['marcus.s@vault.io', 'elena.r@nexus.tech', 'courtney.h@founders.org', 'devon.l@scale.dev']
      const randomRecipient = randomNames[Math.floor(Math.random() * randomNames.length)]

      const newLog: EmailLog = {
        id: Date.now().toString(),
        recipient: randomRecipient,
        timestamp: timeStr,
        status: 'delivered'
      }

      setEmailLogs(prev => [newLog, ...prev.slice(0, 2)])
      setEmailState('delivered')

      // Reset button back to idle after user registers the success
      setTimeout(() => {
        setEmailState('idle')
      }, 2000)
    }, 1200)
  }

  const handleSimulateRegistration = () => {
    if (attendees < capacity) {
      setAttendees(prev => prev + 1)
    } else {
      setWaitlist(prev => prev + 1)
    }
  }

  const handleResetCapacity = () => {
    setAttendees(118)
    setWaitlist(14)
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-100px" }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {/* Bento 1: Ticketing & Payments */}
      <motion.div variants={itemVariants}>
        <SpotlightCard className="min-h-80 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-copper/10 flex items-center justify-center text-copper">
                <CreditCard className="w-5 h-5" />
              </div>
              
              {/* Premium Pill Toggle */}
              <div className="bg-stone-200/50 dark:bg-stone-900/60 p-0.5 rounded-full flex border border-border/40 select-none">
                <button
                  onClick={() => setCurrency('NGN')}
                  className={cn(
                    "text-[10px] font-bold px-3 py-1 rounded-full transition-all duration-300",
                    currency === 'NGN'
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  NGN
                </button>
                <button
                  onClick={() => setCurrency('USD')}
                  className={cn(
                    "text-[10px] font-bold px-3 py-1 rounded-full transition-all duration-300",
                    currency === 'USD'
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  USD
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-lg">Seamless Payments</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sell tickets globally in NGN or USD. Tier your pricing structure and manage automatic transaction matching directly.
              </p>
            </div>
          </div>

          {/* High Fidelity Interactive Mock */}
          <div className="mt-6 border border-border/40 dark:border-border/10 rounded-xl p-4 bg-background/80 dark:bg-[#0A0908] space-y-3.5 shadow-xs transition-colors duration-300">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider">TICKET PRICING</span>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-0.5 rounded-full font-bold">
                PAYSTACK VERIFIED
              </span>
            </div>
            
            <div className="space-y-2 font-sans relative overflow-hidden min-h-12">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currency}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1.5"
                >
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-stone-700 dark:text-stone-300 font-medium">VIP Member Tier</span>
                    <strong className="text-foreground text-sm font-bold">
                      {currency === 'NGN' ? '₦150,000' : '$120.00'}
                    </strong>
                  </div>
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-stone-700 dark:text-stone-300 font-medium">General Admission</span>
                    <strong className="text-foreground text-sm font-bold">
                      {currency === 'NGN' ? '₦50,000' : '$50.00'}
                    </strong>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="h-px bg-border/20 dark:bg-border/10" />
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Real-time currency settlements active</span>
            </div>
          </div>
        </SpotlightCard>
      </motion.div>

      {/* Bento 2: Branded Communications */}
      <motion.div variants={itemVariants}>
        <SpotlightCard className="min-h-80 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="w-10 h-10 rounded-xl bg-copper/10 flex items-center justify-center text-copper">
                <Mail className="w-5 h-5" />
              </div>
              
              {/* Dynamic Action Trigger */}
              <button
                onClick={handleSendTestEmail}
                disabled={emailState !== 'idle'}
                className={cn(
                  "inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full border border-copper/20 transition-all duration-300 shadow-sm",
                  emailState === 'idle' && "bg-copper/5 hover:bg-copper/10 text-copper cursor-pointer",
                  emailState === 'sending' && "bg-amber-500/5 border-amber-500/20 text-amber-500 cursor-not-allowed",
                  emailState === 'delivered' && "bg-emerald-500/5 border-emerald-500/20 text-emerald-500 cursor-not-allowed"
                )}
              >
                {emailState === 'idle' && (
                  <>
                    <Send className="w-3 h-3" />
                    Test Outbox Dispatch
                  </>
                )}
                {emailState === 'sending' && (
                  <>
                    <span className="w-2 h-2 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                )}
                {emailState === 'delivered' && (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Sent!
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-lg">Custom Invitations</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Send custom invitations directly from your own domain. Follow email deliveries, check-ins, and RSVPs in real time.
              </p>
            </div>
          </div>

          {/* High Fidelity Interactive Mock */}
          <div className="mt-6 border border-border/40 dark:border-border/10 rounded-xl p-4 bg-background/80 dark:bg-[#0A0908] space-y-3 font-sans shadow-xs transition-colors duration-300">
            <div className="space-y-1 text-[10px] border-b border-border/20 dark:border-border/10 pb-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">From Display:</span>
                <strong className="text-foreground">&quot;Grand Meridian&quot;</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reply-To Address:</span>
                <strong className="text-foreground">organizer@gala.com</strong>
              </div>
            </div>
            
            <div className="space-y-1.5 min-h-12.5 relative">
              <span className="text-[8px] font-sans font-semibold text-muted-foreground/60 tracking-wider block uppercase">Live Delivery Activity</span>
              <div className="space-y-1">
                <AnimatePresence>
                  {emailLogs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, height: 0, y: -5 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: 5 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="text-[9px] font-mono flex justify-between items-center text-stone-600 dark:text-stone-400 bg-stone-100/50 dark:bg-stone-900/30 px-2 py-0.5 rounded border border-border/10 overflow-hidden"
                    >
                      <span className="opacity-60">{log.timestamp}</span>
                      <strong className="truncate max-w-27.5 text-foreground font-medium">{log.recipient}</strong>
                      <span className="text-emerald-500 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-emerald-500" />
                        DELIVERED
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </SpotlightCard>
      </motion.div>

      {/* Bento 3: Capacity Waitlists */}
      <motion.div variants={itemVariants}>
        <SpotlightCard className="min-h-80 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="w-10 h-10 rounded-xl bg-copper/10 flex items-center justify-center text-copper">
                <Users className="w-5 h-5" />
              </div>
              
              {/* Simulator Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleSimulateRegistration}
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-full bg-copper text-white hover:bg-copper-dark cursor-pointer transition-all duration-300 shadow-sm"
                >
                  <Plus className="w-3 h-3" />
                  Test Capacity Lock
                </button>
                {(attendees > 118 || waitlist > 14) && (
                  <button
                    onClick={handleResetCapacity}
                    className="p-1.5 rounded-full bg-stone-200 dark:bg-stone-900 hover:text-copper transition-colors"
                    title="Reset simulation"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-lg">Capacity Waitlists</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automate registration limits. Once full, tickets auto-lock and redirect applicants to a waitlist queue that triggers settlements upon cancellations.
              </p>
            </div>
          </div>

          {/* High Fidelity Interactive Mock */}
          <div className="mt-6 border border-border/40 dark:border-border/10 rounded-xl p-4 bg-background/80 dark:bg-[#0A0908] space-y-3 font-sans shadow-xs transition-colors duration-300">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider">REGISTRATION LOCK</span>
              <AnimatePresence mode="wait">
                {attendees < capacity ? (
                  <motion.span
                    key="seats-open"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-[9px] text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 rounded-full font-bold"
                  >
                    SEATS OPEN
                  </motion.span>
                ) : (
                  <motion.span
                    key="cap-reached"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-[9px] text-amber-600 dark:text-amber-400 border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded-full font-bold"
                  >
                    CAP REACHED
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            
            {/* Visual meter */}
            <div className="space-y-2.5">
              <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-900 rounded-full overflow-hidden">
                <motion.div
                  initial={false}
                  animate={{ width: `${(attendees / capacity) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    attendees < capacity ? "bg-emerald-500" : "bg-amber-500"
                  )}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-foreground font-bold">{attendees}</span>
                  <span className="opacity-60">/ {capacity} Attendees</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn(waitlist > 14 ? "text-amber-500 dark:text-amber-400 font-bold" : "opacity-60")}>
                    {waitlist}
                  </span>
                  <span className="opacity-60">on Waitlist</span>
                </div>
              </div>
            </div>
          </div>
        </SpotlightCard>
      </motion.div>
    </motion.div>
  )
}
