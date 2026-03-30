import * as React from "react";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
declare function Avatar({ className, size, ...props }: AvatarPrimitive.Root.Props & {
    size?: "default" | "sm" | "lg";
}): import("react/jsx-runtime").JSX.Element;
declare function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props): import("react/jsx-runtime").JSX.Element;
declare function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props): import("react/jsx-runtime").JSX.Element;
declare function AvatarBadge({ className, ...props }: React.ComponentProps<"span">): import("react/jsx-runtime").JSX.Element;
declare function AvatarGroup({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function AvatarGroupCount({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarBadge, };
