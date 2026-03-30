"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cn } from '../../lib/utils';
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react";
const Select = SelectPrimitive.Root;
function SelectGroup({ className, ...props }) {
    return (_jsx(SelectPrimitive.Group, { "data-slot": "select-group", className: cn("scroll-my-1 p-1", className), ...props }));
}
function SelectValue({ className, ...props }) {
    return (_jsx(SelectPrimitive.Value, { "data-slot": "select-value", className: cn("flex flex-1 text-left", className), ...props }));
}
function SelectTrigger({ className, size = "default", children, ...props }) {
    return (_jsxs(SelectPrimitive.Trigger, { "data-slot": "select-trigger", "data-size": size, className: cn("flex w-fit items-center justify-between gap-2 rounded-md border border-input bg-transparent py-2 pr-2 pl-3 text-sm whitespace-nowrap shadow-xs transition-[color,background-color,border-color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground", className), ...props, children: [children, _jsx(SelectPrimitive.Icon, { render: _jsx(ChevronDownIcon, { className: "pointer-events-none size-4 text-muted-foreground" }) })] }));
}
function SelectContent({ className, children, side = "bottom", sideOffset = 4, align = "center", alignOffset = 0, alignItemWithTrigger = true, ...props }) {
    return (_jsx(SelectPrimitive.Portal, { children: _jsx(SelectPrimitive.Positioner, { side: side, sideOffset: sideOffset, align: align, alignOffset: alignOffset, alignItemWithTrigger: alignItemWithTrigger, className: "isolate z-50", children: _jsxs(SelectPrimitive.Popup, { "data-slot": "select-content", "data-align-trigger": alignItemWithTrigger, className: cn("relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-[8rem] origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg border bg-popover text-popover-foreground shadow-md duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className), ...props, children: [_jsx(SelectScrollUpButton, {}), _jsx(SelectPrimitive.List, { children: children }), _jsx(SelectScrollDownButton, {})] }) }) }));
}
function SelectLabel({ className, ...props }) {
    return (_jsx(SelectPrimitive.GroupLabel, { "data-slot": "select-label", className: cn("px-2 py-1.5 text-sm font-medium text-muted-foreground", className), ...props }));
}
function SelectItem({ className, children, ...props }) {
    return (_jsxs(SelectPrimitive.Item, { "data-slot": "select-item", className: cn("relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2", className), ...props, children: [_jsx(SelectPrimitive.ItemText, { className: "flex flex-1 shrink-0 gap-2 whitespace-nowrap", children: children }), _jsx(SelectPrimitive.ItemIndicator, { render: _jsx("span", { className: "pointer-events-none absolute right-2 flex size-3.5 items-center justify-center" }), children: _jsx(CheckIcon, { className: "pointer-events-none size-4" }) })] }));
}
function SelectSeparator({ className, ...props }) {
    return (_jsx(SelectPrimitive.Separator, { "data-slot": "select-separator", className: cn("pointer-events-none -mx-1 my-1 h-px bg-border", className), ...props }));
}
function SelectScrollUpButton({ className, ...props }) {
    return (_jsx(SelectPrimitive.ScrollUpArrow, { "data-slot": "select-scroll-up-button", className: cn("top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4", className), ...props, children: _jsx(ChevronUpIcon, {}) }));
}
function SelectScrollDownButton({ className, ...props }) {
    return (_jsx(SelectPrimitive.ScrollDownArrow, { "data-slot": "select-scroll-down-button", className: cn("bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4", className), ...props, children: _jsx(ChevronDownIcon, {}) }));
}
export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue, };
//# sourceMappingURL=select.js.map