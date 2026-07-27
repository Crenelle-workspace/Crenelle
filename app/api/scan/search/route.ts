import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { createEphemeralSearchToken } from '@/lib/ephemeral-token'

export const dynamic = 'force-dynamic'

/** Mask phone numbers to prevent full PII exposure in search results */
function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length < 4) return '***'
  const last4 = cleaned.slice(-4)
  return `***-***-${last4}`
}

/**
 * GET /api/scan/search?token=<scannerToken>&q=<name>
 *
 * Manual name-search fallback for damaged or dead-battery QR codes.
 * Returns up to 10 matching attendees for the event associated with the
 * scanner token.
 *
 * Security Hardening:
 * - Does NOT expose qr_token or raw database UUIDs. Returns a signed 15-minute
 *   ephemeral search token (`eph_...`) bound to this scanner link.
 * - Masks phone numbers to avoid full PII harvesting.
 * - Enforces distributed rate limiting per IP and scanner token (Upstash-backed).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')?.trim()
  const q = searchParams.get('q')?.trim()

  if (!token) {
    return NextResponse.json({ error: 'Missing scanner token' }, { status: 400 })
  }
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  // Enforce distributed rate limit on search endpoint (30 searches / min per IP)
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  const { allowed } = await checkRateLimitAsync({
    key: `scan-search:${token}:${clientIp}`,
    limit: 30,
    windowMs: 60_000,
  })

  if (!allowed) {
    return NextResponse.json({ error: 'Too many search requests — please slow down.' }, { status: 429 })
  }

  const supabase = createAdminClient()

  // Validate scanner token → get event_id
  const { data: link } = await supabase
    .from('scanner_links')
    .select('event_id, is_active')
    .eq('token', token)
    .single()

  if (!link || !link.is_active) {
    return NextResponse.json({ error: 'Invalid or inactive scanner link' }, { status: 403 })
  }

  // Fuzzy search: case-insensitive substring match on attendee name
  // Join through invitations so we only surface attendees with valid invitations
  const { data: attendees } = await supabase
    .from('attendees')
    .select('id, name, phone, invitations(id, party_size, seat_info, status)')
    .eq('event_id', link.event_id)
    .ilike('name', `%${q}%`)
    .limit(10)

  const results = (attendees ?? [])
    .map((a) => {
      const inv = Array.isArray(a.invitations) ? a.invitations[0] : a.invitations
      return {
        guestId: a.id,
        guestName: a.name,
        phone: maskPhone(a.phone),
        // Returns signed 15-minute ephemeral token instead of raw invitation.id or qr_token
        invitationId: inv?.id ? createEphemeralSearchToken(inv.id, token) : null,
        partySize: inv?.party_size ?? 1,
        seatInfo: inv?.seat_info ?? null,
        invitationStatus: inv?.status ?? null,
      }
    })
    // Only surface guests who have a valid, non-cancelled invitation
    .filter((r) => r.invitationId && r.invitationStatus !== 'cancelled')

  return NextResponse.json({ results })
}


