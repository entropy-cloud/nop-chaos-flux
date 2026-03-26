import type { BaseSchema } from '@nop-chaos/flux-core';

export interface TableColumnSchema extends BaseSchema {
  label?: string;
  labelRegionKey?: string;
  name?: string;
  cellRegionKey?: string;
  buttons?: BaseSchema[];
  buttonsRegionKey?: string;
}

export interface TableSchema extends BaseSchema {
  type: 'table';
  columns?: TableColumnSchema[];
  onRowClick?: BaseSchema;
  empty?: BaseSchema | BaseSchema[] | string;
}
