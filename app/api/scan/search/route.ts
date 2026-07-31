import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { createEphemeralSearchToken } from '@/lib/ephemeral-token'

export const dynamic = 'force-dynamic'

/**
 * Escape PostgREST `ilike` pattern metacharacters so a caller-supplied query
 * is treated as a literal substring rather than a wildcard pattern.
 *
 * Without this, a scanner-token holder could send `q=%` (or `q=__`, `q=**`)
 * which passes the length gate yet matches EVERY attendee, turning the
 * damaged-QR fallback into a full guest-list enumeration oracle.
 *
 * We backslash-escape the SQL LIKE wildcards (`%`, `_`) and the escape char
 * (`\`) itself — Postgres' default ESCAPE is backslash, so this makes them
 * match literally. PostgREST additionally aliases `*` to `%` with no documented
 * escape, so we strip `*` outright (a literal asterisk is meaningless in a name
 * search). The caller must independently ensure enough non-wildcard characters
 * remain — see `countLiteralChars`.
 */
function escapeLikePattern(input: string): string {
  return input.replace(/\*/g, '').replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

/** Number of characters left once wildcard metacharacters are removed. */
function countLiteralChars(input: string): number {
  return input.replace(/[%_*]/g, '').length
}

/** Mask phone numbers to prevent full PII exposure in search results */
function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length < 4) return '***'
  const last4 = cleaned.slice(-4)
  return `***-***-${last4}`
}

/**
 * POST /api/scan/search   body: { token: <scannerToken>, q: <name> }
 *
 * Manual name-search fallback for damaged or dead-battery QR codes.
 * Returns up to 10 matching attendees for the event associated with the
 * scanner token.
 *
 * Security Hardening:
 * - Reads the scanner token and query from the POST body (never the query
 *   string) so neither leaks into access logs, proxy logs, browser history or
 *   Referer headers.
 * - Does NOT expose qr_token or raw database UUIDs. Returns a signed 15-minute
 *   ephemeral search token (`eph_...`) bound to this scanner link.
 * - Masks phone numbers to avoid full PII harvesting.
 * - Enforces distributed rate limiting per IP and scanner token (Upstash-backed).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const token = typeof body.token === 'string' ? body.token.trim() : null
  const q = typeof body.q === 'string' ? body.q.trim() : null

  if (!token) {
    return NextResponse.json({ error: 'Missing scanner token' }, { status: 400 })
  }
  // Require at least 2 *literal* (non-wildcard) characters. This blocks
  // all-wildcard probes like `%%`, `__` or `**` that would otherwise match the
  // entire guest list.
  if (!q || countLiteralChars(q) < 2) {
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
    .ilike('name', `%${escapeLikePattern(q)}%`)
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


