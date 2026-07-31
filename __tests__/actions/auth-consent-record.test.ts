/**
 * __tests__/actions/auth-consent-record.test.ts
 *
 * Unit tests for user consent evidence recording (recordTermsAcceptance).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Map([
    ['x-forwarded-for', '192.168.1.1, 10.0.0.1'],
    ['user-agent', 'TestBrowser/1.0'],
  ])),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { recordTermsAcceptance } from '@/lib/consent'

const mockCreateAdminClient = createAdminClient as ReturnType<typeof vi.fn>

describe('recordTermsAcceptance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('records consent evidence with extracted IP and User-Agent', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock })
    const rpcMock = vi.fn()

    mockCreateAdminClient.mockReturnValue({
      from: fromMock,
      rpc: rpcMock,
    })

    const res = await recordTermsAcceptance('user-100')

    expect(res).toEqual({ success: true })
    expect(fromMock).toHaveBeenCalledWith('terms_acceptances')
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-100',
      document: 'terms_and_privacy',
      version: '1.0',
      ip_address: '192.168.1.1',
      user_agent: 'TestBrowser/1.0',
    })
  })

  it('handles unique constraint duplicate errors idempotently as success', async () => {
    const insertMock = vi.fn().mockResolvedValue({
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    })
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock })
    const rpcMock = vi.fn()

    mockCreateAdminClient.mockReturnValue({
      from: fromMock,
      rpc: rpcMock,
    })

    const res = await recordTermsAcceptance('user-100')

    expect(res).toEqual({ success: true })
  })

  it('returns failure when database insert fails with non-duplicate error', async () => {
    const insertMock = vi.fn().mockResolvedValue({
      error: { code: '50000', message: 'Connection error' },
    })
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock })
    const rpcMock = vi.fn()

    mockCreateAdminClient.mockReturnValue({
      from: fromMock,
      rpc: rpcMock,
    })

    const res = await recordTermsAcceptance('user-100')

    expect(res).toEqual({ success: false, error: 'Connection error' })
  })
})
