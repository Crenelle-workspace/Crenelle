import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listSettlements, getSettlementTransactions } from '@/lib/paystack'
import * as Sentry from '@sentry/nextjs'

/**
 * POST /api/settlements/reconcile
 *
 * Settlement Reconciliation Engine — §6 of the Paystack Architecture Guide v2.
 *
 * Scalability fixes applied:
 *   FIX 1: Paystack API is now fully paginated — fetches ALL settlements, not just page 1
 *   FIX 2: DB lookups are batched — one IN() query per settlement instead of one query per transaction
 *
 * Triggered by Vercel Cron (see vercel.json) — runs hourly.
 * Can also be triggered manually (admin only) by POSTing with the CRON_SECRET header.
 */
export async function POST(request: NextRequest) {
  // ── Auth: Vercel Cron or manual admin trigger ────────────────
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results: {
    organizerId: string
    subaccountCode: string
    newSettlements: number
    discrepancies: number
    error?: string
  }[] = []

  try {
    // 1. Fetch all organizers with active Paystack subaccounts
    const { data: paymentSettings, error: settingsError } = await supabase
      .from('organizer_payment_settings')
      .select('organizer_id, paystack_subaccount_code')
      .not('paystack_subaccount_code', 'is', null)
      .eq('is_verified', true)

    if (settingsError) {
      Sentry.captureException(settingsError, {
        extra: { context: 'settlement_reconciliation_fetch_settings' },
      })
      return NextResponse.json({ error: 'Failed to fetch payment settings' }, { status: 500 })
    }

    if (!paymentSettings || paymentSettings.length === 0) {
      return NextResponse.json({ message: 'No verified subaccounts to reconcile', processed: 0 })
    }

    // 2. Process each organizer's subaccount
    for (const settings of paymentSettings) {
      const { organizer_id: organizerId, paystack_subaccount_code: subaccountCode } = settings
      if (!subaccountCode) continue

      let newSettlements = 0
      let discrepancies = 0

      try {
        // ── FIX 1: Paginate through ALL Paystack settlements ─────────────────
        // Previously only fetched page 1 (max 50 results) — silently missing
        // any settlements beyond the first 50. Now loops until Paystack returns
        // an empty page, fetching the complete history.
        const allSettlements = await fetchAllSettlements(subaccountCode)

        if (allSettlements === null) {
          Sentry.captureMessage('[Settlement Reconcile] Failed to fetch settlements from Paystack', {
            level: 'error',
            extra: { organizerId, subaccountCode },
          })
          results.push({ organizerId, subaccountCode, newSettlements: 0, discrepancies: 0, error: 'Paystack API error' })
          continue
        }

        // Only process settlements Paystack considers complete
        const successSettlements = allSettlements.filter(s => s.status === 'success')

        // ── FIX 2a: Batch idempotency check ──────────────────────────────────
        // Previously: one SELECT per settlement (N queries).
        // Now: one SELECT with IN() to get all already-processed IDs at once.
        const allPaystackIds = successSettlements.map(s => String(s.id))

        const { data: existingSettlements } = await supabase
          .from('settlements')
          .select('paystack_settlement_id')
          .in('paystack_settlement_id', allPaystackIds)

        const alreadyProcessed = new Set(
          (existingSettlements ?? []).map(s => s.paystack_settlement_id)
        )

        // Only work on settlements we haven't seen before
        const newOnes = successSettlements.filter(s => !alreadyProcessed.has(String(s.id)))

        // 3. Process each new settlement
        for (const settlement of newOnes) {
          // Fetch the individual transactions in this settlement batch
          const txns = await fetchAllSettlementTransactions(settlement.id)

          if (txns === null) {
            Sentry.captureMessage('[Settlement Reconcile] Failed to fetch settlement transactions', {
              level: 'error',
              extra: { organizerId, settlementId: settlement.id },
            })
            continue
          }

          // Insert the settlement row
          const settlementDate = settlement.settlement_date
            ? new Date(settlement.settlement_date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]

          const { data: newSettlement, error: insertError } = await supabase
            .from('settlements')
            .insert({
              organizer_id:           organizerId,
              paystack_settlement_id: String(settlement.id),
              transfer_reference:     settlement.transfer_reference ?? null,
              settlement_date:        settlementDate,
              total_amount:           settlement.net_amount / 100, // kobo → NGN
              status:                 'PENDING',
            })
            .select('id')
            .single()

          if (insertError || !newSettlement) {
            Sentry.captureException(insertError, {
              extra: { organizerId, settlementId: settlement.id, context: 'settlement_insert' },
            })
            continue
          }

          newSettlements++

          // ── FIX 2b: Batch payment lookup ──────────────────────────────────
          // Previously: one SELECT per transaction (K queries per settlement).
          // Now: collect all references, do a single IN() query, build a Map.
          // For a settlement with 250 transactions this goes from 250 queries → 1.
          const allRefs = txns.map(t => t.reference)

          const { data: matchedPayments } = await supabase
            .from('payments')
            .select('id, paystack_reference')
            .in('paystack_reference', allRefs)

          const paymentByRef = new Map(
            (matchedPayments ?? []).map(p => [p.paystack_reference, p.id])
          )

          // Build settlement_transaction rows and identify unmatched refs
          const settlementTxnRows: {
            settlement_id: string
            payment_id: string
            amount_settled: number
          }[] = []

          let hasDiscrepancy = false

          for (const txn of txns) {
            const paymentId = paymentByRef.get(txn.reference)

            if (!paymentId) {
              hasDiscrepancy = true
              Sentry.captureMessage('[Settlement Reconcile] Unmatched transaction in settlement', {
                level: 'warning',
                extra: {
                  organizerId,
                  settlementId: settlement.id,
                  txnReference: txn.reference,
                  txnAmount: txn.amount,
                },
              })
              continue
            }

            settlementTxnRows.push({
              settlement_id:  newSettlement.id,
              payment_id:     paymentId,
              amount_settled: (txn.amount - txn.fees) / 100, // net in NGN
            })
          }

          // ── FIX 2c: Batch insert settlement_transactions ──────────────────
          // Previously: one upsert per transaction row (K DB writes).
          // Now: single bulk upsert for the entire settlement batch.
          if (settlementTxnRows.length > 0) {
            await supabase
              .from('settlement_transactions')
              .upsert(settlementTxnRows, { ignoreDuplicates: true })
          }

          if (hasDiscrepancy) discrepancies++

          // Update settlement status
          await supabase
            .from('settlements')
            .update({ status: hasDiscrepancy ? 'DISCREPANCY' : 'MATCHED' })
            .eq('id', newSettlement.id)
        }

        results.push({ organizerId, subaccountCode, newSettlements, discrepancies })
      } catch (orgErr) {
        Sentry.captureException(orgErr, {
          extra: { organizerId, context: 'settlement_reconciliation_per_organizer' },
        })
        results.push({
          organizerId,
          subaccountCode,
          newSettlements: 0,
          discrepancies: 0,
          error: String(orgErr),
        })
      }
    }

    return NextResponse.json({
      message: 'Reconciliation complete',
      processed: paymentSettings.length,
      results,
    })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'settlement_reconciliation_top_level' } })
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 })
  }
}

