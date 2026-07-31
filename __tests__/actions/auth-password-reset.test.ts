/**
 * __tests__/actions/auth-password-reset.test.ts
 *
 * Regression guard for the host-header poisoning fix in
 * sendPasswordResetEmailAction (app/actions/auth.ts).
 *
 * The password-reset link must be built from the trusted, server-configured
 * NEXT_PUBLIC_APP_URL — NEVER from the request Host header, which an attacker
 * can spoof to redirect the reset link to a domain they control.
 *
 * We can't easily boot the full server-action runtime in CI, so we assert on
 * the source of truth: the action source. The contract is:
 *   1. It reads NEXT_PUBLIC_APP_URL for the origin.
 *   2. It does NOT read the request Host header (no next/headers usage that
 *      derives the origin from `host`).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = readFileSync(
  join(__dirname, '..', '..', 'app', 'actions', 'auth.ts'),
  'utf8'
)

describe('sendPasswordResetEmailAction — host-header poisoning guard', () => {
  it('builds the reset origin from NEXT_PUBLIC_APP_URL', () => {
    expect(SRC).toContain('process.env.NEXT_PUBLIC_APP_URL')
  })

  it('does NOT derive the origin from the request Host header', () => {
    // No Host-header read, and no next/headers import used for this purpose.
    expect(SRC).not.toMatch(/\.get\(\s*["']host["']\s*\)/i)
    expect(SRC).not.toMatch(/x-forwarded-proto/i)
    expect(SRC).not.toContain('from "next/headers"')
  })

  it('still targets the account settings callback', () => {
    expect(SRC).toContain('/auth/callback?next=/settings/account')
  })
})
