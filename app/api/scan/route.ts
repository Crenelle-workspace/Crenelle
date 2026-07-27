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

  const supabase = createAdminClient()

  // 1. Validate the scanner token
  const { data: scannerLink, error: linkError } = await supabase
    .from('scanner_links')
    .select('id, event_id, label, is_active')
    .eq('token', scannerToken)
    .single()

  if (linkError || !scannerLink) {
    return NextResponse.json({ error: 'Invalid scanner link' }, { status: 403 })
  }

  if (!scannerLink.is_active) {
    return NextResponse.json({ error: 'This scanner link has been deactivated' }, { status: 403 })
  }

  // 2. Check the event status — scanning only allowed when event is 'live'
  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .select('status')
    .eq('id', scannerLink.event_id)
    .single()

  if (eventError || !eventData) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  if (eventData.status === 'ended') {
    return NextResponse.json({ error: 'This event has ended — scanning is closed' }, { status: 403 })
  }

  if (eventData.status === 'draft' || eventData.status === 'published') {
    return NextResponse.json({ error: 'Scanning is not yet open for this event' }, { status: 403 })
  }

  // 3. Resolve credential lookup:
  // Option A (Camera scan): scannedValue is qr_token (permanent credential)
  // Option B (Manual usher search): scannedValue is signed 15-min ephemeral handle (eph_...)
  let targetInvitationId: string | null = null
  let entryType: 'qr_camera' | 'manual_search' = 'qr_camera'

  if (typeof scannedValue === 'string' && scannedValue.startsWith('eph_')) {
    // Ephemeral manual search handle validation
    const verifiedId = verifyEphemeralSearchToken(scannedValue, scannerToken)
    if (!verifiedId) {
      return NextResponse.json({ error: 'Search selection expired or invalid — please search again' }, { status: 403 })
    }
    targetInvitationId = verifiedId
    entryType = 'manual_search'
  }

  const query = supabase
    .from('invitations')
    .select(`
      *,
      attendee:attendees(id, name, email, phone),
      ticket_tier:ticket_tiers(id, name)
    `)

  const { data: invitation, error: invError } = await (
    targetInvitationId
      ? query.eq('id', targetInvitationId).single()
      : query.eq('qr_token', scannedValue).single()
  )

  if (invError || !invitation) {
    return NextResponse.json({ error: 'Invalid QR code — invitation not found' }, { status: 404 })
  }

  // 4. Make sure this invitation belongs to the same event as the scanner
  if (invitation.event_id !== scannerLink.event_id) {
    return NextResponse.json({ error: 'This QR code is for a different event' }, { status: 400 })
  }

  // 5. Check if invitation is cancelled
  if (invitation.status === 'cancelled') {
    return NextResponse.json({ error: 'This invitation has been cancelled' }, { status: 400 })
  }

  // 6. Check if already checked in
  if (invitation.checked_in_at || invitation.status === 'checked_in') {
    return NextResponse.json({
      error: 'Already checked in',
      alreadyEntered: true,
      enteredAt: invitation.checked_in_at,
      guest: invitation.attendee,
      partySize: invitation.party_size,
      seatInfo: invitation.seat_info,
    }, { status: 409 })
  }

  // 7. If checkOnly, just return the data (success)
  if (checkOnly) {
    return NextResponse.json({
      success: true,
      guest: invitation.attendee,
      partySize: invitation.party_size,
      remaining: 1, // With new checked-in flag, individual check-in is binary
      seatInfo: invitation.seat_info,
    })
  }

  // 8. Record check-in by updating the invitations table
  const { data: updatedInv, error: updateError } = await supabase
    .from('invitations')
    .update({
      status: 'checked_in',
      checked_in_at: new Date().toISOString(),
      checked_in_by: null, // Scanners are token-based gates, not authenticated auth.users
    })
    .eq('id', invitation.id)
    .select(`
      *,
      attendee:attendees(id, name, email, phone),
      ticket_tier:ticket_tiers(id, name)
    `)
    .single()

  if (updateError) {
    const msg = updateError.message || ''
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

  // Record entry log for historic gate metrics with explicit entry_type audit
  const { error: logError } = await supabase.from('entry_logs').insert({
    invitation_id: invitation.id,
    scanner_link_id: scannerLink.id,
    entry_type: entryType,
  })

  if (logError) {
    console.error('[scan] Non-blocking warning: Failed to insert entry_log for gate analytics:', logError)
  }

  return NextResponse.json({
    success: true,
    attendee: updatedInv.attendee,
    guest: updatedInv.attendee, // for compatibility with ScannerClient
    partySize: updatedInv.party_size,
    checkedInAt: updatedInv.checked_in_at,
    tier: updatedInv.ticket_tier,
  })
}


