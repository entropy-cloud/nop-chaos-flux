"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { XIcon } from "lucide-react"
import { useDialogDrag } from "./use-dialog-drag"

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
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
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
    size?: "sm" | "default" | "lg"
  }
>(function DialogContent({ className, children, showCloseButton = true, offsetRef, baseTransform, size = "default", ...props }, ref) {
  const { draggable, noOverlay, noCenter } = React.useContext(DialogContext)
  const { contentRef, handlePointerDown } = useDialogDrag({ enabled: draggable, offsetRef, baseTransform: noCenter ? '' : baseTransform }, ref)

  return (
    <DialogPortal data-slot="dialog-portal">
      {!noOverlay && <DialogOverlay />}
      <DialogPrimitive.Popup
        ref={contentRef}
        data-slot="dialog-content"
        data-size={size}
        className={cn(
          "fixed z-50 w-full max-w-[calc(100%-2rem)] rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
          "data-[size=sm]:sm:max-w-sm data-[size=default]:sm:max-w-lg data-[size=lg]:sm:max-w-2xl",
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
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
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
        "flex flex-col gap-2",
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
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
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
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
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
