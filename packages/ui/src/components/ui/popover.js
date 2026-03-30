import { jsx as _jsx } from "react/jsx-runtime";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from '../../lib/utils';
function Popover({ ...props }) {
    return _jsx(PopoverPrimitive.Root, { "data-slot": "popover", ...props });
}
function PopoverTrigger({ ...props }) {
    return _jsx(PopoverPrimitive.Trigger, { "data-slot": "popover-trigger", ...props });
}
function PopoverContent({ className, align = "center", alignOffset = 0, side = "bottom", sideOffset = 4, ...props }) {
    return (_jsx(PopoverPrimitive.Portal, { children: _jsx(PopoverPrimitive.Positioner, { align: align, alignOffset: alignOffset, side: side, sideOffset: sideOffset, className: "isolate z-50", children: _jsx(PopoverPrimitive.Popup, { "data-slot": "popover-content", className: cn("z-50 w-72 origin-(--transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className), ...props }) }) }));
}
function PopoverHeader({ className, ...props }) {
    return (_jsx("div", { "data-slot": "popover-header", className: cn("flex flex-col gap-1 text-sm", className), ...props }));
}
function PopoverTitle({ className, ...props }) {
    return (_jsx(PopoverPrimitive.Title, { "data-slot": "popover-title", className: cn("font-medium", className), ...props }));
}
function PopoverDescription({ className, ...props }) {
    return (_jsx(PopoverPrimitive.Description, { "data-slot": "popover-description", className: cn("text-muted-foreground", className), ...props }));
}
export { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger, };
//# sourceMappingURL=popover.js.map