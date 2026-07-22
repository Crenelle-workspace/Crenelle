'use client'

import { ConfirmDialog } from '@/components/confirm-dialog'

interface DeleteEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventName: string | undefined
  isPending: boolean
  onConfirm: () => void
}

export function DeleteEventDialog({
  open,
  onOpenChange,
  eventName,
  isPending,
  onConfirm,
}: DeleteEventDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Event"
      description="This action is permanent and cannot be undone."
      subject={eventName}
      subjectLabel="Target Event"
      body="Deleting this event will permanently remove all associated data including invitations and entry logs. This cannot be undone."
      confirmLabel="Delete Event"
      isPending={isPending}
      onConfirm={onConfirm}
    />
  )
}
