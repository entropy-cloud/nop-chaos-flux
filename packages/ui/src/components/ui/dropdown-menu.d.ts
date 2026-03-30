import * as React from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
declare function DropdownMenu({ ...props }: MenuPrimitive.Root.Props): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuContent({ align, alignOffset, side, sideOffset, className, ...props }: MenuPrimitive.Popup.Props & Pick<MenuPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuLabel({ className, inset, ...props }: MenuPrimitive.GroupLabel.Props & {
    inset?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuItem({ className, inset, variant, ...props }: MenuPrimitive.Item.Props & {
    inset?: boolean;
    variant?: "default" | "destructive";
}): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuSubTrigger({ className, inset, children, ...props }: MenuPrimitive.SubmenuTrigger.Props & {
    inset?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuSubContent({ align, alignOffset, side, sideOffset, className, ...props }: React.ComponentProps<typeof DropdownMenuContent>): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuCheckboxItem({ className, children, checked, inset, ...props }: MenuPrimitive.CheckboxItem.Props & {
    inset?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuRadioItem({ className, children, inset, ...props }: MenuPrimitive.RadioItem.Props & {
    inset?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">): import("react/jsx-runtime").JSX.Element;
export { DropdownMenu, DropdownMenuPortal, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, };
