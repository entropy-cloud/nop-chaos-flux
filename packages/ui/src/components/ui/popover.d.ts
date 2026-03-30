import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
declare function Popover({ ...props }: PopoverPrimitive.Root.Props): import("react/jsx-runtime").JSX.Element;
declare function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props): import("react/jsx-runtime").JSX.Element;
declare function PopoverContent({ className, align, alignOffset, side, sideOffset, ...props }: PopoverPrimitive.Popup.Props & Pick<PopoverPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">): import("react/jsx-runtime").JSX.Element;
declare function PopoverHeader({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props): import("react/jsx-runtime").JSX.Element;
declare function PopoverDescription({ className, ...props }: PopoverPrimitive.Description.Props): import("react/jsx-runtime").JSX.Element;
export { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger, };
