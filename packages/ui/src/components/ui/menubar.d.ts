import * as React from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Menubar as MenubarPrimitive } from "@base-ui/react/menubar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from './dropdown-menu';
declare function Menubar({ className, ...props }: MenubarPrimitive.Props): import("react/jsx-runtime").JSX.Element;
declare function MenubarMenu({ ...props }: React.ComponentProps<typeof DropdownMenu>): import("react/jsx-runtime").JSX.Element;
declare function MenubarGroup({ ...props }: React.ComponentProps<typeof DropdownMenuGroup>): import("react/jsx-runtime").JSX.Element;
declare function MenubarPortal({ ...props }: React.ComponentProps<typeof DropdownMenuPortal>): import("react/jsx-runtime").JSX.Element;
declare function MenubarTrigger({ className, ...props }: React.ComponentProps<typeof DropdownMenuTrigger>): import("react/jsx-runtime").JSX.Element;
declare function MenubarContent({ className, align, alignOffset, sideOffset, ...props }: React.ComponentProps<typeof DropdownMenuContent>): import("react/jsx-runtime").JSX.Element;
declare function MenubarItem({ className, inset, variant, ...props }: React.ComponentProps<typeof DropdownMenuItem>): import("react/jsx-runtime").JSX.Element;
declare function MenubarCheckboxItem({ className, children, checked, inset, ...props }: MenuPrimitive.CheckboxItem.Props & {
    inset?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function MenubarRadioGroup({ ...props }: React.ComponentProps<typeof DropdownMenuRadioGroup>): import("react/jsx-runtime").JSX.Element;
declare function MenubarRadioItem({ className, children, inset, ...props }: MenuPrimitive.RadioItem.Props & {
    inset?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function MenubarLabel({ className, inset, ...props }: React.ComponentProps<typeof DropdownMenuLabel> & {
    inset?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function MenubarSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuSeparator>): import("react/jsx-runtime").JSX.Element;
declare function MenubarShortcut({ className, ...props }: React.ComponentProps<typeof DropdownMenuShortcut>): import("react/jsx-runtime").JSX.Element;
declare function MenubarSub({ ...props }: React.ComponentProps<typeof DropdownMenuSub>): import("react/jsx-runtime").JSX.Element;
declare function MenubarSubTrigger({ className, inset, ...props }: React.ComponentProps<typeof DropdownMenuSubTrigger> & {
    inset?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function MenubarSubContent({ className, ...props }: React.ComponentProps<typeof DropdownMenuSubContent>): import("react/jsx-runtime").JSX.Element;
export { Menubar, MenubarPortal, MenubarMenu, MenubarTrigger, MenubarContent, MenubarGroup, MenubarSeparator, MenubarLabel, MenubarItem, MenubarShortcut, MenubarCheckboxItem, MenubarRadioGroup, MenubarRadioItem, MenubarSub, MenubarSubTrigger, MenubarSubContent, };
