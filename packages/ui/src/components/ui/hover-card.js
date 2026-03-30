import { jsx as _jsx } from "react/jsx-runtime";
import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card";
import { cn } from '../../lib/utils';
function HoverCard({ ...props }) {
    return _jsx(PreviewCardPrimitive.Root, { "data-slot": "hover-card", ...props });
}
function HoverCardTrigger({ ...props }) {
    return (_jsx(PreviewCardPrimitive.Trigger, { "data-slot": "hover-card-trigger", ...props }));
}
function HoverCardContent({ className, side = "bottom", sideOffset = 4, align = "center", alignOffset = 4, ...props }) {
    return (_jsx(PreviewCardPrimitive.Portal, { "data-slot": "hover-card-portal", children: _jsx(PreviewCardPrimitive.Positioner, { align: align, alignOffset: alignOffset, side: side, sideOffset: sideOffset, className: "isolate z-50", children: _jsx(PreviewCardPrimitive.Popup, { "data-slot": "hover-card-content", className: cn("z-50 w-64 origin-(--transform-origin) rounded-lg bg-popover p-4 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className), ...props }) }) }));
}
export { HoverCard, HoverCardTrigger, HoverCardContent };
//# sourceMappingURL=hover-card.js.map