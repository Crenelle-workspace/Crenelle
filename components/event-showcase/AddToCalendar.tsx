'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { CalendarPlus, ChevronDown, ArrowUpRight, Download } from 'lucide-react'

interface AddToCalendarProps {
  eventName: string
  description?: string | null
  venue: string
  startDate: string // YYYY-MM-DD
  startTime?: string | null // e.g. "18:00" or "06:00 PM"
  timezone?: string
}

export function AddToCalendar({
  eventName,
  description,
  venue,
  startDate,
  startTime,
}: AddToCalendarProps) {
  const [open, setOpen] = useState(false)

  const formatIsoDate = (dStr: string, tStr?: string | null) => {
    try {
      const cleanDate = dStr.trim()
      let timePart = '09:00:00'
      if (tStr) {
        const match = tStr.match(/(\d{1,2}):(\d{2})/)
        if (match) {
          const hh = match[1].padStart(2, '0')
          const mm = match[2]
          timePart = `${hh}:${mm}:00`
        }
      }
      return `${cleanDate.replace(/-/g, '')}T${timePart.replace(/:/g, '')}`
    } catch {
      return `${startDate.replace(/-/g, '')}T090000`
    }
  }

  const startIso = formatIsoDate(startDate, startTime)
  const endIso = startIso

  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    eventName
  )}&details=${encodeURIComponent(description || '')}&location=${encodeURIComponent(
    venue
  )}&dates=${startIso}/${endIso}`

  const yahooUrl = `https://calendar.yahoo.com/?v=60&title=${encodeURIComponent(
    eventName
  )}&st=${startIso}&in_loc=${encodeURIComponent(venue)}&desc=${encodeURIComponent(
    description || ''
  )}`

  const downloadIcs = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Crenelle Events//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${eventName}`,
      `DESCRIPTION:${(description || '').replace(/\n/g, '\\n')}`,
      `LOCATION:${venue}`,
      `DTSTART:${startIso}`,
      `DTEND:${endIso}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${eventName.replace(/\s+/g, '_')}.ics`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="relative inline-block text-left">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(!open)}
        className="group flex items-center gap-2.5 rounded-none border border-copper/40 bg-copper/5 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] font-medium text-copper shadow-none transition-colors hover:bg-copper hover:text-white"
      >
        <CalendarPlus size={15} strokeWidth={1.75} />
        <span>Add to Calendar</span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </Button>

      <AnimatePresence>
        {open && (
          <>
            {/* Click-away backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 z-50 mt-2 w-60 overflow-hidden border border-border bg-popover shadow-2xl"
            >
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground/80 transition-colors hover:bg-copper/10 hover:text-copper"
              >
                <span>Google Calendar</span>
                <ArrowUpRight size={13} strokeWidth={1.75} className="opacity-50" />
              </a>

              <button
                type="button"
                onClick={() => {
                  downloadIcs()
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between border-b border-border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground/80 transition-colors hover:bg-copper/10 hover:text-copper"
              >
                <span>Apple / Outlook</span>
                <Download size={13} strokeWidth={1.75} className="opacity-50" />
              </button>

              <a
                href={yahooUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground/80 transition-colors hover:bg-copper/10 hover:text-copper"
              >
                <span>Yahoo Calendar</span>
                <ArrowUpRight size={13} strokeWidth={1.75} className="opacity-50" />
              </a>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
