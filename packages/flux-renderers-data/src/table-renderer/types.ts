export type SortDirection = 'asc' | 'desc' | null;
export type SortState = { column: string; direction: SortDirection };
export type SortEntry = { column: string; direction: 'asc' | 'desc' };
export type MultiSortState = SortEntry[];
export type FilterState = Record<string, { values: Set<string>; keyword?: string }>;

export type TableRowEntry = {
  rowKey: string;
  cacheKey?: string;
  sourceIndex: number;
  record: Record<string, unknown>;
  viewIndex?: number;
};
