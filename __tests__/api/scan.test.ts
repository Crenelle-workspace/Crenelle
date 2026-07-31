/**
 * __tests__/api/scan.test.ts
 *
 * Unit tests for POST /api/scan — the QR code check-in endpoint.
 *
 * ARCHITECTURE NOTE (migration 042):
 * The route no longer performs its own sequence of table reads and the
 * check-in UPDATE. Scanner validation, event status, invitation resolution,
 * the row lock, every guard and the entry_logs insert all happen inside the
 * Postgres function `process_check_in()`, which the route invokes in a single
 * `supabase.rpc(...)` call and whose `outcome` field it maps onto HTTP
 * responses.
 *
 * What that means for these tests: the guards themselves are now DATABASE
 * behaviour and are not reachable from here — mocking `rpc` mocks out the
 * thing that enforces them. So what we cover at this layer is:
 *
 *   1. Route-owned logic: input validation, rate limiting, and the credential
 *      resolution that decides qr_token vs signed ephemeral handle (including
 *      the exact arguments handed to the RPC).
 *   2. The outcome -> HTTP status/body contract for every outcome the RPC can
 *      return, so a renamed or dropped outcome fails loudly here.
 *
 * The guard LOGIC lives in supabase/migrations/042_process_check_in_rpc.sql
 * and needs a real Postgres to exercise (see __tests__/migrations/ for the
 * static-analysis stopgap this repo uses in the absence of a CI database).
 *
 * The admin client, rate limiter and ephemeral-token verifier are all mocked —
 * no network, no DB, no shared counter state between tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimitAsync: vi.fn() }))
vi.mock('@/lib/ephemeral-token', () => ({ verifyEphemeralSearchToken: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { verifyEphemeralSearchToken } from '@/lib/ephemeral-token'
import { POST } from '@/app/api/scan/route'

const mockCreateAdminClient = createAdminClient as ReturnType<typeof vi.fn>
const mockCheckRateLimit = checkRateLimitAsync as ReturnType<typeof vi.fn>
const mockVerifyEphemeral = verifyEphemeralSearchToken as ReturnType<typeof vi.fn>

// ── Test data fixtures ─────────────────────────────────────────────────────

const SCANNER_TOKEN = 'tok_abc123'
const INVITATION_ID = 'inv-1'
const QR_TOKEN = 'qr-xyz'
const EPH_HANDLE = 'eph_signed_handle_value'

const GUEST = { id: 'att-1', name: 'Alice Doe', email: 'alice@x.com', phone: null }
const TICKET_TIER = { id: 'tier-1', name: 'VIP' }

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/scan', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Mock the admin client's rpc(). `result` is the jsonb process_check_in()
 * returns; `error` simulates a transport/permission failure on the call itself.
 * Returns the spy so tests can assert the arguments the route passed.
 */
function mockRpc(result: unknown, error: { message: string } | null = null) {
  const rpcSpy = vi.fn().mockResolvedValue({ data: result, error })
  mockCreateAdminClient.mockReturnValue({ rpc: rpcSpy })
  return rpcSpy
}

