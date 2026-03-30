import { useRender } from "@base-ui/react/use-render";
import { type VariantProps } from "class-variance-authority";
declare const badgeVariants: (props?: ({
    variant?: "success" | "warning" | "default" | "link" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function Badge({ className, variant, render, ...props }: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>): import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export { Badge, badgeVariants };
