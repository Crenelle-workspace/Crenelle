'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Printer, QrCode } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/empty-state'
import QRCode from 'qrcode'
import { SectionHeader } from '@/components/section-header'
import type { Attendee, Invitation, Event } from '@/lib/types'

type CardData = {
  guest: Attendee
  invitation: Invitation
  qrDataUrl: string
}

export default function CardsPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const [cards, setCards] = useState<CardData[]>([])
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [{ data: ev }, { data: attendees }] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).single(),
        supabase.from('attendees').select('*, invitations(*)').eq('event_id', eventId).order('name'),
      ])

      setEvent(ev)

      const cardList: CardData[] = []
      const attendeeList = (attendees ?? []) as (Attendee & { invitations?: Invitation[] })[]
      for (const a of attendeeList) {
        const invitation = a.invitations?.[0]
        if (!invitation) continue
        const qrDataUrl = await QRCode.toDataURL(invitation.qr_token, {
          width: 256,
          margin: 1,
          color: { dark: '#0A0A0A', light: '#F0EDE8' },
        })
        cardList.push({ guest: a, invitation, qrDataUrl })
      }

      setCards(cardList)
      setLoading(false)
    }
    load()
  }, [eventId])

  if (loading) return (
    <div className="font-sans text-xs font-semibold text-muted-foreground py-12 text-center animate-pulse">
      Generating QR passes...
    </div>
  )

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={<QrCode className="h-10 w-10" />}
        title="No Guests Added Yet"
        subtitle="Add guests first, then return here to generate their QR entry cards"
      />
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 border-b border-border/40 pb-6 print:hidden">
        <SectionHeader
          eyebrow="Digital Passes"
          title="QR Passes"
          subtitle={`${cards.length} pass${cards.length !== 1 ? 'es' : ''} ready to print`}
        />
        <Button
          onClick={() => window.print()}
          variant="copper"
          className="gap-2 h-10 px-5 text-xs font-bold shrink-0 rounded-full"
          aria-label="Print all QR passes"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print All Passes
        </Button>
      </div>

      <p className="font-sans text-xs text-muted-foreground mb-6 print:hidden">
        Tip: Use browser Print dialog → Save as PDF → Enable &quot;Background graphics&quot; for best results.
      </p>

      {/* Print grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-2 print:gap-3">
        {cards.map(({ guest, invitation, qrDataUrl }) => (
          <EntryCard
            key={invitation.id}
            eventName={event?.name ?? ''}
            guestName={guest.name}
            partySize={invitation.party_size}
            seatInfo={invitation.seat_info}
            qrDataUrl={qrDataUrl}
          />
        ))}
      </div>
    </div>
  )
}

function EntryCard({
  eventName,
  guestName,
  partySize,
  seatInfo,
  qrDataUrl,
}: {
  eventName: string
  guestName: string
  partySize: number
  seatInfo: string | null
  qrDataUrl: string
}) {
  return (
    <div
      className="border border-border/40 bg-card p-5 rounded-2xl flex flex-col items-center text-center print:break-inside-avoid shadow-sm"
      role="article"
      aria-label={`Entry card for ${guestName}`}
    >
      {/* Event name */}
      <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-copper mb-3">{eventName}</p>

      {/* Dashed separator */}
      <div className="w-full border-t border-dashed border-border/40 mb-3" aria-hidden="true" />

      {/* QR Code */}
      <Image
        src={qrDataUrl}
        alt={`QR code for ${guestName}`}
        width={112}
        height={112}
        unoptimized
        className="w-28 h-28 mb-4 border border-border/20 rounded-xl"
      />

      {/* Dashed separator */}
      <div className="w-full border-t border-dashed border-border/40 mb-3" aria-hidden="true" />

      {/* Guest name */}
      <p className="font-sans text-xl font-bold text-foreground leading-tight">{guestName}</p>

      {/* Party size */}
      <p className="font-sans text-xs font-semibold text-muted-foreground mt-2">
        Admits <span className="text-copper font-bold">{partySize}</span> {partySize === 1 ? 'guest' : 'guests'}
      </p>

      {/* Seat info */}
      {seatInfo && (
        <div className="mt-3 border border-copper/30 bg-copper/10 px-3 py-1 rounded-full">
          <p className="font-sans text-xs font-semibold text-copper">{seatInfo}</p>
        </div>
      )}
    </div>
  )
}
