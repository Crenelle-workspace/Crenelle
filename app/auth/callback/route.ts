import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recordTermsAcceptance } from '@/lib/consent'

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
  const termsAccepted = searchParams.get('terms_accepted') === 'true'
  const next = safeRedirectPath(searchParams.get('next'), '/events')

  if (code) {
    const supabase = await createClient()
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (termsAccepted) {
        const { data: { user } } = await supabase.auth.getUser()
        const userId = sessionData?.user?.id || user?.id
        if (userId) {
          await recordTermsAcceptance(userId)
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

