/**
 * __tests__/migrations/process-charge-success-error-handling.test.ts
 *
 * Regression guard for the webhook-retry defect fixed by migration 040.
 *
 * CI has no live Postgres, so these are static correctness checks over the
 * source of truth: the migration SQL text and the webhook route source. They
 * lock in the contract that:
 *
 *   1. Migration 040 CREATE OR REPLACEs process_charge_success.
 *   2. It NO LONGER swallows every error via a blanket `WHEN OTHERS` that
 *      returns a generic 'error' outcome.
 *   3. Known permanent business-rule failures map to a terminal 'business_error'.
 *   4. Unexpected/transient errors are NOT caught (they propagate → rollback →
 *      webhook 500 → Paystack retry).
 *   5. The webhook route acknowledges 'business_error' with HTTP 200 (stops retries).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..')
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations')

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort()
}

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

/** Collapse whitespace + lowercase so multi-line SQL matches single-line patterns. */
function normalize(sql: string): string {
  return sql.replace(/\s+/g, ' ').toLowerCase()
}

describe('migration 040 — process_charge_success error handling', () => {
  const file = migrationFiles().find((f) => f.startsWith('040_'))

  it('040 migration file exists', () => {
    expect(file).toBeDefined()
  })

  const sql = () => normalize(read(join(MIGRATIONS_DIR, file!)))

  it('CREATE OR REPLACEs process_charge_success', () => {
    expect(sql()).toContain('create or replace function public.process_charge_success')
  })

  it('maps known business-rule failures to a terminal business_error outcome', () => {
    const s = sql()
    // Catches the raise_exception class (the P0001 default for RAISE EXCEPTION 'text')
    expect(s).toContain('when raise_exception then')
    expect(s).toContain("'outcome', 'business_error'")
  })

  it('does NOT re-introduce a blanket WHEN OTHERS that swallows into a generic error outcome', () => {
    const s = sql()
    // The old defect: `WHEN OTHERS THEN ... 'outcome', 'error'`. The fixed
    // version must not catch OTHERS at all (unexpected errors must propagate).
    expect(s).not.toContain('when others then')
    expect(s).not.toContain("'outcome', 'error'")
  })

  it('grants execute to service_role only', () => {
    const s = sql()
    expect(s).toContain('revoke all on function public.process_charge_success from public')
    expect(s).toContain('grant execute on function public.process_charge_success to service_role')
  })
})

describe('paystack webhook route — business_error handling', () => {
  const routeSrc = read(join(ROOT, 'app', 'api', 'webhooks', 'paystack', 'route.ts'))

  it('declares business_error in the RPC result outcome union', () => {
    expect(routeSrc).toContain("'business_error'")
  })

  it('acknowledges business_error with HTTP 200 to stop Paystack retries', () => {
    // The case block must exist and return a 200 (not a 500). We assert the
    // case label and that a 200 acknowledgement appears within its body.
    const idx = routeSrc.indexOf("case 'business_error':")
    expect(idx).toBeGreaterThan(-1)
    const block = routeSrc.slice(idx, idx + 900)
    expect(block).toContain('status: 200')
    expect(block).not.toContain('status: 500')
  })
})
