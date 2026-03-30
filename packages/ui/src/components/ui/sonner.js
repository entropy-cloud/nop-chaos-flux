"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, Loader2Icon, TriangleAlertIcon, } from "lucide-react";
import { Toaster as Sonner } from "sonner";
function resolveTheme() {
    if (typeof document === "undefined") {
        return "light";
    }
    const root = document.documentElement;
    return root.dataset.mode === "dark" || root.classList.contains("dark")
        ? "dark"
        : "light";
}
const Toaster = ({ ...props }) => {
    const [theme, setTheme] = useState(resolveTheme);
    useEffect(() => {
        const updateTheme = () => setTheme(resolveTheme());
        const root = document.documentElement;
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const observer = new MutationObserver(updateTheme);
        updateTheme();
        observer.observe(root, {
            attributes: true,
            attributeFilter: ["class", "data-mode"],
        });
        mediaQuery.addEventListener("change", updateTheme);
        return () => {
            observer.disconnect();
            mediaQuery.removeEventListener("change", updateTheme);
        };
    }, []);
    return (_jsx(Sonner, { theme: theme, className: "toaster group", closeButton: true, icons: {
            success: _jsx(CircleCheckIcon, { className: "size-4" }),
            info: _jsx(InfoIcon, { className: "size-4" }),
            warning: _jsx(TriangleAlertIcon, { className: "size-4" }),
            error: _jsx(CircleAlertIcon, { className: "size-4" }),
            loading: _jsx(Loader2Icon, { className: "size-4 animate-spin" }),
        }, style: {
            "--normal-bg": "var(--popover)",
            "--normal-text": "var(--popover-foreground)",
            "--normal-border": "var(--border)",
            "--border-radius": "var(--radius, var(--radius-md, 0.75rem))",
        }, ...props }));
};
export { Toaster };
export { toast } from "sonner";
//# sourceMappingURL=sonner.js.map