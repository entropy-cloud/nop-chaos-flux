"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import * as ResizablePrimitive from "react-resizable-panels";
import { cn } from '../../lib/utils';
function ResizablePanelGroup({ className, ...props }) {
    return (_jsx(ResizablePrimitive.PanelGroup, { className: cn("flex h-full w-full aria-[orientation=vertical]:flex-col", className), ...props }));
}
function ResizablePanel({ ...props }) {
    return _jsx(ResizablePrimitive.Panel, { ...props });
}
function ResizableHandle({ withHandle, className, ...props }) {
    return (_jsx(ResizablePrimitive.PanelResizeHandle, { className: cn("relative flex w-px items-center justify-center bg-border ring-offset-background after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 [&[aria-orientation=horizontal]>div]:rotate-90", className), ...props, children: withHandle && (_jsx("div", { className: "z-10 flex h-6 w-1 shrink-0 rounded-lg bg-border" })) }));
}
export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
//# sourceMappingURL=resizable.js.map