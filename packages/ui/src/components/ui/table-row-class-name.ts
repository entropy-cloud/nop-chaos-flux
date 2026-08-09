const tableRowClassNames = {
  default:
    'border-b transition-colors duration-200 hover:bg-[var(--table-hover-bg)] data-[state=selected]:bg-[var(--table-selected-bg)]',
  interactive:
    'cursor-pointer hover:bg-[var(--table-hover-bg-gradient)] data-[state=selected]:bg-[var(--table-selected-bg-strong)]',
  subtle: 'hover:bg-surface-hover',
} as const;

export type TableRowVariant = keyof typeof tableRowClassNames;

export function getTableRowClassName(variant: TableRowVariant = 'default') {
  return tableRowClassNames[variant];
}
