import { fetchAdminStats } from '@/lib/supabase/admin-stats'
import { requireAdmin } from '@/lib/admin'
import { AdminStatsGrid } from './admin-stats-grid'

export const metadata = {
  title: 'Admin Dashboard',
  description: 'Internal platform statistics. Restricted access.',
  robots: { index: false, follow: false },
}

// No ISR caching — initial SSR load is always fresh;
// the client component handles live updates from there.
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  // Auth + admin allowlist gate (belt-and-suspenders — layout already checks).
  await requireAdmin()

  // ── Fetch initial stats server-side (fast first paint) ──
  const initialStats = await fetchAdminStats()

  return (
    <div>
      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 pb-8 border-b border-border">
        <div>
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.3em] text-copper mb-3">
            Internal
          </p>
          <h1
            className="font-display font-semibold text-foreground leading-[0.95] tracking-tight"
            style={{ fontSize: 'clamp(32px, 5vw, 52px)' }}
          >
            Platform overview
          </h1>
          <p className="font-sans text-sm text-muted-foreground mt-2">
            Aggregate stats only — no personal guest data
          </p>
        </div>
      </div>

      {/* ── Live stats grid — polls /api/admin/stats every 30s ── */}
      <AdminStatsGrid initialStats={initialStats} />
    </div>
  )
}
