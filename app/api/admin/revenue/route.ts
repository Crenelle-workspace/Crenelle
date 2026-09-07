import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { fetchRevenueStats } from '@/lib/supabase/revenue-stats'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // ── Auth Guard ──────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Query Params ─────────────────────────────────────────────
  const searchParams = request.nextUrl.searchParams
  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined
  const currency = searchParams.get('currency') || 'NGN'

  // ── Fetch Stats ──────────────────────────────────────────────
  try {
    const stats = await fetchRevenueStats(from, to, currency)
    return NextResponse.json(stats)
  } catch (err) {
    console.error('[api/admin/revenue] Error fetching revenue stats:', err)
    return NextResponse.json({ error: 'Failed to compute revenue statistics' }, { status: 500 })
  }
}
