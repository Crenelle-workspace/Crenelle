import { requireAdmin } from '@/lib/admin'
import { fetchRevenueStats } from '@/lib/supabase/revenue-stats'
import { RevenueStatsGrid } from './revenue-stats-grid'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Revenue & Income Control | Crenelle Admin',
  description: 'Track platform earnings, GMV, settlements, and tax estimations.',
}

export default async function AdminRevenuePage() {
  // Gate: Admin only
  await requireAdmin()

  // Fetch initial SSR stats
  const initialStats = await fetchRevenueStats()

  return <RevenueStatsGrid initialStats={initialStats} />
}
