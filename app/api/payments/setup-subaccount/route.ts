import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveAccountNumber, createSubaccount, updateSubaccount } from '@/lib/paystack'
import * as Sentry from '@sentry/nextjs'

/**
 * POST /api/payments/setup-subaccount
 *
 * Creates or updates a Paystack subaccount for the authenticated organiser.
 * Idempotent on 'connect': if the organiser already has a subaccount in the DB,
 * we update it on Paystack instead of creating a new one — preventing orphaned
 * duplicate subaccounts from repeated form submissions.
 *
 *   Step 1 (resolve):   { action: 'resolve', account_number, bank_code }
 *     → Returns resolved account_name for confirmation UI
 *
 *   Step 2 (connect):   { action: 'connect', account_number, bank_code, bank_name, business_name }
 *     → Creates (or updates) the Paystack subaccount and saves to organizer_payment_settings
 *
 *   Step 3 (update):    { action: 'update' }
 *     → Re-syncs percentage_charge on the existing subaccount to match PAYSTACK_PLATFORM_FEE_PERCENT
 */
export async function POST(request: NextRequest) {
  // Auth check — must be a logged-in organiser
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let body: {
    action?: 'resolve' | 'connect' | 'update'
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
      console.error('[Setup Subaccount] Account resolution failed:', error)
      return NextResponse.json(
        { error: error ?? 'Could not verify account. Please check the account number and bank.' },
        { status: 422 }
      )
    }

    return NextResponse.json({
      account_name: data.account_name,
      account_number: data.account_number,
    })
  }

  // ── Step 2: Create (or update) subaccount and save to DB ──────
  if (action === 'connect') {
    if (!bank_name || !business_name) {
      return NextResponse.json(
        { error: 'bank_name and business_name are required for connect' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()
    const platformFeePercent = parseFloat(process.env.PAYSTACK_PLATFORM_FEE_PERCENT ?? '5')

    // IMPORTANT: In Paystack, percentage_charge = the main account's (Crenelle's) cut.
    // The subaccount automatically receives the remainder (100% - percentage_charge).
    // e.g. percentage_charge: 5 → Crenelle keeps 5%, organiser receives 95%.
    const crenellePercent = platformFeePercent

    // ── Idempotency guard: reuse existing subaccount if one exists ──
    // Check if this organiser already has a subaccount in our DB.
    // If they do, update it on Paystack (PUT) rather than creating a duplicate (POST).
    const { data: existing } = await adminSupabase
      .from('organizer_payment_settings')
      .select('paystack_subaccount_code')
      .eq('organizer_id', user.id)
      .maybeSingle()

    let subaccountCode: string
    let subaccountBusinessName: string

    if (existing?.paystack_subaccount_code) {
      // ── Existing subaccount: update bank details + percentage_charge ──
      console.log(`[Setup Subaccount] Organiser ${user.id} already has subaccount ${existing.paystack_subaccount_code} — updating instead of creating`)

      const { data: updated, error: updateError } = await updateSubaccount(
        existing.paystack_subaccount_code,
        {
          business_name,
          percentage_charge: crenellePercent,
        }
      )

      if (updateError || !updated) {
        Sentry.captureMessage('[Paystack Setup] Failed to update existing subaccount on reconnect', {
          level: 'error',
          extra: { userId: user.id, subaccountCode: existing.paystack_subaccount_code, updateError },
        })
        return NextResponse.json(
          { error: updateError ?? 'Failed to update payment account. Please try again.' },
          { status: 502 }
        )
      }

      subaccountCode = existing.paystack_subaccount_code
      subaccountBusinessName = updated.business_name
    } else {
      // ── No existing subaccount: create a fresh one ──
      const { data: created, error: createError } = await createSubaccount({
        business_name,
        settlement_bank: bank_code,
        account_number,
        percentage_charge: crenellePercent,
        description: `Crenelle organiser: ${business_name}`,
        primary_contact_email: user.email,
      })

      if (createError || !created) {
        Sentry.captureMessage('[Paystack Setup] Failed to create subaccount', {
          level: 'error',
          extra: { userId: user.id, error: createError },
        })
        return NextResponse.json(
          { error: createError ?? 'Failed to create payment account. Please try again.' },
          { status: 502 }
        )
      }

      subaccountCode = created.subaccount_code
      subaccountBusinessName = created.business_name
    }

    // Save / update the subaccount details in our DB
    const { error: upsertError } = await adminSupabase
      .from('organizer_payment_settings')
      .upsert(
        {
          organizer_id: user.id,
          paystack_subaccount_code: subaccountCode,
          bank_name,
          bank_code,
          account_number,
          account_name: subaccountBusinessName,
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
        { error: 'Payment account saved with Paystack but failed to save locally. Contact support.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subaccount_code: subaccountCode,
      account_name: subaccountBusinessName,
      message: 'Bank account connected successfully. Payments will be settled within T+1.',
    })
  }

  // ── Step 3: Update an existing subaccount (fix inverted percentage_charge) ─
  if (action === 'update') {
    const adminSupabase = createAdminClient()
    const platformFeePercent = parseFloat(process.env.PAYSTACK_PLATFORM_FEE_PERCENT ?? '5')
    // IMPORTANT: In Paystack, percentage_charge = the main account's (Crenelle's) cut.
    // The subaccount automatically receives the remainder (100% - percentage_charge).
    // e.g. percentage_charge: 5 → Crenelle keeps 5%, organiser receives 95%.
    const crenellePercent = platformFeePercent
    const organiserPercent = 100 - platformFeePercent

    // Fetch the organiser's current subaccount code from DB
    const { data: paySettings, error: settingsError } = await adminSupabase
      .from('organizer_payment_settings')
      .select('paystack_subaccount_code')
      .eq('organizer_id', user.id)
      .maybeSingle()

    if (settingsError || !paySettings?.paystack_subaccount_code) {
      return NextResponse.json(
        { error: 'No connected subaccount found. Please connect your bank account first.' },
        { status: 404 }
      )
    }

    const { data: updated, error: updateError } = await updateSubaccount(
      paySettings.paystack_subaccount_code,
      { percentage_charge: crenellePercent },
    )

    if (updateError || !updated) {
      Sentry.captureMessage('[Paystack] Failed to update subaccount percentage_charge', {
        level: 'error',
        extra: { userId: user.id, subaccountCode: paySettings.paystack_subaccount_code, updateError },
      })
      return NextResponse.json(
        { error: updateError ?? 'Failed to update subaccount. Please try again.' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      subaccount_code: paySettings.paystack_subaccount_code,
      percentage_charge: updated.percentage_charge,
      message: `Subaccount updated: Crenelle retains ${crenellePercent}%, organiser receives ${organiserPercent}%.`,
    })
  }

  return NextResponse.json({ error: 'Invalid action. Use "resolve", "connect", or "update".' }, { status: 400 })
}
