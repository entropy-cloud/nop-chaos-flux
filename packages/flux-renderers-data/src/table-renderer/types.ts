export type SortDirection = 'asc' | 'desc' | null;
export type SortState = { column: string; direction: SortDirection };
export type SortEntry = { column: string; direction: 'asc' | 'desc' };
export type MultiSortState = SortEntry[];
export type FilterState = Record<string, { values: Set<string>; keyword?: string }>;

export type TableRowEntry = {
  // `rowKey` is the *internal* row-identity member (RM-13): the author-facing
  // schema field is `itemKey` — see naming-conventions §4.9 for the split.
  rowKey: string;
  cacheKey?: string;
  sourceIndex: number;
  record: Record<string, unknown>;
  viewIndex?: number;
};
