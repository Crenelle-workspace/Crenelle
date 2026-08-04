/**
 * lib/paystack.ts
 *
 * Typed wrapper around the Paystack REST API.
 * Uses native fetch — no npm dependency needed.
 *
 * All amounts in/out are in KOBO (NGN × 100).
 * All functions throw on network errors; return { error } on Paystack API errors.
 */

import crypto from "crypto";

const BASE_URL = "https://api.paystack.co";

// ── Helpers ────────────────────────────────────────────────────

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

async function paystackFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  const response = await fetch(`${BASE_URL}${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const json = await response.json();

  if (!response.ok || !json.status) {
    return {
      data: null,
      error: json.message ?? `Paystack API error: ${response.status}`,
    };
  }

  return { data: json.data as T, error: null };
}

// ── Reference Generator ────────────────────────────────────────

/**
 * Generate a unique Paystack payment reference.
 * Format: CRN-{8 chars of eventId}-{timestamp}-{4 random chars}
 */
export function generatePaystackReference(eventId: string): string {
  const eventSlice = eventId.replace(/-/g, "").slice(0, 8).toUpperCase();
  const timestamp = Date.now();
  const random = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `CRN-${eventSlice}-${timestamp}-${random}`;
}

// ── HMAC Signature Verification ───────────────────────────────

/**
 * Verify a Paystack webhook signature.
 * The raw request body must be passed as a Buffer or string.
 * Paystack signs with HMAC-SHA512 using the secret key.
 */
export function verifyPaystackSignature(
  rawBody: string | Buffer,
  signature: string | null,
): boolean {
  if (!signature) return false;
  const secret =
    process.env.PAYSTACK_WEBHOOK_SECRET ?? process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("PAYSTACK_WEBHOOK_SECRET is not configured");

  const hash = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");

  // Constant-time comparison to avoid a timing side-channel that could let an
  // attacker recover the expected signature byte-by-byte. timingSafeEqual
  // throws on length mismatch, so guard on length first (the length of a
  // rejected forgery is not secret — only the content comparison must be safe).
  const hashBuf = Buffer.from(hash, "hex");
  const sigBuf = Buffer.from(signature, "hex");
  if (hashBuf.length !== sigBuf.length) return false;

  return crypto.timingSafeEqual(hashBuf, sigBuf);
}

// ── Types ──────────────────────────────────────────────────────

export interface PaystackInitializeParams {
  email: string;
  amount: number; // in kobo
  reference: string;
  subaccount?: string; // organiser's subaccount code (e.g. ACCT_xxxx)
  bearer?: "account" | "subaccount"; // who bears Paystack's processing fee
  /**
   * Flat kobo amount that Crenelle (main account) retains from this transaction.
   * Overrides the subaccount's default percentage_charge for this specific transaction.
   * Use this to guarantee the correct split even if the subaccount default was misconfigured.
   */
  transaction_charge?: number;
  callback_url?: string;
  metadata?: Record<string, unknown>;
  channels?: Array<"card" | "bank" | "ussd" | "bank_transfer" | "qr">;
}

export interface PaystackInitializeResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  id: number;
  domain: "live" | "test";
  status: "success" | "failed" | "abandoned";
  reference: string;
  amount: number; // in kobo
  fees: number; // Paystack fee in kobo
  gateway_response: string;
  paid_at: string | null;
  channel: string;
  currency: string;
  customer: {
    id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  subaccount?: {
    id: number;
    amount: number;
    account_code: string;
  };
  metadata?: Record<string, unknown>;
}

export interface PaystackSubaccountParams {
  business_name: string;
  settlement_bank: string; // bank code, e.g. '058'
  account_number: string;
  percentage_charge: number; // Crenelle's cut (%). The subaccount receives (100 - percentage_charge)%.
  description?: string;
  primary_contact_email?: string;
  primary_contact_name?: string;
  primary_contact_phone?: string;
}

export interface PaystackSubaccountResponse {
  id: number;
  subaccount_code: string; // e.g. ACCT_xxxxxxxxxxxxxxxx
  business_name: string;
  description: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  percentage_charge: number;
  settlement_bank: string;
  account_number: string;
}

export interface PaystackBank {
  id: number;
  name: string;
  slug: string;
  code: string; // used as settlement_bank in subaccount creation
  longcode: string;
  active: boolean;
  country: string;
  currency: string;
  type: "nuban" | "mobile_money" | "basa";
}

export interface PaystackResolveAccountResponse {
  account_number: string;
  account_name: string;
  bank_id: number;
}

// ── API Functions ──────────────────────────────────────────────

/**
 * Initialize a Paystack transaction.
 * Returns the authorization_url to redirect the guest to.
 */
export async function initializeTransaction(
  params: PaystackInitializeParams,
): Promise<
  | { data: PaystackInitializeResponse; error: null }
  | { data: null; error: string }
> {
  return paystackFetch<PaystackInitializeResponse>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Verify a transaction by reference.
 * Use as a fallback after redirect (in case webhook hasn't fired yet).
 */
export async function verifyTransaction(
  reference: string,
): Promise<
  { data: PaystackVerifyResponse; error: null } | { data: null; error: string }
> {
  return paystackFetch<PaystackVerifyResponse>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
}

/**
 * Create a Paystack subaccount for an organiser.
 * Called once when the organiser connects their bank account.
 */
export async function createSubaccount(
  params: PaystackSubaccountParams,
): Promise<
  | { data: PaystackSubaccountResponse; error: null }
  | { data: null; error: string }
> {
  return paystackFetch<PaystackSubaccountResponse>("/subaccount", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Fetch a subaccount by code.
 * Useful for displaying current bank details in Settings.
 */
export async function fetchSubaccount(
  subaccountCode: string,
): Promise<
  | { data: PaystackSubaccountResponse; error: null }
  | { data: null; error: string }
> {
  return paystackFetch<PaystackSubaccountResponse>(
    `/subaccount/${encodeURIComponent(subaccountCode)}`,
  );
}

/**
 * Update an existing Paystack subaccount.
 * Use to correct percentage_charge if the split was misconfigured.
 * Only the fields provided in params will be updated.
 */
export async function updateSubaccount(
  subaccountCode: string,
  params: Partial<Pick<PaystackSubaccountParams, 'percentage_charge' | 'business_name' | 'description'>>,
): Promise<
  | { data: PaystackSubaccountResponse; error: null }
  | { data: null; error: string }
> {
  return paystackFetch<PaystackSubaccountResponse>(
    `/subaccount/${encodeURIComponent(subaccountCode)}`,
    {
      method: 'PUT',
      body: JSON.stringify(params),
    },
  );
}

/**
 * List all Nigerian banks supported by Paystack.
 * Cache this response — it rarely changes.
 */
export async function listBanks(
  country: string = "nigeria",
  currency: string = "NGN",
): Promise<
  { data: PaystackBank[]; error: null } | { data: null; error: string }
> {
  return paystackFetch<PaystackBank[]>(
    `/bank?country=${country}&currency=${currency}&use_cursor=false&perPage=100`,
  );
}

/**
 * Resolve an account number to an account name.
 * Call this to verify the organiser's bank account before creating a subaccount.
 */
export async function resolveAccountNumber(
  accountNumber: string,
  bankCode: string,
): Promise<
  | { data: PaystackResolveAccountResponse; error: null }
  | { data: null; error: string }
> {
  return paystackFetch<PaystackResolveAccountResponse>(
    `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
  );
}

