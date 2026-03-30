import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { Button } from './button';
declare function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogOverlay({ className, ...props }: AlertDialogPrimitive.Backdrop.Props): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogContent({ className, size, ...props }: AlertDialogPrimitive.Popup.Props & {
    size?: "default" | "sm";
}): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogMedia({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Description>): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogAction({ className, ...props }: React.ComponentProps<typeof Button>): import("react/jsx-runtime").JSX.Element;
declare function AlertDialogCancel({ className, variant, size, ...props }: AlertDialogPrimitive.Close.Props & Pick<React.ComponentProps<typeof Button>, "variant" | "size">): import("react/jsx-runtime").JSX.Element;
export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogTrigger, };
