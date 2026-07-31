'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Dialog heading, e.g. "CONFIRM_DELETE" */
  title?: string
  /** Subheading below the title */
  description?: string
  /** Name of the entity being acted on — shown in a framed box */
  subject?: string
  /** Label above the entity name box, e.g. "TARGET_EVENT" */
  subjectLabel?: string
  /** Warning body text */
  body?: string
  /** Confirm button label */
  confirmLabel?: string
  isPending?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Confirm Action',
  description = 'This action cannot be undone.',
  subject,
  subjectLabel = 'Subject',
  body = 'This action is permanent and cannot be undone.',
  confirmLabel = 'Confirm',
  isPending = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="border border-border/50 rounded-2xl bg-card/95 backdrop-blur-xl max-w-md p-0 gap-0 overflow-hidden shadow-2xl"
      >
        {/* Accent strip */}
        <div className="h-1.5 bg-red-500 w-full" />

        <div className="p-6">
          <DialogHeader className="mb-5 text-left">
            <DialogTitle className="font-sans text-2xl font-bold tracking-tight text-foreground">
              {title}
            </DialogTitle>
            <DialogDescription className="font-sans text-xs text-muted-foreground leading-relaxed mt-1">
              {description}
            </DialogDescription>
          </DialogHeader>

          {subject && (
            <div className="border border-border/40 p-4 mb-5 bg-card/50 rounded-xl">
              <p className="font-sans text-xs font-semibold text-muted-foreground mb-1">
                {subjectLabel}
              </p>
              <p className="font-sans text-lg font-bold text-foreground leading-tight">
                {subject}
              </p>
            </div>
          )}

          <p className="font-sans text-xs text-muted-foreground mb-6 leading-relaxed">
            {body}
          </p>

          <DialogFooter className="flex flex-row gap-3 justify-end">
            <DialogClose asChild>
              <Button variant="outline" size="default" className="flex-1">
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="danger"
              size="default"
              disabled={isPending}
              className="flex-1"
              onClick={onConfirm}
            >
              {isPending ? 'Processing...' : confirmLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