import type { PaymentBreakdown } from "./types";

/**
 * Calculate Paystack's transaction processing fee for NGN local payments in kobo.
 * Paystack standard NGN fee: 1.5% + ₦100 (10,000 kobo).
 * - ₦100 flat fee waived for transactions under ₦2,500 (250,000 kobo).
 * - Total fee capped at ₦2,000 (200,000 kobo).
 */
export function calculatePaystackFee(amountKobo: number): number {
  if (amountKobo <= 0) return 0;
  let fee = Math.round(amountKobo * 0.015);
  if (amountKobo >= 250000) {
    fee += 10000;
  }
  return Math.min(fee, 200000);
}

const PAYSTACK_PERCENT = 0.015;
const PAYSTACK_FLAT_KOBO = 10000; // ₦100 in kobo
const PAYSTACK_FLAT_THRESHOLD_KOBO = 250000; // ₦2,500 in kobo
const PAYSTACK_FEE_CAP_KOBO = 200000; // ₦2,000 in kobo
const ROUND_TO_KOBO = 1000; // ₦10 in kobo

/**
 * Calculate the full payment breakdown:
 * - Ticket Fee (target organiser price)
 * - Crenelle Charge (total fee charged to buyer over ticket price)
 * - Paystack Fee (gateway processing fee estimated on total amount)
 * - Total Amount & Net Organiser Payout (organiser receives 100% of ticket price)
 */
