import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { verifyEphemeralSearchToken } from '@/lib/ephemeral-token'

export async function POST(request: NextRequest) {
  const { invitationId, scannerToken, checkOnly } = await request.json()
  const scannedValue = invitationId // key sent by scanner client: qr_token OR signed ephemeral handle (eph_...)

  if (!scannedValue || !scannerToken) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Enforce distributed rate limit (60 check-in attempts per minute per gate IP)
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  const { allowed } = await checkRateLimitAsync({
    key: `scan-post:${scannerToken}:${clientIp}`,
    limit: 60,
    windowMs: 60_000,
  })

  if (!allowed) {
    return NextResponse.json({ error: 'Too many check-in requests — please slow down.' }, { status: 429 })
  }

  // Resolve credential type before the DB round-trip. Ephemeral-token
  // verification (crypto) stays in the route — it never touches the database.
  //   Option A (Camera scan):        scannedValue is a qr_token (permanent credential)
  //   Option B (Manual usher search): scannedValue is a signed 15-min handle (eph_...)
  let targetInvitationId: string | null = null
  let entryType: 'qr_camera' | 'manual_search' = 'qr_camera'

  if (typeof scannedValue === 'string' && scannedValue.startsWith('eph_')) {
    const verifiedId = verifyEphemeralSearchToken(scannedValue, scannerToken)
    if (!verifiedId) {
      return NextResponse.json({ error: 'Search selection expired or invalid — please search again' }, { status: 403 })
    }
    targetInvitationId = verifiedId
    entryType = 'manual_search'
  }

  const supabase = createAdminClient()

  // Single round-trip: scanner + event validation, invitation resolution,
  // all guards, the triggered check-in UPDATE, and the entry-log insert all
  // happen inside process_check_in(). Trigger-raised business rules surface as
  // outcome='error' with SQLERRM in `message`, matching the former update path.
  const { data: result, error: rpcError } = await supabase.rpc('process_check_in', {
    p_scanner_token: scannerToken,
    p_qr_token: targetInvitationId ? null : scannedValue,
    p_invitation_id: targetInvitationId,
    p_entry_type: entryType,
    p_check_only: !!checkOnly,
  })

  if (rpcError || !result) {
    return NextResponse.json({ error: rpcError?.message || 'Failed to record entry check-in' }, { status: 500 })
  }

  switch (result.outcome) {
    case 'scanner_invalid':
      return NextResponse.json({ error: 'Invalid scanner link' }, { status: 403 })
    case 'scanner_inactive':
      return NextResponse.json({ error: 'This scanner link has been deactivated' }, { status: 403 })
    case 'event_not_found':
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    case 'event_ended':
      return NextResponse.json({ error: 'This event has ended — scanning is closed' }, { status: 403 })
    case 'event_not_open':
      return NextResponse.json({ error: 'Scanning is not yet open for this event' }, { status: 403 })
    case 'invitation_not_found':
      return NextResponse.json({ error: 'Invalid QR code — invitation not found' }, { status: 404 })
    case 'wrong_event':
      return NextResponse.json({ error: 'This QR code is for a different event' }, { status: 400 })
    case 'cancelled':
      return NextResponse.json({ error: 'This invitation has been cancelled' }, { status: 400 })

    case 'already_checked_in':
      return NextResponse.json({
        error: 'Already checked in',
        alreadyEntered: true,
        enteredAt: result.enteredAt,
        guest: result.guest,
        partySize: result.partySize,
        seatInfo: result.seatInfo,
      }, { status: 409 })

    case 'check_only':
      return NextResponse.json({
        success: true,
        guest: result.guest,
        partySize: result.partySize,
        remaining: 1, // With the checked-in flag, individual check-in is binary
        seatInfo: result.seatInfo,
      })

    case 'checked_in':
      return NextResponse.json({
        success: true,
        attendee: result.attendee,
        guest: result.guest, // for compatibility with ScannerClient
        partySize: result.partySize,
        checkedInAt: result.checkedInAt,
        tier: result.tier,
      })

    case 'error': {
      // Preserve the exact string-match mapping from the former update path.
      const msg = result.message || ''
      if (msg.includes('invitation_already_checked_in')) {
        return NextResponse.json({ error: 'Already checked in' }, { status: 409 })
      }
      if (msg.includes('invalid_status_transition')) {
        return NextResponse.json({ error: 'Cannot check in: invalid status' }, { status: 422 })
      }
      if (msg.includes('tier_capacity_exceeded')) {
        return NextResponse.json({ error: 'Tier is full' }, { status: 409 })
      }
      if (msg.includes('tier_soft_deleted')) {
        return NextResponse.json({ error: 'This ticket tier is no longer available' }, { status: 422 })
      }
      if (msg.includes('scanner_write_restricted')) {
        return NextResponse.json({ error: 'Insufficient permissions for this operation' }, { status: 403 })
      }
      return NextResponse.json({ error: msg || 'Failed to record entry check-in' }, { status: 500 })
    }

    default:
      return NextResponse.json({ error: 'Failed to record entry check-in' }, { status: 500 })
  }
}


