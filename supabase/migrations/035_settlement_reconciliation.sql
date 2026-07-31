-- ============================================================
-- Crenelle — Settlement Reconciliation Engine
-- Migration: 035_settlement_reconciliation.sql
-- ============================================================
--
-- Adds:
--   1. settlements            — one row per Paystack settlement batch received
--   2. settlement_transactions — join table: which payments make up each settlement
--
-- This is the piece §6 of the architecture guide describes:
--   "matching a lump-sum bank deposit back to the events that produced it"
--
-- Data flow:
--   Hourly cron → POST /api/settlements/reconcile
--   → GET /settlement?subaccount={code}  (Paystack API)
--   → GET /settlement/:id/transactions   (Paystack API)
--   → INSERT into settlements + settlement_transactions
--   → Power the organizer's Payout Reconciliation dashboard (§7 View 2)
--
-- From the v2 Production Readiness Checklist:
--   ✓ "Settlement reconciliation runs as its own polling job"
--   ✓ "Discrepant settlements are flagged, not silently dropped"
-- ============================================================

-- ── 1. settlements ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.settlements (
  id                      uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id            uuid          NOT NULL
                                        REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Paystack identifiers
  paystack_settlement_id  text          NOT NULL UNIQUE, -- Paystack's internal settlement ID
  transfer_reference      text,                          -- e.g. PAY-9041288-NG (bank transfer ref)
  -- Settlement details
  settlement_date         date          NOT NULL,
  total_amount            numeric(12,2) NOT NULL,         -- net amount deposited (in NGN, not kobo)
  -- Reconciliation status
  status                  text          NOT NULL DEFAULT 'PENDING'
                                        CHECK (status IN ('PENDING', 'MATCHED', 'DISCREPANCY')),
  -- Timestamps
  created_at              timestamptz   NOT NULL DEFAULT now(),
  updated_at              timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.settlements IS
  'One row per Paystack settlement batch. Populated by the hourly reconciliation job polling the Paystack /settlement endpoint.';

COMMENT ON COLUMN public.settlements.paystack_settlement_id IS
  'Paystack''s internal ID for this settlement batch. Used to fetch the list of transactions via /settlement/:id/transactions.';

COMMENT ON COLUMN public.settlements.transfer_reference IS
  'The bank transfer reference (e.g. PAY-XXXXXXXX-NG). Organizers can cross-reference this with their bank statement.';

COMMENT ON COLUMN public.settlements.status IS
  'PENDING: not yet matched to payments. MATCHED: all transactions accounted for. DISCREPANCY: some transactions could not be matched — requires manual review.';

-- ── 2. settlement_transactions ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.settlement_transactions (
  settlement_id           uuid          NOT NULL
                                        REFERENCES public.settlements(id) ON DELETE CASCADE,
  payment_id              uuid          NOT NULL
                                        REFERENCES public.payments(id) ON DELETE RESTRICT,
  -- The amount this specific payment contributed to the settlement
  -- (net of Paystack fees, may differ from payments.amount_kobo)
  amount_settled          numeric(10,2) NOT NULL,
  PRIMARY KEY (settlement_id, payment_id)
);

COMMENT ON TABLE public.settlement_transactions IS
  'Join table: maps individual payments to the settlement batch they were included in. Powers the per-event settlement breakdown in the organizer dashboard.';

-- ── 3. Indexes ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS settlements_organizer_id_idx
  ON public.settlements (organizer_id);

CREATE INDEX IF NOT EXISTS settlements_settlement_date_idx
  ON public.settlements (settlement_date DESC);

CREATE INDEX IF NOT EXISTS settlements_status_idx
  ON public.settlements (status)
  WHERE status IN ('PENDING', 'DISCREPANCY');

CREATE INDEX IF NOT EXISTS settlement_transactions_payment_id_idx
  ON public.settlement_transactions (payment_id);

-- ── 4. RLS — settlements ──────────────────────────────────────

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Organizers can view their own settlements
CREATE POLICY "Organisers can view their own settlements"
  ON public.settlements FOR SELECT
  USING (organizer_id = auth.uid());

-- Writes come exclusively from the reconciliation job (service-role client)

-- ── 5. RLS — settlement_transactions ─────────────────────────

ALTER TABLE public.settlement_transactions ENABLE ROW LEVEL SECURITY;

-- Organizers can view settlement_transactions for their settlements
CREATE POLICY "Organisers can view their settlement transactions"
  ON public.settlement_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.settlements s
      WHERE s.id = settlement_transactions.settlement_id
        AND s.organizer_id = auth.uid()
    )
  );

-- ── 6. updated_at trigger ─────────────────────────────────────

CREATE TRIGGER settlements_updated_at
  BEFORE UPDATE ON public.settlements
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
