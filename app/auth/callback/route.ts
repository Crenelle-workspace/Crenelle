import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recordTermsAcceptance } from '@/lib/consent'
import * as Sentry from '@sentry/nextjs'

/**
 * Validates a redirect path to prevent open-redirect attacks.
 * Accepts only relative paths that start with '/' but NOT '//'
 * (a double-slash would be treated as a protocol-relative URL by browsers,
 * enabling off-site redirects like //evil.com).
 */
function safeRedirectPath(raw: string | null, fallback: string): string {
  if (!raw) return fallback
  // Must start with exactly one '/' and not be a protocol-relative URL
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  return fallback
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // `terms_accepted=true` is appended by the Google OAuth path in signup page.
  // For email+password signups the confirmation link does NOT carry this param —
  // terms consent was captured at form submission and is recorded here instead.
  const termsAccepted = searchParams.get('terms_accepted') === 'true'
  const next = safeRedirectPath(searchParams.get('next'), '/events')

  if (code) {
    const supabase = await createClient()
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Record terms acceptance for:
      //   - Email+password signups: the confirmation link brings them here after
      //     clicking. At this point auth.users row is confirmed and stable.
      //   - Google OAuth signups: terms_accepted=true is appended by the signup page.
      // For password-reset and settings flows (next=/settings/*) the user already
      // accepted terms at signup, so we skip to avoid creating a duplicate record
      // (the unique constraint handles it, but skipping is cleaner).
      const userId = sessionData?.user?.id
      const isPasswordReset = next.startsWith('/settings')
      if (userId && (termsAccepted || !isPasswordReset)) {
        const consentResult = await recordTermsAcceptance(userId)
        if (!consentResult.success) {
          Sentry.captureMessage('[auth/callback] Failed to record terms acceptance', {
            level: 'error',
            extra: { userId, termsAccepted, next, error: consentResult.error },
          })
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page on failure.
  // If they were mid-flow on a settings page, send them back there with an error param.
  if (next.startsWith('/settings')) {
    const divider = next.includes('?') ? '&' : '?'
    return NextResponse.redirect(`${origin}${next}${divider}error=OAuth+exchange+failed`)
  }

  return NextResponse.redirect(`${origin}/login?error=OAuth+exchange+failed`)
}

