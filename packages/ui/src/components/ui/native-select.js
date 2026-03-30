import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '../../lib/utils';
import { ChevronDownIcon } from "lucide-react";
function NativeSelect({ className, size = "default", ...props }) {
    return (_jsxs("div", { className: cn("group/native-select relative w-fit has-[select:disabled]:opacity-50", className), "data-slot": "native-select-wrapper", "data-size": size, children: [_jsx("select", { "data-slot": "native-select", "data-size": size, className: "h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-sm transition-colors outline-none select-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] data-[size=sm]:py-0.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40", ...props }), _jsx(ChevronDownIcon, { className: "pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground select-none", "aria-hidden": "true", "data-slot": "native-select-icon" })] }));
}
function NativeSelectOption({ ...props }) {
    return _jsx("option", { "data-slot": "native-select-option", ...props });
}
function NativeSelectOptGroup({ className, ...props }) {
    return (_jsx("optgroup", { "data-slot": "native-select-optgroup", className: cn(className), ...props }));
}
export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
//# sourceMappingURL=native-select.js.map