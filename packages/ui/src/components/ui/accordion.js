import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { cn } from '../../lib/utils';
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
function Accordion({ className, ...props }) {
    return (_jsx(AccordionPrimitive.Root, { "data-slot": "accordion", className: cn("flex w-full flex-col", className), ...props }));
}
function AccordionItem({ className, ...props }) {
    return (_jsx(AccordionPrimitive.Item, { "data-slot": "accordion-item", className: cn("not-last:border-b", className), ...props }));
}
function AccordionTrigger({ className, children, ...props }) {
    return (_jsx(AccordionPrimitive.Header, { className: "flex", children: _jsxs(AccordionPrimitive.Trigger, { "data-slot": "accordion-trigger", className: cn("group/accordion-trigger relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-2.5 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:after:border-ring aria-disabled:pointer-events-none aria-disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground", className), ...props, children: [children, _jsx(ChevronDownIcon, { "data-slot": "accordion-trigger-icon", className: "pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden" }), _jsx(ChevronUpIcon, { "data-slot": "accordion-trigger-icon", className: "pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline" })] }) }));
}
function AccordionContent({ className, children, ...props }) {
    return (_jsx(AccordionPrimitive.Panel, { "data-slot": "accordion-content", className: "overflow-hidden text-sm data-open:animate-accordion-down data-closed:animate-accordion-up", ...props, children: _jsx("div", { className: cn("h-(--accordion-panel-height) pt-0 pb-2.5 data-ending-style:h-0 data-starting-style:h-0 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4", className), children: children }) }));
}
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
//# sourceMappingURL=accordion.js.map