export function calculatePaymentBreakdown(
  ticketFeeKobo: number,
  platformFeePercent: number = 5,
): PaymentBreakdown {
  if (ticketFeeKobo <= 0) {
    return {
      ticketFeeKobo: 0,
      crenelleChargeKobo: 0,
      paystackFeeKobo: 0,
      totalAmountKobo: 0,
      organiserPayoutKobo: 0,
      platformFeePercent,
    };
  }

  const platformDecimal = platformFeePercent / 100;
  const combinedPercent = platformDecimal + PAYSTACK_PERCENT;
  if (combinedPercent >= 1) {
    throw new Error("Fee percentages must sum to less than 100%");
  }

  // Pass 1: assume total stays under the ₦2,500 flat-fee threshold.
  let totalKobo = Math.ceil(ticketFeeKobo / (1 - combinedPercent));

  // Pass 2: if total is >= ₦2,500 threshold, include ₦100 flat fee.
  if (totalKobo >= PAYSTACK_FLAT_THRESHOLD_KOBO) {
    totalKobo = Math.ceil(
      (ticketFeeKobo + PAYSTACK_FLAT_KOBO) / (1 - combinedPercent)
    );
  }

  // Pass 3: if uncapped fee exceeds ₦2,000 cap, fee becomes fixed at cap.
  const uncappedFee = totalKobo * PAYSTACK_PERCENT + PAYSTACK_FLAT_KOBO;
  if (uncappedFee > PAYSTACK_FEE_CAP_KOBO) {
    totalKobo = Math.ceil(
      (ticketFeeKobo + PAYSTACK_FEE_CAP_KOBO) / (1 - platformDecimal)
    );
  }

  // Round up to nearest ₦10 (1,000 kobo).
  const totalAmountKobo =
    Math.ceil(totalKobo / ROUND_TO_KOBO) * ROUND_TO_KOBO;

  const organiserPayoutKobo = ticketFeeKobo;
  const crenelleChargeKobo = totalAmountKobo - ticketFeeKobo;
  const paystackFeeKobo = calculatePaystackFee(totalAmountKobo);

  return {
    ticketFeeKobo,
    crenelleChargeKobo,
    paystackFeeKobo,
    totalAmountKobo,
    organiserPayoutKobo,
    platformFeePercent,
  };
}

/**
 * Calculate the split amounts for a transaction.
 * Returns kobo values for the platform fee and organiser share.
 *
 * Note: Paystack deducts its own processing fee first (1.5% + ₦100, capped ₦2,000).
 * Our platform_fee_percent is applied to the gross transaction amount.
 */
export function calculateSplit(
  amountKobo: number,
  platformFeePercent: number,
): {
  platformFeeKobo: number;
  organiserAmountKobo: number;
} {
  // Platform fee (Crenelle's cut) is a percentage of the gross amount
  const platformFeeKobo = Math.round((amountKobo * platformFeePercent) / 100);
  // Organiser gets the remainder
  const organiserAmountKobo = amountKobo - platformFeeKobo;

  return { platformFeeKobo, organiserAmountKobo };
}

/**
 * Format a kobo amount as a human-readable NGN string without decimals.
 * e.g. 20305 → "₦204"
 */
export function formatKoboAsNGN(kobo: number): string {
  const naira = Math.ceil(kobo / 100);
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(naira);
}


// ── Settlement Types & API ─────────────────────────────────────

export interface PaystackSettlement {
  id: number;
  domain: "live" | "test";
  status: "success" | "processing" | "failed";
  currency: string;
  integration: number;
  subaccount: {
    id: number;
    account_code: string;
    business_name: string;
  };
  total_amount: number;       // in kobo
  total_fees: number;         // Paystack fees in kobo
  net_amount: number;         // total_amount - total_fees, in kobo
  settled_by: string | null;
  settlement_date: string;    // ISO date string
  transfer_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaystackSettlementTransaction {
  id: number;
  reference: string;
  amount: number;       // gross amount in kobo
  fees: number;         // Paystack fee in kobo
  currency: string;
  channel: string;
  paid_at: string;
  customer: {
    id: number;
    email: string;
  };
}

/**
 * List settlements for a subaccount.
 * Use for the hourly reconciliation job: GET /settlement?subaccount={code}
 */
export async function listSettlements(
  subaccountCode: string,
  perPage: number = 50,
  page: number = 1,
): Promise<
  | { data: PaystackSettlement[]; error: null }
  | { data: null; error: string }
> {
  return paystackFetch<PaystackSettlement[]>(
    `/settlement?subaccount=${encodeURIComponent(subaccountCode)}&perPage=${perPage}&page=${page}`,
  );
}

/**
 * Fetch the individual transactions that make up a settlement batch.
 * Use to populate settlement_transactions: GET /settlement/:id/transactions
 */
export async function getSettlementTransactions(
  settlementId: number,
  perPage: number = 250,
  page: number = 1,
): Promise<
  | { data: PaystackSettlementTransaction[]; error: null }
  | { data: null; error: string }
> {
  return paystackFetch<PaystackSettlementTransaction[]>(
    `/settlement/${settlementId}/transactions?perPage=${perPage}&page=${page}`,
  );
}

