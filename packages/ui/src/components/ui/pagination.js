import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '../../lib/utils';
import { Button } from './button';
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
function Pagination({ className, ...props }) {
    return (_jsx("nav", { role: "navigation", "aria-label": "pagination", "data-slot": "pagination", className: cn("mx-auto flex w-full justify-center", className), ...props }));
}
function PaginationContent({ className, ...props }) {
    return (_jsx("ul", { "data-slot": "pagination-content", className: cn("flex items-center gap-0.5", className), ...props }));
}
function PaginationItem({ ...props }) {
    return _jsx("li", { "data-slot": "pagination-item", ...props });
}
function PaginationLink({ className, isActive, size = "icon", ...props }) {
    return (_jsx(Button, { variant: isActive ? "outline" : "ghost", size: size, className: cn(className), nativeButton: false, render: _jsx("a", { "aria-current": isActive ? "page" : undefined, "data-slot": "pagination-link", "data-active": isActive, ...props }) }));
}
function PaginationPrevious({ className, text = "Previous", ...props }) {
    return (_jsxs(PaginationLink, { "aria-label": "Go to previous page", size: "default", className: cn("pl-1.5!", className), ...props, children: [_jsx(ChevronLeftIcon, { "data-icon": "inline-start" }), _jsx("span", { className: "hidden sm:block", children: text })] }));
}
function PaginationNext({ className, text = "Next", ...props }) {
    return (_jsxs(PaginationLink, { "aria-label": "Go to next page", size: "default", className: cn("pr-1.5!", className), ...props, children: [_jsx("span", { className: "hidden sm:block", children: text }), _jsx(ChevronRightIcon, { "data-icon": "inline-end" })] }));
}
function PaginationEllipsis({ className, ...props }) {
    return (_jsxs("span", { "aria-hidden": true, "data-slot": "pagination-ellipsis", className: cn("flex size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4", className), ...props, children: [_jsx(MoreHorizontalIcon, {}), _jsx("span", { className: "sr-only", children: "More pages" })] }));
}
export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, };
//# sourceMappingURL=pagination.js.map