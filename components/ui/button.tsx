import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-sans text-xs font-bold tracking-tight transition-all duration-300 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-copper/50 rounded-full shadow-xs [&_svg]:pointer-events-none [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary: "bg-foreground text-background hover:bg-copper hover:text-white shadow-sm",
        copper: "bg-copper text-white hover:bg-copper-dark shadow-md shadow-copper/20",
        signal: "bg-copper/10 text-copper border border-copper/30 hover:bg-copper hover:text-white",
        outline: "border border-border/60 bg-background/50 hover:bg-muted hover:border-border text-foreground",
        secondary: "bg-stone-200/70 dark:bg-stone-900/60 text-foreground hover:bg-stone-300 dark:hover:bg-stone-800 border border-border/30",
        ghost: "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 shadow-none",
        glass: "bg-stone-500/10 dark:bg-stone-900/40 backdrop-blur-md border border-border/40 text-foreground hover:border-copper/40 hover:text-copper",
        danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white",
      },
      size: {
        default: "h-9 px-5 py-2 text-xs [&_svg]:size-4 gap-2",
        sm: "h-8 px-3.5 py-1 text-[11px] [&_svg]:size-3.5 gap-1.5",
        md: "h-9.5 px-5 py-2 text-xs [&_svg]:size-4 gap-2",
        lg: "h-11 px-7 py-3 text-sm [&_svg]:size-4.5 gap-2.5",
        icon: "size-9 [&_svg]:size-4 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant || "primary"}
      data-size={size || "md"}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

