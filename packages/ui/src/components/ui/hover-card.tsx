import * as React from "react"
import { HoverCard as HoverCardPrimitive } from "radix-ui"

import { cn } from '../../lib/utils'

function HoverCard({
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />
}

const HoverCardTrigger = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Trigger>
>(function HoverCardTrigger(props, ref) {
  return (
    <HoverCardPrimitive.Trigger ref={ref} data-slot="hover-card-trigger" {...props} />
  )
})

HoverCardTrigger.displayName = 'HoverCardTrigger'

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(function HoverCardContent({ className, align = "center", sideOffset = 4, ...props }, ref) {
  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        ref={ref}
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  )
})

HoverCardContent.displayName = 'HoverCardContent'

export { HoverCard, HoverCardTrigger, HoverCardContent }
