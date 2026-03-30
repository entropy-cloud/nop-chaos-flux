import * as React from "react";
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
declare function Sheet({ ...props }: SheetPrimitive.Root.Props): import("react/jsx-runtime").JSX.Element;
declare function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props): import("react/jsx-runtime").JSX.Element;
declare function SheetClose({ ...props }: SheetPrimitive.Close.Props): import("react/jsx-runtime").JSX.Element;
declare function SheetContent({ className, children, side, showCloseButton, ...props }: SheetPrimitive.Popup.Props & {
    side?: "top" | "right" | "bottom" | "left";
    showCloseButton?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function SheetHeader({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function SheetFooter({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props): import("react/jsx-runtime").JSX.Element;
declare function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props): import("react/jsx-runtime").JSX.Element;
export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, };
