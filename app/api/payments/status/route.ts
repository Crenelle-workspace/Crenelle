import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/payments/status?reference={ref}
 *
 * Exposes a public status lookup for checkout confirmation.
 * Authenticates solely by the unguessable transaction reference.
 */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get('reference')

  if (!reference) {
    return NextResponse.json({ error: 'Missing reference parameter' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: payment, error } = await supabase
    .from('payments')
    .select('status, payer_name, payer_email, event:events(name)')
    .eq('paystack_reference', reference)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Failed to retrieve status' }, { status: 500 })
  }

  if (!payment) {
    return NextResponse.json({ status: 'not_found' })
  }

  return NextResponse.json({
    status: payment.status,
    payer_name: payment.payer_name,
    payer_email: payment.payer_email,
    event_name: (payment.event as any)?.name ?? null,
  })
}
