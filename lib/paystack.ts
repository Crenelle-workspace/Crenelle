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

  return hash === signature;
}

// ── Types ──────────────────────────────────────────────────────

export interface PaystackInitializeParams {
  email: string;
  amount: number; // in kobo
  reference: string;
  subaccount?: string; // organiser's subaccount code (e.g. ACCT_xxxx)
  bearer?: "account" | "subaccount"; // who bears Paystack's processing fee
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
  percentage_charge: number; // Paystack routes this % to the subaccount
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
 * Format a kobo amount as a human-readable NGN string.
 * e.g. 1000000 → "₦10,000.00"
 */
export function formatKoboAsNGN(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(naira);
}
