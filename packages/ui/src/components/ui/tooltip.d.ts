import * as React from "react";
declare function Tooltip({ children, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare const TooltipTrigger: React.ForwardRefExoticComponent<Omit<React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>, "ref"> & React.RefAttributes<HTMLButtonElement>>;
declare const TooltipContent: React.ForwardRefExoticComponent<Omit<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
export { Tooltip, TooltipTrigger, TooltipContent };
