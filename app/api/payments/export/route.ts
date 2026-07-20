import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/payments/export?event_id={id}
 *
 * Exports all payments for an event as a CSV file.
 * Requires organiser auth — RLS ensures only the event owner can access.
 */
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get('event_id')

  if (!eventId) {
    return NextResponse.json({ error: 'event_id is required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Fetch payments — RLS on the payments table ensures only the organiser sees their data
  const { data: payments, error } = await supabase
    .from('payments')
    .select(`
      paystack_reference,
      status,
      payer_name,
      payer_email,
      amount_kobo,
      platform_fee_kobo,
      organiser_amount_kobo,
      currency,
      paystack_channel,
      paid_at,
      created_at
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!payments || payments.length === 0) {
    return NextResponse.json({ error: 'No payments found for this event' }, { status: 404 })
  }

  // Build CSV
  const headers = [
    'Reference',
    'Status',
    'Name',
    'Email',
    'Amount (NGN)',
    'Platform Fee (NGN)',
    'Organiser Share (NGN)',
    'Currency',
    'Channel',
    'Paid At',
    'Created At',
  ]

  function escapeCSV(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = payments.map((p) => [
    escapeCSV(p.paystack_reference),
    escapeCSV(p.status),
    escapeCSV(p.payer_name),
    escapeCSV(p.payer_email),
    escapeCSV(p.amount_kobo != null ? (p.amount_kobo / 100).toFixed(2) : null),
    escapeCSV(p.platform_fee_kobo != null ? (p.platform_fee_kobo / 100).toFixed(2) : null),
    escapeCSV(p.organiser_amount_kobo != null ? (p.organiser_amount_kobo / 100).toFixed(2) : null),
    escapeCSV(p.currency),
    escapeCSV(p.paystack_channel),
    escapeCSV(p.paid_at),
    escapeCSV(p.created_at),
  ].join(','))

  const csv = [headers.join(','), ...rows].join('\n')
  const filename = `payments-${eventId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