/** Standard scan request body for a camera scan. */
const CAMERA_SCAN = { invitationId: QR_TOKEN, scannerToken: SCANNER_TOKEN }

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/scan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Allow by default; the rate-limit block has its own test.
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 59, resetAt: 0 })
    // Not an ephemeral handle by default.
    mockVerifyEphemeral.mockReturnValue(null)
  })

  // ── Input validation ─────────────────────────────────────────────────────

  describe('input validation', () => {
    it('returns 400 when invitationId is missing', async () => {
      const rpc = mockRpc(null)

      const res = await POST(makeRequest({ scannerToken: SCANNER_TOKEN }))

      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/missing/i)
      expect(rpc).not.toHaveBeenCalled()
    })

    it('returns 400 when scannerToken is missing', async () => {
      const rpc = mockRpc(null)

      const res = await POST(makeRequest({ invitationId: QR_TOKEN }))

      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/missing/i)
      expect(rpc).not.toHaveBeenCalled()
    })
  })

  // ── Rate limiting ────────────────────────────────────────────────────────

  describe('rate limiting', () => {
    it('returns 429 without hitting the database when the limit is exceeded', async () => {
      const rpc = mockRpc(null)
      mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: 0 })

      const res = await POST(makeRequest(CAMERA_SCAN))

      expect(res.status).toBe(429)
      expect((await res.json()).error).toMatch(/too many/i)
      expect(rpc).not.toHaveBeenCalled()
    })

    it('scopes the rate-limit key to the scanner token and client IP', async () => {
      mockRpc({ outcome: 'checked_in' })

      await POST(makeRequest(CAMERA_SCAN))

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({ key: `scan-post:${SCANNER_TOKEN}:127.0.0.1`, limit: 60 })
      )
    })
  })

  // ── Credential resolution (route-owned logic) ────────────────────────────

  describe('credential resolution', () => {
    it('treats a plain value as a qr_token and marks the entry qr_camera', async () => {
      const rpc = mockRpc({ outcome: 'checked_in' })

      await POST(makeRequest(CAMERA_SCAN))

      expect(rpc).toHaveBeenCalledWith('process_check_in', {
        p_scanner_token: SCANNER_TOKEN,
        p_qr_token: QR_TOKEN,
        p_invitation_id: null,
        p_entry_type: 'qr_camera',
        p_check_only: false,
      })
      expect(mockVerifyEphemeral).not.toHaveBeenCalled()
    })

    it('verifies an eph_ handle and marks the entry manual_search', async () => {
      const rpc = mockRpc({ outcome: 'checked_in' })
      mockVerifyEphemeral.mockReturnValue(INVITATION_ID)

      await POST(makeRequest({ invitationId: EPH_HANDLE, scannerToken: SCANNER_TOKEN }))

      expect(mockVerifyEphemeral).toHaveBeenCalledWith(EPH_HANDLE, SCANNER_TOKEN)
      expect(rpc).toHaveBeenCalledWith('process_check_in', {
        p_scanner_token: SCANNER_TOKEN,
        p_qr_token: null,
        p_invitation_id: INVITATION_ID,
        p_entry_type: 'manual_search',
        p_check_only: false,
      })
    })

    it('returns 403 for an expired or forged eph_ handle, without hitting the database', async () => {
      const rpc = mockRpc(null)
      mockVerifyEphemeral.mockReturnValue(null)

      const res = await POST(makeRequest({ invitationId: EPH_HANDLE, scannerToken: SCANNER_TOKEN }))

      expect(res.status).toBe(403)
      expect((await res.json()).error).toMatch(/expired or invalid/i)
      expect(rpc).not.toHaveBeenCalled()
    })

    it('forwards checkOnly to the RPC', async () => {
      const rpc = mockRpc({ outcome: 'check_only', guest: GUEST, partySize: 2 })

      await POST(makeRequest({ ...CAMERA_SCAN, checkOnly: true }))

      expect(rpc).toHaveBeenCalledWith(
        'process_check_in',
        expect.objectContaining({ p_check_only: true })
      )
    })
  })

  // ── Outcome -> HTTP contract ─────────────────────────────────────────────
  //
  // These guards are enforced inside process_check_in(); here we only pin the
  // translation of each outcome so a renamed outcome can't silently 500.

  describe('outcome mapping', () => {
    const CASES: Array<[string, number, RegExp]> = [
      ['scanner_invalid', 403, /invalid scanner link/i],
      ['scanner_inactive', 403, /deactivated/i],
      ['event_not_found', 404, /event not found/i],
      ['event_ended', 403, /ended/i],
      ['event_not_open', 403, /not yet open/i],
      ['invitation_not_found', 404, /not found/i],
      ['wrong_event', 400, /different event/i],
      ['cancelled', 400, /cancelled/i],
    ]

    it.each(CASES)('maps outcome "%s" to %i', async (outcome, status, pattern) => {
      mockRpc({ outcome })

      const res = await POST(makeRequest(CAMERA_SCAN))

      expect(res.status).toBe(status)
      expect((await res.json()).error).toMatch(pattern)
    })

    it('returns 500 for an unrecognised outcome', async () => {
      mockRpc({ outcome: 'something_new_nobody_mapped' })

      const res = await POST(makeRequest(CAMERA_SCAN))

      expect(res.status).toBe(500)
    })
  })

  // ── already_checked_in ───────────────────────────────────────────────────

  describe('already checked in', () => {
    it('returns 409 with the prior entry details', async () => {
      mockRpc({
        outcome: 'already_checked_in',
        enteredAt: '2025-12-31T20:00:00Z',
        guest: GUEST,
        partySize: 2,
        seatInfo: 'Row A - 12',
      })

      const res = await POST(makeRequest(CAMERA_SCAN))

      expect(res.status).toBe(409)
      const json = await res.json()
      expect(json.error).toMatch(/already checked in/i)
      expect(json.alreadyEntered).toBe(true)
      expect(json.enteredAt).toBe('2025-12-31T20:00:00Z')
      expect(json.guest).toEqual(GUEST)
      expect(json.seatInfo).toBe('Row A - 12')
    })
  })

  // ── checkOnly mode ───────────────────────────────────────────────────────

  describe('checkOnly mode', () => {
    it('returns guest info and writes nothing', async () => {
      mockRpc({
        outcome: 'check_only',
        guest: GUEST,
        partySize: 2,
        seatInfo: 'Row A - 12',
      })

      const res = await POST(makeRequest({ ...CAMERA_SCAN, checkOnly: true }))

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.guest).toEqual(GUEST)
      expect(json.partySize).toBe(2)
      expect(json.remaining).toBe(1)
    })
  })

  // ── Successful check-in ──────────────────────────────────────────────────

  describe('successful check-in', () => {
    it('returns guest and tier data on a valid scan', async () => {
      mockRpc({
        outcome: 'checked_in',
        attendee: GUEST,
        guest: GUEST,
        partySize: 2,
        checkedInAt: '2025-12-31T21:00:00Z',
        tier: TICKET_TIER,
      })

      const res = await POST(makeRequest(CAMERA_SCAN))

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.attendee).toEqual(GUEST)
      expect(json.guest).toEqual(GUEST) // ScannerClient compatibility
      expect(json.partySize).toBe(2)
      expect(json.checkedInAt).toBe('2025-12-31T21:00:00Z')
      expect(json.tier).toEqual(TICKET_TIER)
    })
  })

  // ── Trigger-raised business rules ────────────────────────────────────────
  //
  // The triggers fire inside the RPC's UPDATE; process_check_in() catches them
  // and returns outcome='error' with SQLERRM verbatim in `message`. The route
  // string-matches that message, so this contract must hold in both places.

  describe('trigger error handling', () => {
    const TRIGGER_CASES: Array<[string, number, RegExp]> = [
      ['invitation_already_checked_in', 409, /already checked in/i],
      ['invalid_status_transition', 422, /invalid status/i],
      ['tier_capacity_exceeded', 409, /full/i],
      ['tier_soft_deleted', 422, /no longer available/i],
      ['scanner_write_restricted', 403, /insufficient permissions/i],
    ]

    it.each(TRIGGER_CASES)('maps SQLERRM "%s" to %i', async (message, status, pattern) => {
      mockRpc({ outcome: 'error', message })

      const res = await POST(makeRequest(CAMERA_SCAN))

      expect(res.status).toBe(status)
      expect((await res.json()).error).toMatch(pattern)
    })

    it('returns 500 for an unexpected database error', async () => {
      mockRpc({ outcome: 'error', message: 'connection refused' })

      const res = await POST(makeRequest(CAMERA_SCAN))

      expect(res.status).toBe(500)
    })
  })

  // ── RPC transport failures ───────────────────────────────────────────────

  describe('RPC transport failures', () => {
    it('returns 500 when the rpc call itself errors', async () => {
      mockRpc(null, { message: 'permission denied for function process_check_in' })

      const res = await POST(makeRequest(CAMERA_SCAN))

      expect(res.status).toBe(500)
      expect((await res.json()).error).toMatch(/permission denied/i)
    })

    it('returns 500 when the rpc returns no result', async () => {
      mockRpc(null)

      const res = await POST(makeRequest(CAMERA_SCAN))

      expect(res.status).toBe(500)
      expect((await res.json()).error).toMatch(/failed to record/i)
    })
  })
})
