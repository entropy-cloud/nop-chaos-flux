import * as React from "react";
import { useRender } from "@base-ui/react/use-render";
import { type VariantProps } from "class-variance-authority";
import { Separator } from './separator';
declare function ItemGroup({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function ItemSeparator({ className, ...props }: React.ComponentProps<typeof Separator>): import("react/jsx-runtime").JSX.Element;
declare const itemVariants: (props?: ({
    variant?: "default" | "outline" | "muted" | null | undefined;
    size?: "default" | "xs" | "sm" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function Item({ className, variant, size, render, ...props }: useRender.ComponentProps<"div"> & VariantProps<typeof itemVariants>): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
declare const itemMediaVariants: (props?: ({
    variant?: "default" | "image" | "icon" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function ItemMedia({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>): import("react/jsx-runtime").JSX.Element;
declare function ItemContent({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function ItemTitle({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function ItemDescription({ className, ...props }: React.ComponentProps<"p">): import("react/jsx-runtime").JSX.Element;
declare function ItemActions({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function ItemHeader({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function ItemFooter({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
export { Item, ItemMedia, ItemContent, ItemActions, ItemGroup, ItemSeparator, ItemTitle, ItemDescription, ItemHeader, ItemFooter, };
