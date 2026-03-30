import * as React from "react";
type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
    size?: "sm" | "default";
};
declare function NativeSelect({ className, size, ...props }: NativeSelectProps): import("react/jsx-runtime").JSX.Element;
declare function NativeSelectOption({ ...props }: React.ComponentProps<"option">): import("react/jsx-runtime").JSX.Element;
declare function NativeSelectOptGroup({ className, ...props }: React.ComponentProps<"optgroup">): import("react/jsx-runtime").JSX.Element;
export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
