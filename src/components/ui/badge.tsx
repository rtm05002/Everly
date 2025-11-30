import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

type BadgeTone = "neutral" | "success" | "warning" | "danger"

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
}

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/ focus-visible:ring-[3px] aria-invalid:ring-destructive/ dark:aria-invalid:ring-destructive/ aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/ focus-visible:ring-destructive/ dark:focus-visible:ring-destructive/ dark:bg-destructive/",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
    tone?: BadgeTone
  }

function Badge({ className, variant, tone, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : "span"
  const toneClass = tone ? toneClasses[tone] : undefined

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), toneClass, className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

