'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, CheckCircle2, Sliders, Shield, Mail, Users, ArrowUpRight, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  num: string
  title: string
  desc: string
  icon: React.ComponentType<{ className?: string }>
}

export function ProcessTimeline() {
  const [activeStep, setActiveStep] = useState(0)

  const steps: Step[] = [
    {
      num: '01',
      title: 'Configure Tiers & Caps',
      desc: 'Establish pricing layers and capacity gates. Secure settlements via direct multi-currency integrations.',
      icon: Sliders,
    },
    {
      num: '02',
      title: 'Dispatch Invite Campaigns',
      desc: 'Broadcast customized emails with personalized QR ticket links and direct calendar integrations.',
      icon: Mail,
    },
    {
      num: '03',
      title: 'Authorize Check-ins',
      desc: 'Provision direct gate scanner web apps to door staff. Validate access passes in real-time.',
      icon: QrCode,
    },
    {
      num: '04',
      title: 'Inspect Gate Logs',
      desc: 'Track arrival velocity, admission logs, and sales statistics via a live coordinator dashboard.',
      icon: BarChart3,
    },
  ]

  // Auto-play steps loop if user doesn't interact, to make the page feel alive
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [steps.length])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
      
      {/* Left Column: Vertical Timeline Stepper */}
      <div className="lg:col-span-6 space-y-4 relative">
        
        {/* Dynamic Vertical Progress Track */}
        <div className="absolute left-7 top-6 bottom-6 w-0.5 bg-stone-200/50 dark:bg-stone-900/60 -z-10 rounded-full" />
        <motion.div
          className="absolute left-7 top-6 w-0.5 bg-linear-to-b from-copper to-amber-500 -z-10 rounded-full origin-top"
          animate={{
            height: `${(activeStep / (steps.length - 1)) * 90}%`
          }}
          transition={{ type: 'spring', stiffness: 80, damping: 15 }}
          style={{ maxHeight: 'calc(100% - 48px)' }}
        />

        {steps.map((step, idx) => {
          const StepIcon = step.icon
          const isActive = idx === activeStep

          return (
            <div
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={cn(
                "group flex items-start gap-6 p-5 rounded-2xl cursor-pointer transition-all duration-500 select-none border border-transparent",
                isActive 
                  ? "bg-stone-500/5 dark:bg-stone-900/40 border-border/40 dark:border-border/10 shadow-[0_8px_30px_rgba(0,0,0,0.015)] dark:shadow-none" 
                  : "hover:bg-stone-500/2 dark:hover:bg-stone-900/10"
              )}
            >
              {/* Stepper badge indicator */}
              <div className="relative shrink-0 z-10">
                <motion.div
                  animate={{
                    backgroundColor: isActive ? 'var(--color-copper, #BF8430)' : 'rgba(120, 120, 120, 0.08)',
                    scale: isActive ? 1.08 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center border transition-colors duration-300 font-mono text-[9px] font-bold text-stone-500 dark:text-stone-400",
                    isActive 
                      ? "border-copper text-background shadow-md shadow-copper/20" 
                      : "border-border/40 dark:border-border/10 bg-card group-hover:border-stone-400 dark:group-hover:border-stone-700"
                  )}
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: isActive ? '#BF8430' : undefined,
                    color: isActive ? '#ffffff' : undefined,
                  }}
                >
                  {step.num}
                </motion.div>
              </div>

              {/* Step info block */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center gap-2">
                  <StepIcon className={cn(
                    "w-4 h-4 transition-colors duration-300",
                    isActive ? "text-copper" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  <h3 className={cn(
                    "font-bold text-sm tracking-tight transition-colors duration-300",
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {step.title}
                  </h3>
                </div>
                <p className={cn(
                  "text-xs leading-relaxed transition-colors duration-500",
                  isActive ? "text-muted-foreground" : "text-muted-foreground/60"
                )}>
                  {step.desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Right Column: Dynamic Presentation Canvas */}
      <div className="lg:col-span-6 flex justify-center items-center min-h-95 lg:min-h-full">
        <div className="border border-border/40 dark:border-border/10 bg-stone-500/5 dark:bg-[#060504]/50 backdrop-blur-md rounded-3xl p-6 shadow-2xl w-full max-w-120 min-h-95 flex flex-col justify-between overflow-hidden relative">
          
          {/* Subtle glowing mesh behind the canvas */}
          <div className="absolute top-[-10%] right-[-10%] w-40 h-40 rounded-full bg-copper/10 blur-3xl pointer-events-none z-0" />
          
          <div className="relative z-10 flex-1 flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {activeStep === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-5 flex-1 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground/60">
                      <span>INTERFACE // EVENT_CREATION</span>
                      <span>STAGE_01</span>
                    </div>

                    <div className="space-y-3.5 bg-background/50 dark:bg-stone-900/30 border border-border/20 p-4 rounded-2xl">
                      <span className="text-[10px] font-bold text-copper block uppercase">Create Ticket Tier</span>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-muted-foreground/75">Tier Label</label>
                          <div className="h-8 border border-border/30 bg-background/80 rounded-lg px-2.5 flex items-center text-xs font-medium text-foreground">
                            VIP Premium Pass
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-muted-foreground/75">Capacity limit</label>
                            <div className="h-8 border border-border/30 bg-background/80 rounded-lg px-2.5 flex items-center text-xs font-semibold text-foreground">
                              150 Seats
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-muted-foreground/75">Rate Value</label>
                            <div className="h-8 border border-border/30 bg-background/80 rounded-lg px-2.5 flex items-center text-xs font-bold text-copper">
                              $120.00 USD
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/10 pt-4">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Shield className="w-3.5 h-3.5 text-copper" />
                      <span>Linked checkout system</span>
                    </div>
                    <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full font-bold">
                      Paystack Ready
                    </span>
                  </div>
                </motion.div>
              )}

              {activeStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-5 flex-1 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground/60">
                      <span>OUTBOX // CAMPAIGN_PREVIEW</span>
                      <span>STAGE_02</span>
                    </div>

                    {/* Email preview grid */}
                    <div className="bg-background/50 dark:bg-stone-900/30 border border-border/20 rounded-2xl overflow-hidden font-sans text-xs">
                      <div className="bg-muted/30 border-b border-border/10 px-4 py-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="font-mono">To:</span>
                        <strong className="text-foreground font-semibold">courtney.h@founders.org</strong>
                      </div>
                      <div className="p-4 space-y-4 text-center">
                        <div className="inline-flex w-8 h-8 rounded-full bg-foreground text-background items-center justify-center">
                          <QrCode className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-foreground">You are Invited.</h4>
                          <p className="text-[10px] text-muted-foreground max-w-55 mx-auto leading-normal">
                            Your reservation is verified. Scan this QR code at the door for VIP check-in.
                          </p>
                        </div>
                        
                        {/* Simulated QR Code card */}
                        <div className="mx-auto w-24 h-24 border border-dashed border-border p-2 rounded-xl bg-card/60 flex items-center justify-center">
                          <QrCode className="w-16 h-16 text-stone-900 dark:text-stone-100 opacity-80" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/10 pt-4">
                    <span className="text-[10px] text-muted-foreground">Automatic webhook audit enabled</span>
                    <span className="text-[9px] bg-copper/10 border border-copper/20 text-copper px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      100% bounce-free
                    </span>
                  </div>
                </motion.div>
              )}

              {activeStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-5 flex-1 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground/60">
                      <span>USHER_GATE // ACTIVE_SCAN</span>
                      <span>STAGE_03</span>
                    </div>

                    {/* Scanner viewfinder simulation */}
                    <div className="bg-stone-950 border border-zinc-800 rounded-2xl h-44 flex flex-col justify-between p-4 relative overflow-hidden">
                      
                      {/* Scanning visual beam */}
                      <motion.div
                        animate={{ y: [0, 160, 0] }}
                        transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                        className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_10px_#10b981] z-20"
                      />

                      {/* Video feedback backdrop */}
                      <div className="absolute inset-0 z-0 opacity-20">
                        <img
                          src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80"
                          alt="Scan interface backdrop"
                          className="w-full h-full object-cover blur-[1px]"
                        />
                      </div>
                      
                      {/* Viewfinder Corners */}
                      <div className="absolute inset-4 border border-zinc-500/20 rounded-lg pointer-events-none z-10">
                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-500" />
                        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-500" />
                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-500" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-500" />
                      </div>

                      {/* Verified Banner Success animation */}
                      <div className="absolute inset-0 bg-emerald-950/90 z-20 flex flex-col items-center justify-center text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-1.5" />
                        <span className="text-[10px] font-bold tracking-wider">TICKET VERIFIED</span>
                        <span className="font-mono text-[9px] text-foreground mt-0.5 font-semibold">Elena Rostova</span>
                        <span className="font-mono text-[7px] opacity-75">VIP Admission · Verified</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/10 pt-4">
                    <span className="text-[10px] text-muted-foreground">Mobile browser check-ins</span>
                    <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full font-bold">
                      Zero App Installs
                    </span>
                  </div>
                </motion.div>
              )}

              {activeStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-5 flex-1 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground/60">
                      <span>AUDIT_METRICS // DASHBOARD</span>
                      <span>STAGE_04</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Metric cards */}
                      <div className="bg-background/50 dark:bg-stone-900/30 border border-border/20 p-3 rounded-xl text-left space-y-1">
                        <span className="text-[8px] uppercase font-bold text-muted-foreground/75 block">Check-ins</span>
                        <strong className="text-foreground text-sm font-bold block">142 / 150</strong>
                        <span className="text-[8px] text-emerald-500">94.6% checked in</span>
                      </div>
                      <div className="bg-background/50 dark:bg-stone-900/30 border border-border/20 p-3 rounded-xl text-left space-y-1">
                        <span className="text-[8px] uppercase font-bold text-muted-foreground/75 block">Sales Revenue</span>
                        <strong className="text-foreground text-sm font-bold block">$17,040.00</strong>
                        <span className="text-[8px] text-emerald-500">+12% over target</span>
                      </div>
                    </div>

                    {/* Mini SVG Chart */}
                    <div className="border border-border/20 bg-background/50 dark:bg-stone-900/30 rounded-xl p-3.5 h-24 flex flex-col justify-between">
                      <span className="text-[8px] uppercase font-bold text-muted-foreground/60 tracking-wider block">Arrival Velocity (hour)</span>
                      <div className="w-full h-12 relative flex items-end">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#BF8430" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#BF8430" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          {/* Shaded Area */}
                          <motion.path
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1 }}
                            d="M 0,30 L 0,25 Q 15,10 30,22 T 60,8 T 85,15 L 100,5 L 100,30 Z"
                            fill="url(#chartGlow)"
                          />
                          {/* Smooth Line */}
                          <motion.path
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.2 }}
                            d="M 0,25 Q 15,10 30,22 T 60,8 T 85,15 L 100,5"
                            fill="none"
                            stroke="#BF8430"
                            strokeWidth="1.5"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/10 pt-4">
                    <span className="text-[10px] text-muted-foreground">Coordinator metrics sync active</span>
                    <span className="text-[9px] bg-copper/10 border border-copper/20 text-copper px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      Live sync
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