// ── Pagination helpers ────────────────────────────────────────

/**
 * Fetch ALL settlements for a subaccount by paginating through Paystack's API.
 * Returns null if any page fetch fails (so the caller can log the error).
 *
 * FIX 1: The original code only fetched page 1 (max 50 results).
 * An organizer with >50 settlements would silently lose history.
 */
async function fetchAllSettlements(subaccountCode: string) {
  const all: Awaited<ReturnType<typeof listSettlements>>['data'] = []
  let page = 1
  const perPage = 50

  while (true) {
    const { data, error } = await listSettlements(subaccountCode, perPage, page)
    if (error || !data) return null          // surface error to caller
    if (data.length === 0) break            // no more pages
    all.push(...data)
    if (data.length < perPage) break        // last (partial) page
    page++
  }

  return all
}

/**
 * Fetch ALL transactions for a settlement by paginating through Paystack's API.
 * Returns null on any API error.
 */
async function fetchAllSettlementTransactions(settlementId: number) {
  const all: Awaited<ReturnType<typeof getSettlementTransactions>>['data'] = []
  let page = 1
  const perPage = 250 // Paystack's max

  while (true) {
    const { data, error } = await getSettlementTransactions(settlementId, perPage, page)
    if (error || !data) return null
    if (data.length === 0) break
    all.push(...data)
    if (data.length < perPage) break
    page++
  }

  return all
}
