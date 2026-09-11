'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Pencil, X, Ticket, AlertCircle, LayoutGrid, List, CreditCard, Loader2, Tag, Calendar, Power } from 'lucide-react'
import { createTier, updateTier, softDeleteTier } from '@/app/actions/ticket-tiers'
import { createCoupon, updateCoupon, deleteCoupon, toggleCouponActive, fetchCouponsForEvent } from '@/app/actions/coupons'
import { createClient } from '@/lib/supabase/client'
import { fieldCls, labelCls, hintCls } from '@/lib/form-styles'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { SectionHeader } from '@/components/section-header'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import type { CouponCode, CouponDiscountType } from '@/lib/types'

interface TicketTierWithAllocations {
  id: string
  name: string
  price: number // stored in kobo
  capacity: number | null
  is_public: boolean
  currency: string
  allocatedCount: number
}

interface RawTier {
  id: string
  name: string
  price: number
  capacity: number | null
  is_public: boolean
  currency?: string
}

export default function TicketsPageClient({ canEdit }: { canEdit: boolean }) {
  const { id: eventId } = useParams<{ id: string }>()
  const [tiers, setTiers] = useState<TicketTierWithAllocations[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [editTier, setEditTier] = useState<TicketTierWithAllocations | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TicketTierWithAllocations | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasSubaccount, setHasSubaccount] = useState(false)

  // Coupon state
  const [coupons, setCoupons] = useState<CouponCode[]>([])
  const [couponsLoading, setCouponsLoading] = useState(true)
  const [addCouponOpen, setAddCouponOpen] = useState(false)
  const [editCoupon, setEditCoupon] = useState<CouponCode | null>(null)
  const [deleteCouponTarget, setDeleteCouponTarget] = useState<CouponCode | null>(null)
  const [isSavingCoupon, setIsSavingCoupon] = useState(false)
  const [isDeletingCoupon, setIsDeletingCoupon] = useState(false)
  const [togglingCouponId, setTogglingCouponId] = useState<string | null>(null)

  // Sub-page tab state: 'tiers' | 'coupons'
  const [activeTab, setActiveTab] = useState<'tiers' | 'coupons'>('tiers')

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#coupons') {
      setActiveTab('coupons')
    }
  }, [])

  const handleTabChange = (tab: 'tiers' | 'coupons') => {
    setActiveTab(tab)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', tab === 'coupons' ? '#coupons' : '#tiers')
    }
  }

  // Display options & filtering state
  const [viewMode, setViewMode] = useState<'grid' | 'cards' | 'list'>('grid')
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'paid' | 'free'>('all')
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'price_asc' | 'price_desc' | 'allocated'>('default')

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient()

      // 1. Fetch all active tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from('ticket_tiers')
        .select('*')
        .eq('event_id', eventId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (tiersError) {
        toast.error(`Failed to load ticket tiers: ${tiersError.message}`)
        return
      }

      // 2. Fetch current allocation sizes from active invitations
      const { data: allocations, error: allocError } = await supabase
        .from('invitations')
        .select('party_size, ticket_tier_id')
        .eq('event_id', eventId)
        .in('status', ['active', 'checked_in', 'pending'])

      if (allocError) {
        toast.error(`Failed to load allocations: ${allocError.message}`)
        return
      }

      // Map allocation counts to tiers
      const rawTiers = (tiersData ?? []) as RawTier[]
      const mappedTiers: TicketTierWithAllocations[] = rawTiers.map((tier) => {
        const allocatedCount = (allocations ?? [])
          .filter((a) => a.ticket_tier_id === tier.id)
          .reduce((sum, current) => sum + (current.party_size ?? 1), 0)

        return {
          id: tier.id,
          name: tier.name,
          price: tier.price,
          capacity: tier.capacity,
          is_public: tier.is_public,
          currency: tier.currency || 'NGN',
          allocatedCount,
        }
      })

      setTiers(mappedTiers)

      // 3. Fetch payment settings to see if subaccount is connected
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: paySettings } = await supabase
          .from('organizer_payment_settings')
          .select('paystack_subaccount_code')
          .eq('organizer_id', user.id)
          .maybeSingle()
        setHasSubaccount(!!paySettings?.paystack_subaccount_code)
      }

      // 4. Fetch coupon codes
      const couponsRes = await fetchCouponsForEvent(eventId)
      if (couponsRes.data) {
        setCoupons(couponsRes.data)
      }
    } finally {
      setLoading(false)
      setCouponsLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    const supabase = createClient()

    loadData()

    // Realtime subscription below drives updates; poll is a slow safety net (was 10s).
    const poll = setInterval(loadData, 60000)

    // Listen to real-time updates on ticket_tiers, invitations, and coupon_codes
    const channel = supabase
      .channel(`tickets-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_tiers', filter: `event_id=eq.${eventId}` },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invitations', filter: `event_id=eq.${eventId}` },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coupon_codes', filter: `event_id=eq.${eventId}` },
        () => loadData()
      )
      .subscribe()

    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [eventId, loadData])

  const handleCreateCoupon = async (data: {
    code: string
    discountType: CouponDiscountType
    discountValue: number
    maxUses: number | null
    validFrom: string | null
    validUntil: string | null
    tierIds: string[]
  }) => {
    setIsSavingCoupon(true)
    try {
      const res = await createCoupon({
        eventId,
        ...data,
      })
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Coupon ${data.code.toUpperCase()} created successfully`)
        setAddCouponOpen(false)
        await loadData()
      }
    } catch {
      toast.error('Failed to create coupon')
    } finally {
      setIsSavingCoupon(false)
    }
  }

  const handleUpdateCoupon = async (data: {
    code: string
    discountType: CouponDiscountType
    discountValue: number
    maxUses: number | null
    validFrom: string | null
    validUntil: string | null
    tierIds: string[]
  }) => {
    if (!editCoupon) return
    setIsSavingCoupon(true)
    try {
      const res = await updateCoupon({
        couponId: editCoupon.id,
        eventId,
        ...data,
      })
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Coupon ${data.code.toUpperCase()} updated`)
        setEditCoupon(null)
        await loadData()
      }
    } catch {
      toast.error('Failed to update coupon')
    } finally {
      setIsSavingCoupon(false)
    }
  }

  const handleToggleCoupon = async (coupon: CouponCode) => {
    setTogglingCouponId(coupon.id)
    const nextState = !coupon.is_active
    setCoupons((prev) =>
      prev.map((c) => (c.id === coupon.id ? { ...c, is_active: nextState } : c))
    )
    try {
      const res = await toggleCouponActive(coupon.id, eventId, nextState)
      if (res.error) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === coupon.id ? { ...c, is_active: !nextState } : c))
        )
        toast.error(res.error)
      } else {
        toast.success(`Coupon ${coupon.code} is now ${nextState ? 'active' : 'inactive'}`)
      }
    } catch {
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: !nextState } : c))
      )
      toast.error('Failed to update coupon status')
    } finally {
      setTogglingCouponId(null)
    }
  }

  const handleDeleteCoupon = async () => {
    if (!deleteCouponTarget) return
    setIsDeletingCoupon(true)
    try {
      const res = await deleteCoupon(deleteCouponTarget.id, eventId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Coupon ${deleteCouponTarget.code} deleted`)
        setDeleteCouponTarget(null)
        await loadData()
      }
    } catch {
      toast.error('Failed to delete coupon')
    } finally {
      setIsDeletingCoupon(false)
    }
  }

  async function handleAdd(formData: FormData) {
    setIsSaving(true)
    try {
      const name = formData.get('name') as string
      const rawPrice = Number(formData.get('price')) || 0
      const nairaPrice = Math.ceil(rawPrice) // Round to nearest whole Naira (e.g. 203.05 -> 204)
      const price = nairaPrice * 100 // Convert whole NGN to kobo (e.g. 204 -> 20400 kobo)
      const hasCap = formData.get('has_capacity') === 'true'
      const capacity = hasCap ? Number(formData.get('capacity')) || null : null
      const isPublic = formData.get('is_public') === 'true'

      const result = await createTier(eventId, name, price, capacity, isPublic)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Ticket tier created successfully')
        setAddOpen(false)
        await loadData()
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdate(formData: FormData) {
    if (!editTier) return
    setIsSaving(true)
    try {
      const name = formData.get('name') as string
      const rawPrice = Number(formData.get('price')) || 0
      const nairaPrice = Math.ceil(rawPrice) // Round to nearest whole Naira (e.g. 203.05 -> 204)
      const price = nairaPrice * 100 // Convert whole NGN to kobo (e.g. 204 -> 20400 kobo)
      const hasCap = formData.get('has_capacity') === 'true'
      const capacity = hasCap ? Number(formData.get('capacity')) || null : null
      const isPublic = formData.get('is_public') === 'true'

      const result = await updateTier(editTier.id, eventId, name, price, capacity, isPublic)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Ticket tier updated successfully')
        setEditTier(null)
        await loadData()
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const result = await softDeleteTier(deleteTarget.id, eventId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Ticket tier deleted')
        setDeleteTarget(null)
        await loadData()
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      {/* Sub-page Navigation Tabs */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="inline-flex p-1.5 gap-1.5 rounded-full border border-border/40 bg-card/40 backdrop-blur-xl shadow-xs">
          <button
            type="button"
            onClick={() => handleTabChange('tiers')}
            className={`flex items-center gap-2 font-sans text-xs font-bold px-4 py-2 rounded-full transition-all duration-200 cursor-pointer ${
              activeTab === 'tiers'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-stone-500/10'
            }`}
          >
            <Ticket className="h-3.5 w-3.5" />
            <span>Ticket Tiers</span>
            <span
              className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === 'tiers'
                  ? 'bg-background/20 text-background'
                  : 'bg-stone-500/15 text-muted-foreground'
              }`}
            >
              {loading ? '...' : tiers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('coupons')}
            className={`flex items-center gap-2 font-sans text-xs font-bold px-4 py-2 rounded-full transition-all duration-200 cursor-pointer ${
              activeTab === 'coupons'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-stone-500/10'
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Coupon Codes</span>
            <span
              className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === 'coupons'
                  ? 'bg-background/20 text-background'
                  : 'bg-stone-500/15 text-muted-foreground'
              }`}
            >
              {couponsLoading ? '...' : coupons.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'tiers' && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 border-b border-border/40 pb-6">
            <SectionHeader
              eyebrow="Ticket Tiers"
              title="Ticket Tiers"
              subtitle={loading ? "Loading admission tiers..." : `${tiers.length} active admission tier${tiers.length !== 1 ? 's' : ''}`}
            />

            {canEdit && (
              <Button
                variant="copper"
                className="gap-2 h-10 px-5 text-xs font-bold shrink-0 rounded-full cursor-pointer"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Tier
              </Button>
            )}
          </div>

      {/* Controls & Display Options Bar */}
      {!loading && tiers.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border/20">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="font-mono text-[9px] uppercase font-bold text-muted-foreground/70 mr-1 shrink-0">Filter:</span>
            {(['all', 'public', 'private', 'paid', 'free'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`font-mono text-[10px] uppercase font-semibold px-2.5 py-1 rounded-full border transition-all shrink-0 cursor-pointer ${
                  filter === f
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-stone-500/10 text-muted-foreground border-border/30 hover:text-foreground hover:bg-stone-500/20'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Sort & Display Options */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'default' | 'name' | 'price_asc' | 'price_desc' | 'allocated')}
              className="bg-card border border-border/40 px-2.5 py-1 rounded-lg font-mono text-[10px] uppercase text-foreground focus:outline-none focus:border-copper cursor-pointer h-8"
            >
              <option value="default">Default Sort</option>
              <option value="name">Name A–Z</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="allocated">Most Allocated</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-border/40 bg-card/60 p-0.5 rounded-lg shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                title="2-Column Grid (Mobile Optimized)"
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-foreground text-background shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                title="Detailed Cards"
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-foreground text-background shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="Compact List"
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-foreground text-background shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid / Options */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="border border-border/40 bg-card/20 rounded-2xl p-4 flex flex-col justify-between h-40"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <Skeleton className="h-3 w-12 mb-2 rounded-full" />
                    <Skeleton className="h-6 w-28 rounded-lg" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20 rounded-md" />
                    <Skeleton className="h-3 w-8 rounded-md" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tiers.length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-10 w-10" />}
          title="NO TICKET TIERS YET"
          subtitle="Configure admissions tiers to start offering tickets or public registration options."
          action={
            canEdit ? (
              <Button
                variant="copper"
                onClick={() => setAddOpen(true)}
                className="gap-2 h-10 px-5 text-xs font-bold rounded-full"
              >
                <Plus className="h-3.5 w-3.5" />
                Create First Tier
              </Button>
            ) : null
          }
        />
      ) : (() => {
        const filteredTiers = tiers
          .filter((tier) => {
            if (filter === 'public') return tier.is_public
            if (filter === 'private') return !tier.is_public
            if (filter === 'paid') return tier.price > 0
            if (filter === 'free') return tier.price === 0
            return true
          })
          .sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name)
            if (sortBy === 'price_asc') return a.price - b.price
            if (sortBy === 'price_desc') return b.price - a.price
            if (sortBy === 'allocated') return b.allocatedCount - a.allocatedCount
            return 0
          })

        if (filteredTiers.length === 0) {
          return (
            <div className="py-12 border border-dashed border-border/40 text-center rounded-2xl">
              <p className="font-mono text-xs uppercase text-muted-foreground">No tiers match current filter</p>
            </div>
          )
        }

        {/* 1. 2-COLUMN GRID VIEW (MOBILE OPTIMIZED) */}
        if (viewMode === 'grid') {
          return (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 select-none">
              {filteredTiers.map((tier) => {
                const hasLimit = tier.capacity !== null
                const capValue = tier.capacity ?? 0
                const percentFilled = hasLimit ? Math.min(100, Math.round((tier.allocatedCount / capValue) * 100)) : 0

                return (
                  <div
                    key={tier.id}
                    className="border border-border/40 bg-card/40 backdrop-blur-md rounded-2xl p-3.5 sm:p-6 flex flex-col justify-between hover:border-copper/40 transition-all duration-300 relative group shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5 mb-2 sm:mb-4">
                        <span className="font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider bg-stone-500/10 border border-border/30 text-muted-foreground px-2 sm:px-2.5 py-0.5 rounded-full inline-block">
                          {tier.is_public ? 'PUBLIC' : 'PRIVATE'}
                        </span>
                        
                        {canEdit && (
                          <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditTier(tier)}
                              className="p-1 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded cursor-pointer"
                              title="Edit Tier"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(tier)}
                              className="p-1 text-denied/60 hover:text-denied hover:bg-denied/5 rounded cursor-pointer"
                              title="Delete Tier"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <h3 className="font-display text-base sm:text-2xl uppercase text-foreground leading-tight truncate">
                        {tier.name}
                      </h3>

                      <p className="font-mono text-sm sm:text-xl font-black text-copper mt-1">
                        {tier.price === 0 ? 'FREE' : `₦${Math.ceil(tier.price / 100).toLocaleString('en-NG')}`}
                      </p>

                      <div className="mt-3 sm:mt-6">
                        <div className="flex justify-between font-mono text-[8px] sm:text-[10px] uppercase font-bold text-muted-foreground/75 mb-1 tracking-wider">
                          <span>ALLOCATED</span>
                          <span>{tier.allocatedCount} / {hasLimit ? capValue : '∞'}</span>
                        </div>
                        {hasLimit ? (
                          <div className="w-full h-1 sm:h-1.5 bg-stone-200/50 dark:bg-stone-900 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-copper rounded-full transition-all duration-500"
                              style={{ width: `${percentFilled}%` }}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-1 sm:h-1.5 bg-emerald-500/20 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-full rounded-full" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        }

        {/* 2. COMPACT LIST VIEW */}
        if (viewMode === 'list') {
          return (
            <div className="flex flex-col gap-2.5 select-none">
              {filteredTiers.map((tier) => {
                const hasLimit = tier.capacity !== null
                const capValue = tier.capacity ?? 0
                return (
                  <div
                    key={tier.id}
                    className="border border-border/40 bg-card/40 backdrop-blur-md rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-copper/40 transition-all shadow-xs group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider bg-stone-500/10 border border-border/30 text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                        {tier.is_public ? 'PUBLIC' : 'PRIVATE'}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-display text-sm sm:text-base uppercase text-foreground leading-none truncate">
                          {tier.name}
                        </h3>
                        <p className="font-mono text-[10px] text-muted-foreground mt-1">
                          Allocated: {tier.allocatedCount} / {hasLimit ? capValue : '∞'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <p className="font-mono text-xs sm:text-sm font-bold text-copper">
                        {tier.price === 0 ? 'FREE' : `₦${Math.ceil(tier.price / 100).toLocaleString('en-NG')}`}
                      </p>

                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-foreground/40 hover:text-foreground"
                            onClick={() => setEditTier(tier)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-denied/50 hover:text-denied"
                            onClick={() => setDeleteTarget(tier)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        }

        {/* 3. DETAILED CARDS VIEW */}
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
            {filteredTiers.map((tier) => {
              const hasLimit = tier.capacity !== null
              const capValue = tier.capacity ?? 0
              const percentFilled = hasLimit ? Math.min(100, Math.round((tier.allocatedCount / capValue) * 100)) : 0

              return (
                <div
                  key={tier.id}
                  className="border border-border/40 bg-card/40 backdrop-blur-md rounded-2xl p-6 flex flex-col justify-between hover:border-copper/40 transition-all duration-300 relative group shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider bg-stone-500/10 border border-border/30 text-muted-foreground px-2.5 py-0.5 rounded-full inline-block mb-2">
                          {tier.is_public ? 'PUBLIC' : 'PRIVATE'}
                        </span>
                        <h3 className="font-display text-2xl uppercase text-foreground leading-tight">{tier.name}</h3>
                      </div>

                      <p className="font-mono text-xl font-black text-copper whitespace-nowrap">
                        {tier.price === 0 ? 'FREE' : `₦${Math.ceil(tier.price / 100).toLocaleString('en-NG')}`}
                      </p>
                    </div>

                    {/* Allocation statistics */}
                    <div className="mt-6">
                      <div className="flex justify-between font-mono text-[10px] uppercase font-bold text-muted-foreground/75 mb-1.5 tracking-wider">
                        <span>ALLOCATED TICKETS</span>
                        <span>
                          {tier.allocatedCount} / {hasLimit ? capValue : '∞'}
                        </span>
                      </div>
                      {hasLimit ? (
                        <div className="w-full h-1.5 bg-stone-200/50 dark:bg-stone-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-copper rounded-full transition-all duration-500"
                            style={{ width: `${percentFilled}%` }}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-1.5 bg-emerald-500/20 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 w-full rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Edit/Delete controls */}
                  {canEdit && (
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-foreground/5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-foreground/40 hover:text-foreground hover:bg-foreground/5 border border-foreground/10"
                        onClick={() => setEditTier(tier)}
                        aria-label={`Edit ${tier.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-denied/50 hover:text-denied hover:bg-denied/5 border border-denied/10"
                        onClick={() => setDeleteTarget(tier)}
                        aria-label={`Delete ${tier.name}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}
        </>
      )}

      {activeTab === 'coupons' && (
        <>
          {/* Coupon Codes Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 border-b border-border/40 pb-6">
            <SectionHeader
              eyebrow="Discounts & Promos"
              title="Coupon Codes"
              subtitle={couponsLoading ? "Loading coupon codes..." : `${coupons.length} promotional code${coupons.length !== 1 ? 's' : ''}`}
            />

            {canEdit && (
              <Button
                variant="copper"
                onClick={() => setAddCouponOpen(true)}
                className="gap-2 h-10 px-5 text-xs font-bold rounded-full shadow-sm cursor-pointer shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Coupon
              </Button>
            )}
          </div>

        {couponsLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="border border-border/40 bg-card/20 rounded-2xl p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-28 rounded-md" />
                  <Skeleton className="h-3 w-40 rounded-md" />
                </div>
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <EmptyState
            icon={<Tag className="h-10 w-10" />}
            title="NO COUPON CODES YET"
            subtitle="Create promo codes to offer percentage discounts or fixed deductions on ticket tiers."
            action={
              canEdit ? (
                <Button
                  variant="copper"
                  onClick={() => setAddCouponOpen(true)}
                  className="gap-2 h-10 px-5 text-xs font-bold rounded-full cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create First Coupon
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="border border-border/40 bg-card/30 backdrop-blur-md rounded-2xl overflow-hidden shadow-xs divide-y divide-border/30">
            {coupons.map((coupon) => {
              const isExpired = coupon.valid_until && new Date() > new Date(coupon.valid_until)
              const isScheduled = coupon.valid_from && new Date() < new Date(coupon.valid_from)
              const isCapReached = coupon.max_uses !== null && coupon.times_used >= coupon.max_uses

              const discountLabel = coupon.discount_type === 'percent'
                ? `${coupon.discount_value / 100}% OFF`
                : `₦${Math.ceil(coupon.discount_value / 100).toLocaleString('en-NG')} OFF`

              const restrictedTierNames = coupon.tier_ids && coupon.tier_ids.length > 0
                ? tiers.filter((t) => coupon.tier_ids?.includes(t.id)).map((t) => t.name)
                : []

              return (
                <div
                  key={coupon.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-card/60 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className="p-2.5 rounded-xl bg-copper/10 border border-copper/20 text-copper shrink-0">
                      <Tag className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-bold tracking-wider px-2.5 py-0.5 rounded-md bg-stone-500/10 border border-border/40 text-foreground">
                          {coupon.code}
                        </span>

                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {discountLabel}
                        </span>

                        {!coupon.is_active ? (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-stone-500/10 text-muted-foreground border border-border/30">
                            Inactive
                          </span>
                        ) : isExpired ? (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-bold">
                            Expired
                          </span>
                        ) : isCapReached ? (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                            Cap Reached
                          </span>
                        ) : isScheduled ? (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            Scheduled
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-sans">
                        <span>
                          {restrictedTierNames.length > 0
                            ? `Tiers: ${restrictedTierNames.join(', ')}`
                            : 'Applies to all ticket tiers'}
                        </span>
                        <span>•</span>
                        <span>
                          Redemptions: <strong className="text-foreground">{coupon.times_used}</strong> / {coupon.max_uses ?? '∞'}
                        </span>
                        {coupon.valid_until && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Expires {new Date(coupon.valid_until).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleCoupon(coupon)}
                        disabled={togglingCouponId === coupon.id}
                        className="h-8 px-3 text-xs gap-1.5 font-mono cursor-pointer"
                        title={coupon.is_active ? 'Deactivate coupon' : 'Activate coupon'}
                      >
                        <Power className={`h-3.5 w-3.5 ${coupon.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                        <span className="hidden md:inline">{coupon.is_active ? 'Disable' : 'Enable'}</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => setEditCoupon(coupon)}
                        aria-label={`Edit ${coupon.code}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-denied/60 hover:text-denied hover:bg-denied/5 cursor-pointer"
                        onClick={() => setDeleteCouponTarget(coupon)}
                        aria-label={`Delete ${coupon.code}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        </>
      )}

      {/* ── Dialogs & Modals ────────────────────────────────────────── */}
      {/* Add Ticket Tier Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-background border-2 border-foreground/20 max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl uppercase text-foreground">Add Ticket Tier</DialogTitle>
          </DialogHeader>
          <TierForm onSubmit={handleAdd} loading={isSaving} prefix="add" hasSubaccount={hasSubaccount} />
        </DialogContent>
      </Dialog>

      {/* Edit Ticket Tier Modal */}
      <Dialog open={!!editTier} onOpenChange={(o) => !o && setEditTier(null)}>
        <DialogContent className="bg-background border-2 border-foreground/20 max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl uppercase text-foreground">Edit Ticket Tier</DialogTitle>
          </DialogHeader>
          {editTier && (
            <TierForm
              onSubmit={handleUpdate}
              loading={isSaving}
              prefix="edit"
              hasSubaccount={hasSubaccount}
              defaultValues={{
                name: editTier.name,
                price: editTier.price / 100, // Show in NGN
                capacity: editTier.capacity ?? 0,
                has_capacity: editTier.capacity !== null,
                is_public: editTier.is_public,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Ticket Tier Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="DELETE_TICKET_TIER"
        description="THIS_ACTION_IS_IRREVERSIBLE"
        subject={deleteTarget?.name}
        subjectLabel="TICKET_TIER"
        body="Deleting this tier will hide it from future ticket sales and public registration forms. Existing tickets inside this tier will remain active and valid."
        confirmLabel="DELETE_TICKET_TIER"
        isPending={isDeleting}
        onConfirm={handleDelete}
      />

      {/* Add Coupon Modal */}
      <Dialog open={addCouponOpen} onOpenChange={setAddCouponOpen}>
        <DialogContent className="bg-background border-2 border-foreground/20 max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl uppercase text-foreground">Create Coupon</DialogTitle>
          </DialogHeader>
          <CouponForm
            onSubmit={handleCreateCoupon}
            loading={isSavingCoupon}
            prefix="add-coupon"
            tiers={tiers}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Coupon Modal */}
      <Dialog open={!!editCoupon} onOpenChange={(o) => !o && setEditCoupon(null)}>
        <DialogContent className="bg-background border-2 border-foreground/20 max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl uppercase text-foreground">Edit Coupon</DialogTitle>
          </DialogHeader>
          {editCoupon && (
            <CouponForm
              onSubmit={handleUpdateCoupon}
              loading={isSavingCoupon}
              prefix="edit-coupon"
              tiers={tiers}
              defaultValues={{
                code: editCoupon.code,
                discountType: editCoupon.discount_type,
                discountValue: editCoupon.discount_type === 'percent'
                  ? editCoupon.discount_value / 100
                  : Math.ceil(editCoupon.discount_value / 100),
                maxUses: editCoupon.max_uses,
                validFrom: editCoupon.valid_from,
                validUntil: editCoupon.valid_until,
                tierIds: editCoupon.tier_ids ?? [],
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Coupon Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteCouponTarget}
        onOpenChange={(open) => !open && setDeleteCouponTarget(null)}
        title="DELETE_COUPON_CODE"
        description="THIS_ACTION_IS_IRREVERSIBLE"
        subject={deleteCouponTarget?.code}
        subjectLabel="COUPON_CODE"
        body="Deleting this coupon will prevent any further redemptions at checkout. Existing registrations and payments made with this coupon will not be affected."
        confirmLabel="DELETE_COUPON"
        isPending={isDeletingCoupon}
        onConfirm={handleDeleteCoupon}
      />
    </div>
  )
}

function TierForm({
  onSubmit,
  loading,
  prefix,
  hasSubaccount,
  defaultValues,
}: {
  onSubmit: (f: FormData) => void
  loading: boolean
  prefix: string
  hasSubaccount: boolean
  defaultValues?: {
    name: string
    price: number
    capacity: number
    has_capacity: boolean
    is_public: boolean
  }
}) {
  const [hasCap, setHasCap] = useState(defaultValues?.has_capacity ?? false)
  const [priceValue, setPriceValue] = useState(defaultValues?.price ?? 0)

  return (
    <form action={onSubmit} className="flex flex-col gap-5 mt-2">
      <input type="hidden" name="has_capacity" value={hasCap ? 'true' : 'false'} />

      {priceValue > 0 && !hasSubaccount && (
        <div className="flex items-start gap-2.5 p-3.5 border border-amber-500/20 bg-amber-500/5 text-amber-600 font-mono text-[10px] uppercase tracking-wide leading-relaxed">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <span className="font-bold">Warning:</span> You haven&apos;t connected a bank account. Guests cannot buy paid tickets until a payout account is linked in settings.
            <a href="/settings/payments" target="_blank" rel="noopener noreferrer" className="block text-copper underline mt-1 hover:text-copper/80">Connect bank account →</a>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor={`${prefix}-t-name`} className={labelCls}>Tier Name *</label>
        <input
          id={`${prefix}-t-name`}
          name="name"
          defaultValue={defaultValues?.name}
          placeholder="e.g. VIP Pass, Early Bird"
          required
          className={fieldCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${prefix}-t-price`} className={labelCls}>Price (₦) *</label>
          <input
            id={`${prefix}-t-price`}
            name="price"
            type="number"
            min="0"
            step="1"
            value={priceValue}
            onChange={(e) => setPriceValue(Math.ceil(Number(e.target.value) || 0))}
            required
            className={fieldCls}
            placeholder="0"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`${prefix}-t-public`} className={labelCls}>Visibility *</label>
          <select
            id={`${prefix}-t-public`}
            name="is_public"
            defaultValue={defaultValues?.is_public ? 'true' : 'false'}
            className={fieldCls}
          >
            <option value="true">Public (RSVP Page)</option>
            <option value="false">Private (Invite Only)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 border border-border/40 p-4 bg-card/40 rounded-xl">
        <div className="flex items-center gap-2">
          <input
            id={`${prefix}-t-has-cap`}
            type="checkbox"
            checked={hasCap}
            onChange={(e) => setHasCap(e.target.checked)}
            className="h-4 w-4 accent-copper cursor-pointer"
          />
          <label htmlFor={`${prefix}-t-has-cap`} className="font-sans text-xs font-semibold text-foreground cursor-pointer">
            Limit Ticket Capacity
          </label>
        </div>

        {hasCap && (
          <div className="flex flex-col gap-1.5 mt-1">
            <label htmlFor={`${prefix}-t-capacity`} className={labelCls}>Maximum Tickets *</label>
            <input
              id={`${prefix}-t-capacity`}
              name="capacity"
              type="number"
              min="1"
              defaultValue={defaultValues?.capacity || 100}
              required={hasCap}
              className={fieldCls}
            />
            <span className={hintCls}>Maximum number of allocations allowed for this tier</span>
          </div>
        )}
      </div>

      <Button
        type="submit"
        variant="copper"
        className="w-full h-11 text-xs font-bold mt-2 rounded-full gap-2"
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Ticket Tier'
        )}
      </Button>
    </form>
  )
}

function CouponForm({
  onSubmit,
  loading,
  prefix,
  tiers,
  defaultValues,
}: {
  onSubmit: (data: {
    code: string
    discountType: CouponDiscountType
    discountValue: number
    maxUses: number | null
    validFrom: string | null
    validUntil: string | null
    tierIds: string[]
  }) => void
  loading: boolean
  prefix: string
  tiers: TicketTierWithAllocations[]
  defaultValues?: {
    code: string
    discountType: CouponDiscountType
    discountValue: number
    maxUses?: number | null
    validFrom?: string | null
    validUntil?: string | null
    tierIds?: string[]
  }
}) {
  const [code, setCode] = useState(defaultValues?.code ?? '')
  const [discountType, setDiscountType] = useState<CouponDiscountType>(
    defaultValues?.discountType ?? 'percent'
  )
  const [discountValue, setDiscountValue] = useState<number>(
    defaultValues?.discountValue ?? 20
  )
  const [hasCap, setHasCap] = useState(!!defaultValues?.maxUses)
  const [maxUses, setMaxUses] = useState<number>(defaultValues?.maxUses ?? 50)
  const [hasExpiry, setHasExpiry] = useState(
    !!defaultValues?.validUntil || !!defaultValues?.validFrom
  )
  const [validFrom, setValidFrom] = useState(
    defaultValues?.validFrom ? defaultValues.validFrom.slice(0, 16) : ''
  )
  const [validUntil, setValidUntil] = useState(
    defaultValues?.validUntil ? defaultValues.validUntil.slice(0, 16) : ''
  )
  const [restrictTiers, setRestrictTiers] = useState(
    !!defaultValues?.tierIds && defaultValues.tierIds.length > 0
  )
  const [selectedTierIds, setSelectedTierIds] = useState<string[]>(
    defaultValues?.tierIds ?? []
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // discount_value in DB:
    // - percent: basis points (e.g. 20% -> 2000)
    // - flat: kobo (e.g. ₦500 -> 50000 kobo)
    const dbDiscountValue =
      discountType === 'percent'
        ? Math.round(discountValue * 100)
        : Math.round(discountValue * 100)

    onSubmit({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: dbDiscountValue,
      maxUses: hasCap ? maxUses : null,
      validFrom: hasExpiry && validFrom ? new Date(validFrom).toISOString() : null,
      validUntil: hasExpiry && validUntil ? new Date(validUntil).toISOString() : null,
      tierIds: restrictTiers ? selectedTierIds : [],
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${prefix}-code`} className={labelCls}>
          Coupon Code *
        </label>
        <input
          id={`${prefix}-code`}
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\s+/g, '').toUpperCase())}
          placeholder="e.g. EARLYBIRD20, VIPGUEST"
          required
          className={`${fieldCls} uppercase font-mono tracking-wider`}
        />
        <span className={hintCls}>Attendees will enter this code at checkout (case-insensitive)</span>
      </div>

      {/* Discount Type */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${prefix}-type`} className={labelCls}>
          Discount Type *
        </label>
        <select
          id={`${prefix}-type`}
          value={discountType}
          onChange={(e) => {
            const nextType = e.target.value as CouponDiscountType
            setDiscountType(nextType)
            if (nextType === 'percent' && discountValue > 100) {
              setDiscountValue(20)
            }
          }}
          className={fieldCls}
        >
          <option value="percent">Percentage (%)</option>
          <option value="flat">Fixed Amount (₦)</option>
        </select>
      </div>

      {/* Discount Value */}
      {discountType === 'percent' ? (
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Discount (%) *</label>
          {/* Quick-select presets */}
          <div className="grid grid-cols-5 gap-2">
            {[10, 25, 50, 100].map((preset) => {
              const active = discountValue === preset
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDiscountValue(preset)}
                  className={[
                    'h-10 rounded-xl text-xs font-bold font-mono border transition-all duration-150',
                    active
                      ? 'bg-copper text-white border-copper shadow-sm scale-[1.03]'
                      : 'bg-card/40 text-foreground/70 border-border/40 hover:border-copper/50 hover:text-copper hover:bg-copper/5',
                  ].join(' ')}
                >
                  {preset}%
                </button>
              )
            })}
            {/* Custom slot */}
            <button
              type="button"
              onClick={() => {
                if ([10, 25, 50, 100].includes(discountValue)) {
                  setDiscountValue(0)
                }
              }}
              className={[
                'h-10 rounded-xl text-xs font-bold font-mono border transition-all duration-150',
                ![10, 25, 50, 100].includes(discountValue)
                  ? 'bg-copper text-white border-copper shadow-sm scale-[1.03]'
                  : 'bg-card/40 text-foreground/70 border-border/40 hover:border-copper/50 hover:text-copper hover:bg-copper/5',
              ].join(' ')}
            >
              Custom
            </button>
          </div>
          {/* Show custom input when no preset is active */}
          {![10, 25, 50, 100].includes(discountValue) && (
            <input
              id={`${prefix}-val`}
              type="number"
              min="1"
              max="100"
              step="1"
              value={discountValue || ''}
              onChange={(e) => {
                const v = Math.min(100, Math.max(1, Number(e.target.value) || 0))
                setDiscountValue(v)
              }}
              required
              autoFocus
              className={fieldCls}
              placeholder="Enter % e.g. 15"
            />
          )}
          <span className={hintCls}>Percent off the ticket price</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${prefix}-val`} className={labelCls}>
            Amount (₦) *
          </label>
          <input
            id={`${prefix}-val`}
            type="number"
            min="1"
            step="1"
            value={discountValue}
            onChange={(e) => setDiscountValue(Math.max(1, Number(e.target.value) || 0))}
            required
            className={fieldCls}
            placeholder="e.g. 2000"
          />
          <span className={hintCls}>Flat reduction in whole Naira</span>
        </div>
      )}

      {/* Tier restrictions */}
      <div className="flex flex-col gap-2.5 border border-border/40 p-4 bg-card/40 rounded-xl">
        <div className="flex items-center gap-2">
          <input
            id={`${prefix}-restrict-tiers`}
            type="checkbox"
            checked={restrictTiers}
            onChange={(e) => {
              setRestrictTiers(e.target.checked)
              if (!e.target.checked) setSelectedTierIds([])
            }}
            className="h-4 w-4 accent-copper cursor-pointer"
          />
          <label htmlFor={`${prefix}-restrict-tiers`} className="font-sans text-xs font-semibold text-foreground cursor-pointer">
            Limit to Specific Ticket Tiers
          </label>
        </div>

        {restrictTiers && (
          <div className="mt-1 space-y-2 max-h-36 overflow-y-auto pl-1">
            {tiers.filter((t) => t.price > 0).length === 0 ? (
              <p className="text-[11px] text-muted-foreground font-mono">
                No paid ticket tiers available to restrict to.
              </p>
            ) : (
              tiers
                .filter((t) => t.price > 0)
                .map((tier) => (
                  <label
                    key={tier.id}
                    className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer hover:text-copper transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTierIds.includes(tier.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTierIds((prev) => [...prev, tier.id])
                        } else {
                          setSelectedTierIds((prev) => prev.filter((id) => id !== tier.id))
                        }
                      }}
                      className="h-3.5 w-3.5 accent-copper cursor-pointer"
                    />
                    <span className="font-medium">{tier.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      (₦{Math.ceil(tier.price / 100).toLocaleString('en-NG')})
                    </span>
                  </label>
                ))
            )}
          </div>
        )}
      </div>

      {/* Redemption Limit */}
      <div className="flex flex-col gap-2.5 border border-border/40 p-4 bg-card/40 rounded-xl">
        <div className="flex items-center gap-2">
          <input
            id={`${prefix}-has-cap`}
            type="checkbox"
            checked={hasCap}
            onChange={(e) => setHasCap(e.target.checked)}
            className="h-4 w-4 accent-copper cursor-pointer"
          />
          <label htmlFor={`${prefix}-has-cap`} className="font-sans text-xs font-semibold text-foreground cursor-pointer">
            Limit Total Redemptions
          </label>
        </div>

        {hasCap && (
          <div className="flex flex-col gap-1.5 mt-1">
            <label htmlFor={`${prefix}-max-uses`} className={labelCls}>
              Maximum Redemptions *
            </label>
            <input
              id={`${prefix}-max-uses`}
              type="number"
              min="1"
              value={maxUses}
              onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value) || 1))}
              required={hasCap}
              className={fieldCls}
            />
            <span className={hintCls}>Coupon automatically deactivates after reaching this count</span>
          </div>
        )}
      </div>

      {/* Date Window */}
      <div className="flex flex-col gap-2.5 border border-border/40 p-4 bg-card/40 rounded-xl">
        <div className="flex items-center gap-2">
          <input
            id={`${prefix}-has-expiry`}
            type="checkbox"
            checked={hasExpiry}
            onChange={(e) => setHasExpiry(e.target.checked)}
            className="h-4 w-4 accent-copper cursor-pointer"
          />
          <label htmlFor={`${prefix}-has-expiry`} className="font-sans text-xs font-semibold text-foreground cursor-pointer">
            Set Expiration Date
          </label>
        </div>

        {hasExpiry && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${prefix}-valid-from`} className={labelCls}>
                Valid From (Optional)
              </label>
              <input
                id={`${prefix}-valid-from`}
                type="datetime-local"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className={fieldCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${prefix}-valid-until`} className={labelCls}>
                Expires On *
              </label>
              <input
                id={`${prefix}-valid-until`}
                type="datetime-local"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                required={hasExpiry}
                className={fieldCls}
              />
            </div>
          </div>
        )}
      </div>

      <Button
        type="submit"
        variant="copper"
        className="w-full h-11 text-xs font-bold mt-2 rounded-full gap-2 cursor-pointer"
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Coupon Code'
        )}
      </Button>
    </form>
  )
}

