import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import { cn } from '../../lib/utils';
function Tooltip({ children, ...props }) {
    return (_jsx("div", { ...props, children: children }));
}
const TooltipTrigger = React.forwardRef(function TooltipTrigger(props, ref) {
    return _jsx("button", { ref: ref, ...props });
});
TooltipTrigger.displayName = 'TooltipTrigger';
const TooltipContent = React.forwardRef(function TooltipContent({ className, children, ...props }, ref) {
    return (_jsx("div", { ref: ref, className: cn("z-50 w-fit animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95", className), ...props, children: children }));
});
TooltipContent.displayName = 'TooltipContent';
export { Tooltip, TooltipTrigger, TooltipContent };
//# sourceMappingURL=tooltip.js.map