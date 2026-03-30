"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from '../../lib/utils';
function Slider({ className, defaultValue, value, min = 0, max = 100, ...props }) {
    const _values = React.useMemo(() => Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
            ? defaultValue
            : [min, max], [value, defaultValue, min, max]);
    return (_jsx(SliderPrimitive.Root, { className: cn("data-horizontal:w-full data-vertical:h-full", className), "data-slot": "slider", defaultValue: defaultValue, value: value, min: min, max: max, thumbAlignment: "edge", ...props, children: _jsxs(SliderPrimitive.Control, { className: "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col", children: [_jsx(SliderPrimitive.Track, { "data-slot": "slider-track", className: "relative grow overflow-hidden rounded-full bg-muted select-none data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1", children: _jsx(SliderPrimitive.Indicator, { "data-slot": "slider-range", className: "bg-primary select-none data-horizontal:h-full data-vertical:w-full" }) }), Array.from({ length: _values.length }, (_, index) => (_jsx(SliderPrimitive.Thumb, { "data-slot": "slider-thumb", className: "relative block size-3 shrink-0 rounded-full border border-ring bg-white ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50" }, index)))] }) }));
}
export { Slider };
//# sourceMappingURL=slider.js.map