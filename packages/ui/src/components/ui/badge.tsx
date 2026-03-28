import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from '../../lib/utils'

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-[hsl(var(--secondary-surface))] text-secondary-foreground [a&]:hover:bg-[hsl(var(--secondary-surface-hover))]",
        success: "bg-success/15 text-success [a&]:hover:bg-success/25",
        warning: "bg-warning/15 text-warning [a&]:hover:bg-warning/25",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
  }

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}, ref) {
  const classNames = cn(badgeVariants({ variant }), className)

  if (asChild) {
    return React.createElement(Slot.Root as React.ElementType, {
      ref: ref as never,
      'data-slot': 'badge',
      'data-variant': variant,
      className: classNames,
      ...props,
    })
  }

  return React.createElement('span', {
    ref,
    'data-slot': 'badge',
    'data-variant': variant,
    className: classNames,
    ...props,
  })
})

Badge.displayName = 'Badge'

export { Badge, badgeVariants }
