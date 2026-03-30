import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { type VariantProps } from "class-variance-authority";
import { toggleVariants } from './toggle';
declare function ToggleGroup({ className, variant, size, spacing, orientation, children, ...props }: ToggleGroupPrimitive.Props & VariantProps<typeof toggleVariants> & {
    spacing?: number;
    orientation?: "horizontal" | "vertical";
}): import("react/jsx-runtime").JSX.Element;
declare function ToggleGroupItem({ className, children, variant, size, ...props }: TogglePrimitive.Props & VariantProps<typeof toggleVariants>): import("react/jsx-runtime").JSX.Element;
export { ToggleGroup, ToggleGroupItem };
