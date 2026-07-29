import 'server-only'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * lib/admin.ts
 *
 * Single source of truth for the admin access gate.
 *
 * Previously the same email-allowlist parsing was copy-pasted into both the
 * admin layout and the admin page. Duplicated auth checks are a security risk
 * in their own right: the two copies can drift, and a future tightening of one
 * (or a new admin route that forgets to copy it) silently leaves a gap. This
 * centralizes the logic so every admin surface calls the same guard.
 *
 * KNOWN LIMITATION (unchanged): access is keyed on the mutable user.email via
 * the ADMIN_EMAILS env allowlist. The documented migration path is an
 * `admin_roles` table keyed on the immutable user.id.
 */

/** Parse ADMIN_EMAILS ("a@x.com,b@y.com") into a lowercased, trimmed list. */
export function adminAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/** True if the given email is on the admin allowlist. */
export function isAdminEmail(email: string | null | undefined): boolean {
  const normalized = (email ?? '').toLowerCase()
  return normalized.length > 0 && adminAllowlist().includes(normalized)
}

/**
 * Server-side admin gate. Redirects unauthenticated users to /login and
 * non-admins to /. Returns the authenticated admin User on success.
 *
 * Uses getUser() (validated against Supabase Auth) — never getSession().
 */
export async function requireAdmin(): Promise<User> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!isAdminEmail(user.email)) redirect('/')

  return user
}
