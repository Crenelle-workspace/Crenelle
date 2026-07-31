/**
 * __tests__/migrations/rls-public-policies.test.ts
 *
 * Static regression guard for the two platform-wide RLS holes closed by
 * migration 039. These are correctness checks over the migration SQL text —
 * CI has no live Postgres, so we assert on the source of truth (the ordered
 * migration files) rather than a running database.
 *
 * What we protect:
 *   1. migration 039 explicitly drops both dangerous policies.
 *   2. No migration AFTER 039 re-creates:
 *        - an anon/`USING (true)` / `USING (is_active ...)` SELECT on scanner_links
 *        - a `WITH CHECK (true)` INSERT on entry_logs
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATIONS_DIR = join(__dirname, '..', '..', 'supabase', 'migrations')

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

/** Collapse whitespace so multi-line policy bodies match single-line patterns. */
function normalize(sql: string): string {
  return sql.replace(/\s+/g, ' ').toLowerCase()
}

describe('migration 039 — drop dangerous public RLS policies', () => {
  const file = migrationFiles().find((f) => f.startsWith('039_'))

  it('039 migration file exists', () => {
    expect(file).toBeDefined()
  })

  it('drops the public scanner_links SELECT policy', () => {
    const sql = normalize(read(file!))
    expect(sql).toContain(
      'drop policy if exists "public can read active scanner links" on public.scanner_links'
    )
  })

  it('drops the public entry_logs INSERT policy', () => {
    const sql = normalize(read(file!))
    expect(sql).toContain(
      'drop policy if exists "public can insert entry logs" on public.entry_logs'
    )
  })
})

describe('RLS regression guard — no later migration re-opens the holes', () => {
  const laterFiles = migrationFiles().filter((f) => migrationNumber(f) > 39)

  it('no migration after 039 re-creates a public-readable scanner_links SELECT policy', () => {
    for (const f of laterFiles) {
      const sql = normalize(read(f))
      // Any CREATE POLICY ... ON public.scanner_links ... FOR SELECT ... USING (true|is_active...)
      const reopens =
        /create policy [^;]*on public\.scanner_links[^;]*for select[^;]*using \((?:true|is_active)/.test(
          sql
        )
      expect(reopens, `${f} re-opens public scanner_links SELECT`).toBe(false)
    }
  })

  it('no migration after 039 re-creates a WITH CHECK (true) INSERT on entry_logs', () => {
    for (const f of laterFiles) {
      const sql = normalize(read(f))
      const reopens =
        /create policy [^;]*on public\.entry_logs[^;]*for insert[^;]*with check \(true\)/.test(
          sql
        )
      expect(reopens, `${f} re-opens anon entry_logs INSERT`).toBe(false)
    }
  })
})
