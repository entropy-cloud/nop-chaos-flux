import type { BaseSchema } from '@nop-chaos/flux-core';

export interface TableColumnSchema extends BaseSchema {
  label?: string;
  labelRegionKey?: string;
  name?: string;
  cellRegionKey?: string;
  buttons?: BaseSchema[];
  buttonsRegionKey?: string;
  width?: number | string;
  sortable?: boolean;
  filterable?: boolean;
  filterOptions?: Array<{label: string; value: string}>;
}

export interface TableSchema extends BaseSchema {
  type: 'table';
  rowKey?: string;
  paginationOwnership?: 'local' | 'controlled' | 'scope';
  selectionOwnership?: 'local' | 'controlled' | 'scope';
  paginationStatePath?: string;
  selectionStatePath?: string;
  columns?: TableColumnSchema[];
  onRowClick?: BaseSchema;
  empty?: BaseSchema | BaseSchema[] | string;
  loading?: boolean;
  loadingSlot?: BaseSchema | BaseSchema[] | string;
  stripe?: boolean;
  bordered?: boolean;
  pagination?: {
    enabled?: boolean;
    currentPage?: number;
    pageSize?: number;
    pageSizeOptions?: number[];
    showSizeChanger?: boolean;
  };
  rowSelection?: {
    type?: 'checkbox' | 'radio';
    selectedRowKeys?: string[];
  };
  expandable?: {
    expandedRowKeys?: string[];
    expandRowByClick?: boolean;
    expandedRowRegionKey?: string;
  };
  onSortChange?: BaseSchema;
  onFilterChange?: BaseSchema;
  onPageChange?: BaseSchema;
  onSelectionChange?: BaseSchema;
  onRefresh?: BaseSchema;
}

export * from './chart-schemas';
