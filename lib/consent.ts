import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Records evidence of user terms & privacy policy acceptance.
 * Must be awaited to avoid function freezing in serverless execution.
 *
 * Appends a row to `terms_acceptances` using the service-role admin client.
 * Idempotent via (user_id, document, version) unique constraint.
 */
export async function recordTermsAcceptance(
  userId: string,
  document = 'terms_and_privacy',
  version = '1.0'
): Promise<{ success: boolean; error?: string }> {
  try {
    let ipAddress: string | null = null
    let userAgent: string | null = null

    try {
      const h = await headers()
      ipAddress = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
      userAgent = h.get('user-agent') || null
    } catch {
      // In non-request execution environments (e.g. background tasks or direct calls), headers() may throw.
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('terms_acceptances')
      .insert(
        {
          user_id: userId,
          document,
          version,
          ip_address: ipAddress,
          user_agent: userAgent,
        },
        { ignoreDuplicates: true }
      )

    if (error) {
      // If error is Postgres unique constraint violation (code 23505), treat as idempotent success
      if (error.code === '23505') {
        return { success: true }
      }
      console.error('[consent] Failed to record terms acceptance:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[consent] Exception recording terms acceptance:', err)
    return { success: false, error: msg }
  }
}
