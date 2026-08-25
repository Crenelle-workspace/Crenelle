'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SectionShell, SectionHeader } from './ShowcaseSection'
import type { FAQItem } from '@/lib/types'

interface EventFAQProps {
  faqs?: FAQItem[] | null
  index: string
}

export function EventFAQ({ faqs, index }: EventFAQProps) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (!faqs || faqs.length === 0) return null

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id))
  }

  return (
    <SectionShell className="p-6 sm:p-9">
      <SectionHeader index={index} kicker="Answers" title="Frequently asked" />

      <div className="border-t border-border">
        {faqs.map((faq, index) => {
          const id = faq.id || index.toString()
          const isOpen = openId === id
          return (
            <div key={id} className="border-b border-border">
              <button
                type="button"
                onClick={() => toggle(id)}
                aria-expanded={isOpen}
                className="flex w-full items-start gap-4 py-5 text-left transition-colors hover:text-copper sm:gap-6"
              >
                <span className="mt-1 font-mono text-xs tracking-[0.15em] text-copper">
                  {(index + 1).toString().padStart(2, '0')}
                </span>
                <span
                  className={`flex-1 font-display text-lg font-medium leading-snug transition-colors sm:text-xl ${
                    isOpen ? 'text-copper' : 'text-foreground'
                  }`}
                >
                  {faq.question}
                </span>
                {/* Plus / minus */}
                <span className="relative mt-2 h-3.5 w-3.5 shrink-0">
                  <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
                  <span
                    className={`absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current transition-transform duration-300 ${
                      isOpen ? 'rotate-90 scale-0' : ''
                    }`}
                  />
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="max-w-2xl pb-6 pl-8 pr-8 text-[15px] leading-relaxed text-muted-foreground sm:pl-11">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </SectionShell>
  )
}
