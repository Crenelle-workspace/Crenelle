import { NextRequest, NextResponse } from 'next/server'
import { sendInvitationEmail, sendReminderEmailsDirect } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Require authentication
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, eventId } = body

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    }

    // Fetch the event from the database securely.
    // RLS ensures the user can only fetch their own events.
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('name, date, time, venue, description, banner_url')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 })
    }

    if (type === 'invitation') {
      const { recipientEmail, recipientName, invitationId } = body
      const res = await sendInvitationEmail({
        eventId,
        recipientEmail,
        recipientName,
        invitationId,
        event,
      })

      if (res.error) {
        return NextResponse.json({ error: res.error }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    } else if (type === 'reminder') {
      // SECURITY: never trust a client-supplied recipient list here.
      // Accepting `recipients` from the body turns this authenticated endpoint
      // into an open mail relay — any logged-in user could blast arbitrary
      // addresses using our Resend key and domain reputation. Derive the
      // recipients server-side from the event's own non-cancelled invitations
      // (RLS on the event fetch above already proved the caller owns it).
      const { customMessage } = body

      const { data: invitations } = await supabase
        .from('invitations')
        .select('id, status, attendee:attendees(email, name)')
        .eq('event_id', eventId)
        .neq('status', 'cancelled')

      const invList = (invitations ?? []) as unknown as {
        id: string
        status: string
        attendee: { email?: string; name?: string } | { email?: string; name?: string }[]
      }[]
      const recipients = invList
        .map((inv) => {
          const attendee = Array.isArray(inv.attendee) ? inv.attendee[0] : inv.attendee
          return { email: attendee?.email, name: attendee?.name ?? 'Guest', invitationId: inv.id }
        })
        .filter((r): r is { email: string; name: string; invitationId: string } => Boolean(r.email))

      if (recipients.length === 0) {
        return NextResponse.json({ error: 'No confirmed guests with emails to send to' }, { status: 400 })
      }

      const res = await sendReminderEmailsDirect({
        eventId,
        recipients,
        event,
        customMessage: typeof customMessage === 'string' ? customMessage : '',
      })

      return NextResponse.json({
        success: true,
        sent: res.sent,
        errors: res.errors,
      })
    }

    return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })
  } catch (e: unknown) {
    console.error('API Send email error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal server error' }, { status: 500 })
  }
}
