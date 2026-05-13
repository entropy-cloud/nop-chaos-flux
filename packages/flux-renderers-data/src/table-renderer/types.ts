export type SortState = { column: string; direction: 'asc' | 'desc' | null };
export type FilterState = Record<string, { values: Set<string>; keyword?: string }>;

export type TableRowEntry = {
  rowKey: string;
  sourceIndex: number;
  record: Record<string, unknown>;
  viewIndex?: number;
};
