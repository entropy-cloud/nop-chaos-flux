import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react";
declare const Combobox: typeof ComboboxPrimitive.Root;
declare function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props): import("react/jsx-runtime").JSX.Element;
declare function ComboboxTrigger({ className, children, ...props }: ComboboxPrimitive.Trigger.Props): import("react/jsx-runtime").JSX.Element;
declare function ComboboxInput({ className, children, disabled, showTrigger, showClear, ...props }: ComboboxPrimitive.Input.Props & {
    showTrigger?: boolean;
    showClear?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function ComboboxContent({ className, side, sideOffset, align, alignOffset, anchor, ...props }: ComboboxPrimitive.Popup.Props & Pick<ComboboxPrimitive.Positioner.Props, "side" | "align" | "sideOffset" | "alignOffset" | "anchor">): import("react/jsx-runtime").JSX.Element;
declare function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props): import("react/jsx-runtime").JSX.Element;
declare function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props): import("react/jsx-runtime").JSX.Element;
declare function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props): import("react/jsx-runtime").JSX.Element;
declare function ComboboxLabel({ className, ...props }: ComboboxPrimitive.GroupLabel.Props): import("react/jsx-runtime").JSX.Element;
declare function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props): import("react/jsx-runtime").JSX.Element;
declare function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props): import("react/jsx-runtime").JSX.Element;
declare function ComboboxSeparator({ className, ...props }: ComboboxPrimitive.Separator.Props): import("react/jsx-runtime").JSX.Element;
declare function ComboboxChips({ className, ...props }: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> & ComboboxPrimitive.Chips.Props): import("react/jsx-runtime").JSX.Element;
declare function ComboboxChip({ className, children, showRemove, ...props }: ComboboxPrimitive.Chip.Props & {
    showRemove?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function ComboboxChipsInput({ className, ...props }: ComboboxPrimitive.Input.Props): import("react/jsx-runtime").JSX.Element;
declare function useComboboxAnchor(): React.RefObject<HTMLDivElement | null>;
export { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxGroup, ComboboxLabel, ComboboxCollection, ComboboxEmpty, ComboboxSeparator, ComboboxChips, ComboboxChip, ComboboxChipsInput, ComboboxTrigger, ComboboxValue, useComboboxAnchor, };
