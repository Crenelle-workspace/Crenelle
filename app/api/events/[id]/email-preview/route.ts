import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderTicketEmail } from '@/lib/email-templates'
import QRCode from 'qrcode'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const { searchParams } = new URL(request.url)
  const themeParam = searchParams.get('theme')

  const supabase = await createClient()

  // Fetch event details
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Fetch a sample invitation & tier if available
  const { data: sampleInv } = await supabase
    .from('invitations')
    .select('*, attendee:attendees(name, email), ticket_tier:ticket_tiers(id, name, price)')
    .eq('event_id', eventId)
    .limit(1)
    .maybeSingle()

  const recipientName = sampleInv?.attendee?.name || 'Alex Morgan'
  const partySizeText = sampleInv?.party_size ? (sampleInv.party_size === 1 ? '1 PERSON' : `${sampleInv.party_size} PEOPLE`) : '1 PERSON'
  const seatInfo = sampleInv?.seat_info || 'Section A, Seat 14'
  const tierName = sampleInv?.ticket_tier?.name || 'VIP Access Pass'
  const qrToken = sampleInv?.qr_token || 'PREVIEW-QR-TOKEN-123456'

  // Generate QR data URL for preview
  const qrDataUrl = await QRCode.toDataURL(qrToken, {
    width: 300,
    margin: 2,
    color: { dark: '#0F172A', light: '#FFFFFF' },
  })

  const eventDateFormatted = new Date(event.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const timeFormatted = event.time ? new Date(`1970-01-01T${event.time}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }) : ''

  const html = renderTicketEmail({
    theme: themeParam || event.email_theme || 'classic',
    emailType: 'invitation',
    event: {
      name: event.name,
      date: event.date,
      time: event.time,
      venue: event.venue,
      banner_url: event.banner_url,
      email_theme: event.email_theme,
    },
    recipientName,
    partySizeText,
    eventDateFormatted,
    timeFormatted,
    seatHtml: `<tr style="border-bottom:1px solid rgba(0,0,0,0.1);"><td style="padding:8px 0;font-weight:600;font-size:12px;">SEAT</td><td style="padding:8px 0;font-size:14px;">${seatInfo}</td></tr>`,
    tierHtml: `<tr style="border-bottom:1px solid rgba(0,0,0,0.1);"><td style="padding:8px 0;font-weight:600;font-size:12px;">TIER</td><td style="padding:8px 0;font-size:14px;">${tierName}</td></tr>`,
    unsubscribeUrl: '#',
    qrCidOrSrc: qrDataUrl,
    qrToken,
    seatInfo,
    tierName,
    tierPerks: ['Priority Access', 'Complimentary Beverage', 'Front Row Seating'],
  })

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  })
}
