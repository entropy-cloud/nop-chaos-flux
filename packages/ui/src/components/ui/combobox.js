"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { cn } from '../../lib/utils';
import { Button } from './button';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, } from './input-group';
import { ChevronDownIcon, XIcon, CheckIcon } from "lucide-react";
const Combobox = ComboboxPrimitive.Root;
function ComboboxValue({ ...props }) {
    return _jsx(ComboboxPrimitive.Value, { "data-slot": "combobox-value", ...props });
}
function ComboboxTrigger({ className, children, ...props }) {
    return (_jsxs(ComboboxPrimitive.Trigger, { "data-slot": "combobox-trigger", className: cn("[&_svg:not([class*='size-'])]:size-4", className), ...props, children: [children, _jsx(ChevronDownIcon, { className: "pointer-events-none size-4 text-muted-foreground" })] }));
}
function ComboboxClear({ className, ...props }) {
    return (_jsx(ComboboxPrimitive.Clear, { "data-slot": "combobox-clear", render: _jsx(InputGroupButton, { variant: "ghost", size: "icon-xs" }), className: cn(className), ...props, children: _jsx(XIcon, { className: "pointer-events-none" }) }));
}
function ComboboxInput({ className, children, disabled = false, showTrigger = true, showClear = false, ...props }) {
    return (_jsxs(InputGroup, { className: cn("w-auto", className), children: [_jsx(ComboboxPrimitive.Input, { render: _jsx(InputGroupInput, { disabled: disabled }), ...props }), _jsxs(InputGroupAddon, { align: "inline-end", children: [showTrigger && (_jsx(InputGroupButton, { size: "icon-xs", variant: "ghost", render: _jsx(ComboboxTrigger, {}), "data-slot": "input-group-button", className: "group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent", disabled: disabled })), showClear && _jsx(ComboboxClear, { disabled: disabled })] }), children] }));
}
function ComboboxContent({ className, side = "bottom", sideOffset = 6, align = "start", alignOffset = 0, anchor, ...props }) {
    return (_jsx(ComboboxPrimitive.Portal, { children: _jsx(ComboboxPrimitive.Positioner, { side: side, sideOffset: sideOffset, align: align, alignOffset: alignOffset, anchor: anchor, className: "isolate z-50", children: _jsx(ComboboxPrimitive.Popup, { "data-slot": "combobox-content", "data-chips": !!anchor, className: cn("group/combobox-content relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[chips=true]:min-w-(--anchor-width) data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:border-input/30 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:shadow-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className), ...props }) }) }));
}
function ComboboxList({ className, ...props }) {
    return (_jsx(ComboboxPrimitive.List, { "data-slot": "combobox-list", className: cn("no-scrollbar max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0", className), ...props }));
}
function ComboboxItem({ className, children, ...props }) {
    return (_jsxs(ComboboxPrimitive.Item, { "data-slot": "combobox-item", className: cn("relative flex w-full cursor-default items-center gap-2 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className), ...props, children: [children, _jsx(ComboboxPrimitive.ItemIndicator, { render: _jsx("span", { className: "pointer-events-none absolute right-2 flex size-4 items-center justify-center" }), children: _jsx(CheckIcon, { className: "pointer-events-none" }) })] }));
}
function ComboboxGroup({ className, ...props }) {
    return (_jsx(ComboboxPrimitive.Group, { "data-slot": "combobox-group", className: cn(className), ...props }));
}
function ComboboxLabel({ className, ...props }) {
    return (_jsx(ComboboxPrimitive.GroupLabel, { "data-slot": "combobox-label", className: cn("px-2 py-1.5 text-xs text-muted-foreground", className), ...props }));
}
function ComboboxCollection({ ...props }) {
    return (_jsx(ComboboxPrimitive.Collection, { "data-slot": "combobox-collection", ...props }));
}
function ComboboxEmpty({ className, ...props }) {
    return (_jsx(ComboboxPrimitive.Empty, { "data-slot": "combobox-empty", className: cn("hidden w-full justify-center py-2 text-center text-sm text-muted-foreground group-data-empty/combobox-content:flex", className), ...props }));
}
function ComboboxSeparator({ className, ...props }) {
    return (_jsx(ComboboxPrimitive.Separator, { "data-slot": "combobox-separator", className: cn("-mx-1 my-1 h-px bg-border", className), ...props }));
}
function ComboboxChips({ className, ...props }) {
    return (_jsx(ComboboxPrimitive.Chips, { "data-slot": "combobox-chips", className: cn("flex min-h-8 flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent bg-clip-padding px-2.5 py-1 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 has-data-[slot=combobox-chip]:px-1 dark:bg-input/30 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40", className), ...props }));
}
function ComboboxChip({ className, children, showRemove = true, ...props }) {
    return (_jsxs(ComboboxPrimitive.Chip, { "data-slot": "combobox-chip", className: cn("flex h-[calc(--spacing(5.25))] w-fit items-center justify-center gap-1 rounded-sm bg-muted px-1.5 text-xs font-medium whitespace-nowrap text-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0", className), ...props, children: [children, showRemove && (_jsx(ComboboxPrimitive.ChipRemove, { render: _jsx(Button, { variant: "ghost", size: "icon-xs" }), className: "-ml-1 opacity-50 hover:opacity-100", "data-slot": "combobox-chip-remove", children: _jsx(XIcon, { className: "pointer-events-none" }) }))] }));
}
function ComboboxChipsInput({ className, ...props }) {
    return (_jsx(ComboboxPrimitive.Input, { "data-slot": "combobox-chip-input", className: cn("min-w-16 flex-1 outline-none", className), ...props }));
}
function useComboboxAnchor() {
    return React.useRef(null);
}
export { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxGroup, ComboboxLabel, ComboboxCollection, ComboboxEmpty, ComboboxSeparator, ComboboxChips, ComboboxChip, ComboboxChipsInput, ComboboxTrigger, ComboboxValue, useComboboxAnchor, };
//# sourceMappingURL=combobox.js.map