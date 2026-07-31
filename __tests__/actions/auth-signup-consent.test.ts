/**
 * __tests__/actions/auth-signup-consent.test.ts
 *
 * The signup form disables its buttons until the Terms checkbox is ticked, but a
 * disabled button is a UX affordance, not enforcement — a server action is an
 * HTTP endpoint and can be POSTed to directly. So signup() re-checks consent
 * server-side, and that check is what these tests protect.
 *
 * All I/O is mocked. next/navigation's redirect is stubbed in vitest.setup.ts to
 * throw NEXT_REDIRECT, which is why the success case asserts on a rejection.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signup } from '@/app/actions/auth'

const mockCreateClient = createClient as ReturnType<typeof vi.fn>
const mockCreateAdminClient = createAdminClient as ReturnType<typeof vi.fn>

const VALID = {
  email: 'organiser@example.com',
  password: 'Passw0rd!',
  confirm: 'Passw0rd!',
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return fd
}

function mockAuth(error: { message: string } | null = null) {
  const signUp = vi.fn().mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error,
  })
  mockCreateClient.mockResolvedValue({ auth: { signUp } })
  return signUp
}

describe('signup — consent enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
  })

  it('rejects a signup with no terms field and never creates the account', async () => {
    const signUp = mockAuth()

    const result = await signup(makeFormData(VALID))

    expect(result).toEqual({
      error: 'Please accept the Terms & Conditions and Privacy Policy to create an account.',
    })
    expect(signUp).not.toHaveBeenCalled() // ← the account must not exist
  })

  it('rejects a forged terms value', async () => {
    const signUp = mockAuth()

    // A hand-crafted POST could send anything; only the checkbox's "on" counts.
    const result = await signup(makeFormData({ ...VALID, terms: 'false' }))

    expect(result).toHaveProperty('error')
    expect(signUp).not.toHaveBeenCalled()
  })

  it('proceeds when terms are accepted', async () => {
    const signUp = mockAuth()

    // redirect() throws NEXT_REDIRECT on success (stubbed in vitest.setup.ts)
    await expect(signup(makeFormData({ ...VALID, terms: 'on' }))).rejects.toThrow(
      'NEXT_REDIRECT:/events'
    )

    expect(signUp).toHaveBeenCalledWith({
      email: VALID.email,
      password: VALID.password,
    })
  })

  it('surfaces a neutral error when signup itself fails', async () => {
    mockAuth({ message: 'User already registered' })

    const result = await signup(makeFormData({ ...VALID, terms: 'on' }))

    // Deliberately generic so it cannot be used to enumerate registered emails.
    expect(result?.error).toMatch(/couldn't complete your sign up/i)
  })
})
