import type { RendererDefinition } from '@nop-chaos/flux-core';
import { ChartRenderer } from './chart-renderer.js';
import { DataSourceRenderer } from './data-source-renderer.js';
import { validateTableSchema } from './data-schema-validation.js';
import { TableRenderer } from './table-renderer.js';
import { TreeRenderer } from './tree-renderer.js';
import { crudRendererDefinition } from './crud-renderer-definition.js';

export { crudRendererDefinition } from './crud-renderer-definition.js';

export const dataRendererDefinitions: RendererDefinition[] = [
  {
    type: 'table',
    displayName: 'Table',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: TableRenderer,
    schemaValidator: validateTableSchema,
    fields: [
      { key: 'onRowClick', kind: 'event' },
      { key: 'onSortChange', kind: 'event' },
      { key: 'onFilterChange', kind: 'event' },
      { key: 'onPageChange', kind: 'event' },
      { key: 'onSelectionChange', kind: 'event' },
      { key: 'onRefresh', kind: 'event' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
      { key: 'loadingSlot', kind: 'value-or-region', regionKey: 'loadingSlot' },
    ],
  },
  {
    type: 'data-source',
    displayName: 'Data Source',
    category: 'logic',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: DataSourceRenderer,
  },
  {
    type: 'chart',
    displayName: 'Chart',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: ChartRenderer,
    fields: [
      { key: 'onClick', kind: 'event' },
      { key: 'onHover', kind: 'event' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
      { key: 'componentId', kind: 'prop' },
    ],
  },
  {
    type: 'tree',
    displayName: 'Tree',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: TreeRenderer,
    fields: [
      { key: 'data', kind: 'prop' },
      { key: 'childrenKey', kind: 'prop' },
      { key: 'labelField', kind: 'prop' },
      { key: 'keyField', kind: 'prop' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
      { key: 'initiallyExpanded', kind: 'prop' },
      { key: 'expandOnClickNode', kind: 'prop' },
      { key: 'statusPath', kind: 'prop' },
      {
        key: 'node',
        kind: 'region',
        params: ['node', 'index', 'depth', 'key', 'parentNode'],
        isolate: false,
      },
    ],
  },
  crudRendererDefinition,
];
