import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from '../../lib/utils'
import { Button } from './button'
import { useDialogDrag } from './use-dialog-drag'

interface DialogContextValue {
  draggable: boolean
  noOverlay: boolean
  noCenter: boolean
  closeOnOutsideClick: boolean
}

const DialogContext = React.createContext<DialogContextValue>({ draggable: false, noOverlay: false, noCenter: false, closeOnOutsideClick: true })

function Dialog({
  draggable = true,
  noOverlay = false,
  noCenter = false,
  closeOnOutsideClick = true,
  ...props
}: DialogPrimitive.Root.Props & { draggable?: boolean; noOverlay?: boolean; noCenter?: boolean; closeOnOutsideClick?: boolean }) {
  return (
    <DialogContext.Provider value={{ draggable, noOverlay, noCenter, closeOnOutsideClick }}>
      <DialogPrimitive.Root data-slot="dialog" {...props} />
    </DialogContext.Provider>
  )
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/55 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Popup>,
  DialogPrimitive.Popup.Props & {
    showCloseButton?: boolean
    offsetRef?: React.MutableRefObject<{ x: number; y: number }>
    baseTransform?: string
  }
>(function DialogContent({ className, children, showCloseButton = true, offsetRef, baseTransform, ...props }, ref) {
  const { draggable, noOverlay, noCenter, closeOnOutsideClick } = React.useContext(DialogContext)
  const { contentRef, handlePointerDown } = useDialogDrag({ enabled: draggable, offsetRef, baseTransform: noCenter ? '' : baseTransform }, ref)

  return (
    <DialogPortal data-slot="dialog-portal">
      {!noOverlay && <DialogOverlay />}
      <DialogPrimitive.Popup
        ref={contentRef}
        data-slot="dialog-content"
        className={cn(
          "fixed z-50 w-full max-w-[calc(100%-2rem)] rounded-xl border bg-background p-6 shadow-lg duration-200 outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 sm:max-w-lg",
          noCenter ? "flex flex-col" : "grid gap-4 top-[50%] left-[50%]",
          !draggable && !noCenter && "-translate-x-1/2 -translate-y-1/2 data-open:zoom-in-95 data-closed:zoom-out-95",
          className
        )}
        {...props}
        style={
          draggable
            ? { transform: noCenter ? undefined : (baseTransform ?? 'translate(-50%, -50%)'), ...props.style }
            : props.style
        }
        onPointerDown={draggable ? handlePointerDown : props.onPointerDown}

      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-[background-color,color,opacity,box-shadow] duration-200 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none data-open:bg-accent data-open:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
})

DialogContent.displayName = 'DialogContent'

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  const { draggable } = React.useContext(DialogContext)

  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col gap-2 text-center sm:text-left",
        draggable && "cursor-grab select-none",
        className
      )}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
