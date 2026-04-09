export type SortState = { column: string; direction: 'asc' | 'desc' | null };
export type FilterState = Record<string, Set<string>>;

export type TableRowEntry = {
  rowKey: string;
  sourceIndex: number;
  record: Record<string, any>;
  viewIndex?: number;
};
