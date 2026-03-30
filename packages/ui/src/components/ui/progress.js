"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cn } from '../../lib/utils';
function Progress({ className, children, value, ...props }) {
    return (_jsxs(ProgressPrimitive.Root, { value: value, "data-slot": "progress", className: cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className), ...props, children: [children, _jsx(ProgressTrack, { children: _jsx(ProgressIndicator, {}) })] }));
}
function ProgressTrack({ className, ...props }) {
    return (_jsx(ProgressPrimitive.Track, { className: cn("relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-primary/20", className), "data-slot": "progress-track", ...props }));
}
function ProgressIndicator({ className, ...props }) {
    return (_jsx(ProgressPrimitive.Indicator, { "data-slot": "progress-indicator", className: cn("h-full bg-primary transition-all", className), ...props }));
}
function ProgressLabel({ className, ...props }) {
    return (_jsx(ProgressPrimitive.Label, { className: cn("text-sm font-medium", className), "data-slot": "progress-label", ...props }));
}
function ProgressValue({ className, ...props }) {
    return (_jsx(ProgressPrimitive.Value, { className: cn("ml-auto text-sm text-muted-foreground tabular-nums", className), "data-slot": "progress-value", ...props }));
}
export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue, };
//# sourceMappingURL=progress.js.map