import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
declare function Dialog({ draggable, noOverlay, noCenter, closeOnOutsideClick, ...props }: DialogPrimitive.Root.Props & {
    draggable?: boolean;
    noOverlay?: boolean;
    noCenter?: boolean;
    closeOnOutsideClick?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props): import("react/jsx-runtime").JSX.Element;
declare function DialogPortal({ ...props }: DialogPrimitive.Portal.Props): import("react/jsx-runtime").JSX.Element;
declare function DialogClose({ ...props }: DialogPrimitive.Close.Props): import("react/jsx-runtime").JSX.Element;
declare function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props): import("react/jsx-runtime").JSX.Element;
declare const DialogContent: React.ForwardRefExoticComponent<Omit<import("@base-ui/react").DialogPopupProps & {
    showCloseButton?: boolean;
    offsetRef?: React.MutableRefObject<{
        x: number;
        y: number;
    }>;
    baseTransform?: string;
}, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare function DialogHeader({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function DialogFooter({ className, showCloseButton, children, ...props }: React.ComponentProps<"div"> & {
    showCloseButton?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props): import("react/jsx-runtime").JSX.Element;
declare function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props): import("react/jsx-runtime").JSX.Element;
export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger, };
