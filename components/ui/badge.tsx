import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 tracking-wider uppercase transition-all duration-300 overflow-hidden select-none",
  {
    variants: {
      variant: {
        default: "bg-copper/10 border-copper/20 text-copper font-bold",
        primary: "bg-foreground text-background font-bold shadow-xs",
        secondary: "bg-secondary/70 border-border/40 text-secondary-foreground font-semibold",
        destructive: "bg-red-500/10 border-red-500/20 text-red-500 font-bold",
        outline: "border-border/60 text-foreground bg-transparent font-medium",
        copper: "bg-copper/10 border-copper/20 text-copper font-bold",
        emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold",
        amber: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold",
        glass: "bg-stone-500/10 dark:bg-stone-900/40 backdrop-blur-md border-border/40 text-foreground font-medium",
        ghost: "bg-transparent border-transparent text-muted-foreground font-medium",
        link: "text-copper underline-offset-4 hover:underline font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
