/**
 * __tests__/migrations/check-in-rpc.test.ts
 *
 * Static regression guard for the check-in hot path, migration 042.
 *
 * Migration 042 moved scanner validation, invitation resolution, the row lock
 * and every check-in guard out of app/api/scan/route.ts and into the Postgres
 * function process_check_in(). That was a good change for correctness and
 * latency, but it put the most safety-critical logic in the product somewhere
 * vitest cannot execute: CI has no live Postgres, so mocking `rpc` in the
 * route test necessarily mocks away the guards themselves.
 *
 * These checks assert on the migration SQL text — the same approach (and for
 * the same stated reason) as rls-public-policies.test.ts. They cannot prove the
 * function behaves correctly; they exist to make silent REMOVAL of a safety
 * property fail loudly. Real execution coverage needs Postgres in CI.
 *
 * What we protect:
 *   1. The FOR UPDATE row lock on both invitation-resolution branches — this is
 *      what serialises two ushers scanning the same guest at the same moment.
 *   2. SECURITY DEFINER hardening: pinned search_path, revoked from PUBLIC,
 *      executable only by service_role.
 *   3. The already-checked-in guard covers both checked_in_at and status.
 *   4. entry_type is written to entry_logs (the manual-override audit trail).
 *   5. Every outcome the function can return is handled by the route's switch —
 *      the drift that broke this path once already.
 *   6. No later migration redefines the function without the row lock.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATIONS_DIR = join(__dirname, '..', '..', 'supabase', 'migrations')
const ROUTE_FILE = join(__dirname, '..', '..', 'app', 'api', 'scan', 'route.ts')

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort()
}

function migrationNumber(file: string): number {
  return parseInt(file.split('_')[0], 10)
}

function read(file: string): string {
  return readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
}

/** Collapse whitespace so multi-line SQL bodies match single-line patterns. */
function normalize(sql: string): string {
  return sql.replace(/\s+/g, ' ').toLowerCase()
}

const file = migrationFiles().find((f) => f.startsWith('042_'))

describe('migration 042 — process_check_in() exists', () => {
  it('042 migration file exists', () => {
    expect(file).toBeDefined()
  })

  it('defines the process_check_in function', () => {
    expect(normalize(read(file!))).toContain('create or replace function public.process_check_in')
  })
})

describe('migration 042 — concurrency guard', () => {
  it('locks the invitation row on BOTH resolution branches (qr_token and id)', () => {
    const sql = normalize(read(file!))

    // Both lookups must end in FOR UPDATE, otherwise two concurrent scans of
    // the same guest can both pass the already-checked-in guard.
    const byId = /where id = p_invitation_id for update/.test(sql)
    const byQrToken = /where qr_token = p_qr_token for update/.test(sql)

    expect(byId, 'invitation lookup by id is missing FOR UPDATE').toBe(true)
    expect(byQrToken, 'invitation lookup by qr_token is missing FOR UPDATE').toBe(true)
  })

  it('guards already-checked-in on both checked_in_at and status', () => {
    const sql = normalize(read(file!))
    expect(sql).toContain("v_inv.checked_in_at is not null or v_inv.status = 'checked_in'")
  })
})

describe('migration 042 — SECURITY DEFINER hardening', () => {
  it('is SECURITY DEFINER with a pinned search_path', () => {
    const sql = normalize(read(file!))
    expect(sql).toContain('security definer')
    // Without a pinned search_path a SECURITY DEFINER function is hijackable.
    expect(sql).toContain('set search_path = public')
  })

  it('revokes execute from PUBLIC and grants it only to service_role', () => {
    const sql = normalize(read(file!))
    expect(sql).toMatch(/revoke all on function public\.process_check_in[^;]*from public/)
    expect(sql).toMatch(/grant execute on function public\.process_check_in[^;]*to service_role/)
  })

  it('never grants execute to anon or authenticated', () => {
    const sql = normalize(read(file!))
    const leaked = /grant execute on function public\.process_check_in[^;]*to (anon|authenticated)/.test(sql)
    expect(leaked, 'process_check_in must not be callable by anon/authenticated').toBe(false)
  })
})

describe('migration 042 — audit trail', () => {
  it('writes entry_type into entry_logs', () => {
    const sql = normalize(read(file!))
    expect(sql).toContain('insert into public.entry_logs (invitation_id, scanner_link_id, entry_type)')
  })
})

describe('migration 042 — outcome contract matches the route', () => {
  /** Every outcome value the SQL can return. */
  function sqlOutcomes(): string[] {
    const sql = normalize(read(file!))
    const found = new Set<string>()
    for (const m of sql.matchAll(/'outcome',\s*'([a-z_]+)'/g)) {
      found.add(m[1])
    }
    return [...found].sort()
  }

  /** Every outcome the route's switch explicitly handles. */
  function routeCases(): string[] {
    const src = readFileSync(ROUTE_FILE, 'utf8')
    const found = new Set<string>()
    for (const m of src.matchAll(/case '([a-z_]+)':/g)) {
      found.add(m[1])
    }
    return [...found].sort()
  }

  it('the SQL returns at least the outcomes we expect', () => {
    // Sanity check that the extraction works — if this breaks, the assertion
    // below would silently pass on an empty set.
    expect(sqlOutcomes().length).toBeGreaterThan(5)
  })

  it('every outcome the SQL can return is handled by the route', () => {
    const handled = routeCases()
    const unhandled = sqlOutcomes().filter((o) => !handled.includes(o))

    expect(
      unhandled,
      `process_check_in() can return outcome(s) the route does not map: ${unhandled.join(', ')}`
    ).toEqual([])
  })
})

describe('check-in regression guard — no later migration weakens the lock', () => {
  const laterFiles = migrationFiles().filter((f) => migrationNumber(f) > 42)

  it('no migration after 042 redefines process_check_in without FOR UPDATE', () => {
    for (const f of laterFiles) {
      const sql = normalize(read(f))
      if (!sql.includes('function public.process_check_in')) continue

      expect(
        sql.includes('for update'),
        `${f} redefines process_check_in without a FOR UPDATE row lock`
      ).toBe(true)
    }
  })
})
