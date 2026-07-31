import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground/50 bg-stone-900/30 dark:bg-stone-900/50 border-border/40 text-foreground flex field-sizing-content min-h-20 w-full rounded-xl border px-3.5 py-2.5 text-sm shadow-xs transition-all outline-none focus-visible:border-copper focus-visible:ring-2 focus-visible:ring-copper/20 disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:ring-red-500/20 aria-invalid:border-red-500",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
