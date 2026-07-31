"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TermsBody, TERMS_LAST_UPDATED } from "@/components/legal/terms-body";

/**
 * Terms & Conditions in a modal, for the signup consent step.
 *
 * Renders the same <TermsBody /> as /terms — not a summary — so a user cannot
 * agree to different wording from what is published.
 *
 * `onAccept` is optional: when provided, an "I agree" button appears in the
 * footer which ticks the consent checkbox and closes the dialog, so the user can
 * read and accept without hunting for the checkbox again.
 */
export function TermsModal({
  trigger,
  onAccept,
}: {
  trigger: React.ReactNode;
  onAccept?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 text-left shrink-0">
          <DialogTitle className="font-sans text-xl font-black tracking-tight">
            Terms &amp; Conditions
          </DialogTitle>
          <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
            Last updated {TERMS_LAST_UPDATED}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable document body */}
        <div className="overflow-y-auto px-6 py-5 grow min-h-0">
          <TermsBody />
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/40 shrink-0 flex-row items-center justify-between gap-3 sm:justify-between">
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-muted-foreground hover:text-copper transition-colors"
          >
            Open as a page
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </Link>

          {onAccept ? (
            <Button
              type="button"
              onClick={() => {
                onAccept();
                setOpen(false);
              }}
              className="bg-copper hover:bg-copper-dark text-white font-sans text-xs font-bold rounded-full px-6"
            >
              I agree
            </Button>
          ) : (
            <Button
              type="button"
              variant="glass"
              onClick={() => setOpen(false)}
              className="font-sans text-xs font-bold rounded-full px-6"
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
