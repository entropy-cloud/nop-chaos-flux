const tableRowClassNames = {
    default: 'border-b transition-colors duration-200 hover:bg-[color-mix(in_hsl,hsl(var(--primary))_6%,transparent)] data-[state=selected]:bg-[color-mix(in_hsl,hsl(var(--primary))_10%,transparent)]',
    interactive: 'cursor-pointer hover:bg-[linear-gradient(90deg,color-mix(in_hsl,hsl(var(--primary))_9%,transparent),transparent)] data-[state=selected]:bg-[color-mix(in_hsl,hsl(var(--primary))_12%,transparent)]',
    subtle: 'hover:bg-white/45 dark:hover:bg-slate-900/45'
};
export function getTableRowClassName(variant = 'default') {
    return tableRowClassNames[variant];
}
//# sourceMappingURL=table-row-class-name.js.map