import * as React from "react";
import { type VariantProps } from "class-variance-authority";
declare function Tabs({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare const tabsListVariants: (props?: ({
    variant?: "default" | "line" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare const TabsList: React.ForwardRefExoticComponent<Omit<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & VariantProps<(props?: ({
    variant?: "default" | "line" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string> & React.RefAttributes<HTMLDivElement>>;
declare const TabsTrigger: React.ForwardRefExoticComponent<Omit<React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>, "ref"> & React.RefAttributes<HTMLButtonElement>>;
declare const TabsContent: React.ForwardRefExoticComponent<Omit<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
