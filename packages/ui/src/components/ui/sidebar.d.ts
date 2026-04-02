import * as React from "react";
import { useRender } from "@base-ui/react/use-render";
import { type VariantProps } from "class-variance-authority";
import { Button } from './button';
import { Input } from './input';
import { Separator } from './separator';
import { TooltipContent } from './tooltip';
type SidebarContextProps = {
    state: "expanded" | "collapsed";
    open: boolean;
    setOpen: (open: boolean) => void;
    openMobile: boolean;
    setOpenMobile: (open: boolean) => void;
    isMobile: boolean;
    toggleSidebar: () => void;
};
declare function useSidebar(): SidebarContextProps;
declare function SidebarProvider({ defaultOpen, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props }: React.ComponentProps<"div"> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}): import("react/jsx-runtime").JSX.Element;
declare function Sidebar({ side, variant, collapsible, className, children, dir, ...props }: React.ComponentProps<"div"> & {
    side?: "left" | "right";
    variant?: "sidebar" | "floating" | "inset";
    collapsible?: "offcanvas" | "icon" | "none";
}): import("react/jsx-runtime").JSX.Element;
declare function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>): import("react/jsx-runtime").JSX.Element;
declare function SidebarRail({ className, ...props }: React.ComponentProps<"button">): import("react/jsx-runtime").JSX.Element;
declare function SidebarInset({ className, ...props }: React.ComponentProps<"main">): import("react/jsx-runtime").JSX.Element;
declare function SidebarInput({ className, ...props }: React.ComponentProps<typeof Input>): import("react/jsx-runtime").JSX.Element;
declare function SidebarHeader({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function SidebarFooter({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>): import("react/jsx-runtime").JSX.Element;
declare function SidebarContent({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function SidebarGroup({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function SidebarGroupLabel({ className, render, ...props }: useRender.ComponentProps<"div"> & React.ComponentProps<"div">): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
declare function SidebarGroupAction({ className, render, ...props }: useRender.ComponentProps<"button"> & React.ComponentProps<"button">): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
declare function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">): import("react/jsx-runtime").JSX.Element;
declare function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">): import("react/jsx-runtime").JSX.Element;
declare const sidebarMenuButtonVariants: (props?: ({
    variant?: "default" | "outline" | null | undefined;
    size?: "default" | "sm" | "lg" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function SidebarMenuButton({ isActive, variant, size, tooltip, className, ...props }: useRender.ComponentProps<"button"> & React.ComponentProps<"button"> & {
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
} & VariantProps<typeof sidebarMenuButtonVariants>): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
declare function SidebarMenuAction({ className, render, showOnHover, ...props }: useRender.ComponentProps<"button"> & React.ComponentProps<"button"> & {
    showOnHover?: boolean;
}): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
declare function SidebarMenuBadge({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function SidebarMenuSkeleton({ className, showIcon, ...props }: React.ComponentProps<"div"> & {
    showIcon?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">): import("react/jsx-runtime").JSX.Element;
declare function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<"li">): import("react/jsx-runtime").JSX.Element;
declare function SidebarMenuSubButton({ render, size, isActive, className, ...props }: useRender.ComponentProps<"a"> & React.ComponentProps<"a"> & {
    size?: "sm" | "md";
    isActive?: boolean;
}): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput, SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger, useSidebar, };
