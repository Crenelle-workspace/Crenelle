import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveAccountNumber, createSubaccount } from '@/lib/paystack'
import * as Sentry from '@sentry/nextjs'

/**
 * POST /api/payments/setup-subaccount
 *
 * Creates a Paystack subaccount for the authenticated organiser's bank account.
 * Can be called in two steps:
 *
 *   Step 1 (resolve):   { action: 'resolve', account_number, bank_code }
 *     → Returns resolved account_name for confirmation UI
 *
 *   Step 2 (connect):   { action: 'connect', account_number, bank_code, bank_name, business_name }
 *     → Creates the Paystack subaccount and stores it in organizer_payment_settings
 */
export async function POST(request: NextRequest) {
  // Auth check — must be a logged-in organiser
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let body: {
    action?: 'resolve' | 'connect'
    account_number?: string
    bank_code?: string
    bank_name?: string
    business_name?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, account_number, bank_code, bank_name, business_name } = body

  if (!action || !account_number || !bank_code) {
    return NextResponse.json(
      { error: 'action, account_number, and bank_code are required' },
      { status: 400 }
    )
  }

  // ── Step 1: Resolve account number → account name ─────────────
  if (action === 'resolve') {
    const { data, error } = await resolveAccountNumber(account_number, bank_code)

    if (error || !data) {
      return NextResponse.json(
        { error: 'Could not verify account. Please check the account number and bank.' },
        { status: 422 }
      )
    }

    return NextResponse.json({
      account_name: data.account_name,
      account_number: data.account_number,
    })
  }

  // ── Step 2: Create subaccount and save to DB ───────────────────
  if (action === 'connect') {
    if (!bank_name || !business_name) {
      return NextResponse.json(
        { error: 'bank_name and business_name are required for connect' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()
    const platformFeePercent = parseFloat(process.env.PAYSTACK_PLATFORM_FEE_PERCENT ?? '5')

    // Organiser receives (100 - platformFee)% of each transaction
    const organiserPercent = 100 - platformFeePercent

    // Create the Paystack subaccount
    const { data: subaccount, error: subaccountError } = await createSubaccount({
      business_name,
      settlement_bank: bank_code,
      account_number,
      percentage_charge: organiserPercent,
      description: `Crenelle organiser: ${business_name}`,
      primary_contact_email: user.email,
    })

    if (subaccountError || !subaccount) {
      Sentry.captureMessage('[Paystack Setup] Failed to create subaccount', {
        level: 'error',
        extra: { userId: user.id, error: subaccountError },
      })
      return NextResponse.json(
        { error: subaccountError ?? 'Failed to create payment account. Please try again.' },
        { status: 502 }
      )
    }

    // Upsert into organizer_payment_settings
    const { error: upsertError } = await adminSupabase
      .from('organizer_payment_settings')
      .upsert(
        {
          organizer_id: user.id,
          paystack_subaccount_code: subaccount.subaccount_code,
          bank_name,
          bank_code,
          account_number,
          account_name: subaccount.business_name,
          is_verified: true,
          platform_fee_percent: platformFeePercent,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organizer_id' }
      )

    if (upsertError) {
      Sentry.captureException(upsertError, {
        extra: { userId: user.id, context: 'setup_subaccount_upsert' },
      })
      return NextResponse.json(
        { error: 'Payment account created with Paystack but failed to save. Contact support.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subaccount_code: subaccount.subaccount_code,
      account_name: subaccount.business_name,
      message: 'Bank account connected successfully. Payments will be settled within T+1.',
    })
  }

  return NextResponse.json({ error: 'Invalid action. Use "resolve" or "connect".' }, { status: 400 })
}
