'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Pencil, X, Ticket, AlertCircle } from 'lucide-react'
import { createTier, updateTier, softDeleteTier } from '@/app/actions/ticket-tiers'
import { createClient } from '@/lib/supabase/client'
import { fieldCls, labelCls, hintCls } from '@/lib/form-styles'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { SectionHeader } from '@/components/section-header'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

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
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    const supabase = createClient()

    loadData()

    // Poll every 10 seconds as a fallback
    const poll = setInterval(loadData, 10000)

    // Listen to real-time updates on ticket_tiers and invitations
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
      .subscribe()

    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [eventId, loadData])

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 border-b border-border/40 pb-6">
        <SectionHeader
          eyebrow="TICKET MANAGEMENT"
          title="Ticket Tiers"
          subtitle={loading ? "Loading admission tiers..." : `${tiers.length} active admission tier${tiers.length !== 1 ? 's' : ''}`}
        />

        {canEdit && (
          <Button
            variant="copper"
            className="gap-2 h-10 px-5 text-xs font-bold shrink-0 rounded-full"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Tier
          </Button>
        )}
      </div>

      {/* Main Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="border border-border/40 bg-card/20 rounded-2xl p-6 flex flex-col justify-between h-48"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <Skeleton className="h-4 w-14 mb-2 rounded-full" />
                    <Skeleton className="h-7 w-36 rounded-lg" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-28 rounded-md" />
                    <Skeleton className="h-3 w-10 rounded-md" />
                  </div>
                  <Skeleton className="h-3 w-full rounded-full" />
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
          {tiers.map((tier) => {
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
                  <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity">
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
      )}

      {/* Add Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-background border-2 border-foreground/20 max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl uppercase text-foreground">Add Ticket Tier</DialogTitle>
          </DialogHeader>
          <TierForm onSubmit={handleAdd} loading={isSaving} prefix="add" hasSubaccount={hasSubaccount} />
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
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

      {/* Delete Confirmation Modal */}
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

      <div className="flex flex-col gap-3 border border-foreground/10 p-4 bg-secondary/10">
        <div className="flex items-center gap-2">
          <input
            id={`${prefix}-t-has-cap`}
            type="checkbox"
            checked={hasCap}
            onChange={(e) => setHasCap(e.target.checked)}
            className="h-4 w-4 accent-copper cursor-pointer"
          />
          <label htmlFor={`${prefix}-t-has-cap`} className="font-mono text-[10px] uppercase font-bold tracking-wider text-foreground cursor-pointer">
            Limit Tickets Capacity
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

      <Button type="submit" variant="signal" className="w-full h-12 text-sm mt-2" disabled={loading}>
        {loading ? 'SAVING...' : 'SAVE TICKET TIER'}
      </Button>
    </form>
  )
}
