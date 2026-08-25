'use client'

import { useState, useEffect, useCallback, useTransition, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Copy, Check, ToggleLeft, ToggleRight, Trash2, Link2, Lock, Loader2 } from 'lucide-react'
import { createScannerLink, toggleScannerLink, deleteScannerLink } from '@/app/actions/scanner-links'
import { createClient } from '@/lib/supabase/client'
import { fieldCls, labelCls } from '@/lib/form-styles'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { SectionHeader } from '@/components/section-header'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import type { ScannerLink } from '@/lib/types'

export default function ScannerLinksClient({ canManage }: { canManage: boolean }) {
  const { id: eventId } = useParams<{ id: string }>()
  const [links, setLinks] = useState<ScannerLink[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ScannerLink | null>(null)
  const [isPending, startTransition] = useTransition()
  const [togglingLinkId, setTogglingLinkId] = useState<string | null>(null)
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const isCreating = useRef(false)
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const loadLinks = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('scanner_links')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })
      setLinks(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadLinks()

    // Realtime subscription below drives updates; poll is a slow safety net (was 10s).
    const poll = setInterval(loadLinks, 60000)

    const supabase = createClient()
    const channel = supabase
      .channel(`scanner-links-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scanner_links', filter: `event_id=eq.${eventId}` }, () => loadLinks())
      .subscribe()

    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [eventId, loadLinks])

  const scanUrl = (token: string) =>
    `${window.location.origin}/scan/${token}`

  async function handleCreate(formData: FormData) {
    if (isCreating.current || isPending) return
    isCreating.current = true

    startTransition(async () => {
      try {
        const result = await createScannerLink(eventId, formData)
        if (result?.error) toast.error(result.error)
        else {
          toast.success('Scanner link created')
          setAddOpen(false)
          await loadLinks()
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to create scanner link')
      } finally {
        isCreating.current = false
      }
    })
  }

  async function handleToggle(link: ScannerLink) {
    if (togglingLinkId) return
    setTogglingLinkId(link.id)
    try {
      const result = await toggleScannerLink(link.id, eventId, !link.is_active)
      if (result?.error) {
        toast.error(result.error)
      } else {
        await loadLinks()
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to toggle scanner link')
    } finally {
      setTogglingLinkId(null)
    }
  }

  function copyLink(token: string, linkId: string) {
    navigator.clipboard.writeText(scanUrl(token))
    setCopiedLinkId(linkId)
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    copyTimeoutRef.current = setTimeout(() => setCopiedLinkId(null), 2000)
    toast.success('Link copied to clipboard')
  }

  return (
    <div>
      {/* Section header + New Link button */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 border-b-2 border-foreground/10 pb-6">
        <SectionHeader
          eyebrow="Door Scanner Links"
          title="Scanner Links"
          subtitle={loading ? "Loading scanner links..." : "Share these links with ushers — no login needed"}
        />

        {canManage ? (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="copper" className="gap-2 h-10 px-5 text-xs font-bold shrink-0 rounded-full">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create Scanner Link
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background border border-border max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl font-semibold text-foreground">Create scanner link</DialogTitle>
              </DialogHeader>
              <form action={handleCreate} className="flex flex-col gap-5 mt-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="sl-label" className={labelCls}>Gate / Label</label>
                  <input
                    id="sl-label"
                    name="label"
                    placeholder="e.g. Main Entrance, VIP Gate"
                    defaultValue="Main Entrance"
                    className={fieldCls}
                  />
                  <p className="font-sans text-[10px] text-muted-foreground/60 uppercase tracking-wide">
                    Helps identify which usher is at which gate
                  </p>
                </div>
                <Button
                  type="submit"
                  variant="copper"
                  disabled={isPending}
                  className="w-full h-11 text-xs font-bold uppercase rounded-full gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create link →'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-muted-foreground border border-border/40 rounded-full px-3.5 py-2 h-10 shrink-0">
            <Lock className="h-3 w-3" aria-hidden="true" />
            View-only
          </span>
        )}
      </div>

      {/* Link list */}
      {loading ? (
        <div className="flex flex-col gap-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card/20 border border-border/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
            >
              <div className="flex-1 space-y-2.5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-32 rounded-lg" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-64 rounded-md" />
              </div>
              <div className="flex gap-2 shrink-0">
                <Skeleton className="h-9 w-16 rounded-full" />
                <Skeleton className="h-9 w-24 rounded-full" />
                <Skeleton className="h-9 w-10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : links.length === 0 ? (
        <EmptyState
          icon={<Link2 className="h-10 w-10" />}
          title="No Scanner Links Yet"
          subtitle="Create a scanner link and share it with your door ushers on event day."
          action={
            canManage ? (
              <Button
                variant="copper"
                onClick={() => setAddOpen(true)}
                className="gap-2 h-10 px-5 text-xs font-bold shrink-0 rounded-full"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Scanner Link
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="flex flex-col gap-3 select-none">
          {links.map((link) => (
            <div
              key={link.id}
              className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-copper/40 transition-all duration-300 shadow-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="font-sans text-base font-bold text-foreground">{link.label}</span>
                  <span
                    className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      link.is_active
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-stone-500/10 border-border/30 text-muted-foreground'
                    }`}
                    aria-label={`Status: ${link.is_active ? 'Active' : 'Inactive'}`}
                  >
                    {link.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="font-sans text-xs text-muted-foreground/80 truncate">
                  {scanUrl(link.token)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Copy — always available */}
                <button
                  onClick={() => copyLink(link.token, link.id)}
                  aria-label={`Copy link for ${link.label}`}
                  className="inline-flex items-center gap-1.5 font-sans text-xs font-bold text-foreground border border-border/40 hover:border-copper/40 hover:text-copper px-4 py-2 rounded-full transition-all cursor-pointer"
                >
                  {copiedLinkId === link.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Link
                    </>
                  )}
                </button>

                {/* Toggle + Delete — only for scanner_manager / owner */}
                {canManage && (
                  <>
                    <button
                      onClick={() => handleToggle(link)}
                      disabled={togglingLinkId === link.id}
                      aria-label={`${link.is_active ? 'Deactivate' : 'Activate'} ${link.label}`}
                      className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-muted-foreground border border-border/40 hover:border-foreground/30 hover:text-foreground px-3.5 py-2 rounded-full transition-all cursor-pointer disabled:opacity-50"
                    >
                      {togglingLinkId === link.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-copper" />
                          Updating...
                        </>
                      ) : link.is_active ? (
                        <>
                          <ToggleRight className="h-4 w-4 text-emerald-500" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4" />
                          Activate
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(link)}
                      aria-label={`Delete scanner link ${link.label}`}
                      className="inline-flex items-center justify-center font-sans text-xs font-semibold text-red-500 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 px-3 py-2 rounded-full transition-all cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info panel */}
      <div className="mt-8 border-l-2 border-copper bg-copper/6 p-5 rounded-r-2xl">
        <p className="font-sans text-xs text-foreground/70 leading-relaxed">
          <span className="font-semibold text-copper">How to use:</span>{' '}
          Copy a link and send it to your usher via WhatsApp or SMS.
          They open it on their phone browser — no app download, no login required.
          The link only works for this event.
        </p>
      </div>

      {/* Delete link confirmation */}
      {canManage && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Delete Link"
          description="This action cannot be undone."
          subject={deleteTarget?.label}
          subjectLabel="Scanner Link"
          body="Deleting this link will immediately revoke usher access. Any usher using this link will be blocked from scanning."
          confirmLabel="Delete Link"
          isPending={isDeleting}
          onConfirm={() => {
            if (!deleteTarget) return
            startDeleteTransition(async () => {
              const result = await deleteScannerLink(deleteTarget.id, eventId)
              if (result?.error) toast.error(result.error)
              else { toast.success('Link deleted'); loadLinks(); setDeleteTarget(null) }
            })
          }}
        />
      )}
    </div>
  )
}
