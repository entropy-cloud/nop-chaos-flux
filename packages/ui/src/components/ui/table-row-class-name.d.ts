declare const tableRowClassNames: {
    readonly default: "border-b transition-colors duration-200 hover:bg-[color-mix(in_hsl,hsl(var(--primary))_6%,transparent)] data-[state=selected]:bg-[color-mix(in_hsl,hsl(var(--primary))_10%,transparent)]";
    readonly interactive: "cursor-pointer hover:bg-[linear-gradient(90deg,color-mix(in_hsl,hsl(var(--primary))_9%,transparent),transparent)] data-[state=selected]:bg-[color-mix(in_hsl,hsl(var(--primary))_12%,transparent)]";
    readonly subtle: "hover:bg-white/45 dark:hover:bg-slate-900/45";
};
export type TableRowVariant = keyof typeof tableRowClassNames;
export declare function getTableRowClassName(variant?: TableRowVariant): "border-b transition-colors duration-200 hover:bg-[color-mix(in_hsl,hsl(var(--primary))_6%,transparent)] data-[state=selected]:bg-[color-mix(in_hsl,hsl(var(--primary))_10%,transparent)]" | "cursor-pointer hover:bg-[linear-gradient(90deg,color-mix(in_hsl,hsl(var(--primary))_9%,transparent),transparent)] data-[state=selected]:bg-[color-mix(in_hsl,hsl(var(--primary))_12%,transparent)]" | "hover:bg-white/45 dark:hover:bg-slate-900/45";
export {};
