import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createLazyRendererComponent } from '@nop-chaos/flux-react';
import { DataSourceRenderer } from './data-source-renderer.js';
import { validateTableSchema } from './data-schema-validation.js';
import { TableRenderer } from './table-renderer.js';
import { TreeRenderer } from './tree-renderer.js';
import { crudRendererDefinition } from './crud-renderer-definition.js';
import type { ChartSchema } from './chart-schemas.js';

const LazyChartRenderer = createLazyRendererComponent<ChartSchema>(
  () => import('./chart-renderer.js').then((m) => m.ChartRenderer),
);

export { crudRendererDefinition } from './crud-renderer-definition.js';

export const dataRendererDefinitions: RendererDefinition[] = [
  {
    type: 'table',
    displayName: 'Table',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: TableRenderer,
    schemaValidator: validateTableSchema,
    propContracts: {
      source: {
        shape: { kind: 'unknown' },
        displayName: 'Source',
        description: 'Rows rendered by the table after upstream scope/data-source evaluation.',
        editorType: 'expression',
      },
      columns: {
        shape: { kind: 'unknown' },
        displayName: 'Columns',
        description: 'Table column definitions.',
        editorType: 'object-array',
      },
      pagination: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Pagination',
        description: 'Pagination configuration for the table shell.',
        editorType: 'object',
      },
      rowSelection: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Row Selection',
        description: 'Selection configuration for checkbox/radio row selection.',
        editorType: 'object',
      },
      expandable: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Expandable',
        description: 'Expanded-row configuration for the table.',
        editorType: 'object',
      },
      paginationOwnership: {
        shape: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'local' },
            { kind: 'literal', value: 'controlled' },
            { kind: 'literal', value: 'scope' },
          ],
        },
        displayName: 'Pagination Ownership',
        editorType: 'select',
        defaultValue: 'local',
      },
      selectionOwnership: {
        shape: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'local' },
            { kind: 'literal', value: 'controlled' },
            { kind: 'literal', value: 'scope' },
          ],
        },
        displayName: 'Selection Ownership',
        editorType: 'select',
        defaultValue: 'local',
      },
      sortOwnership: {
        shape: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'local' },
            { kind: 'literal', value: 'controlled' },
            { kind: 'literal', value: 'scope' },
          ],
        },
        displayName: 'Sort Ownership',
        editorType: 'select',
        defaultValue: 'local',
      },
      filterOwnership: {
        shape: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'local' },
            { kind: 'literal', value: 'controlled' },
            { kind: 'literal', value: 'scope' },
          ],
        },
        displayName: 'Filter Ownership',
        editorType: 'select',
        defaultValue: 'local',
      },
    },
    fields: [
      { key: 'source', kind: 'prop' },
      { key: 'rowKey', kind: 'prop' },
      { key: 'columns', kind: 'prop' },
      { key: 'paginationOwnership', kind: 'prop' },
      { key: 'selectionOwnership', kind: 'prop' },
      { key: 'sortOwnership', kind: 'prop' },
      { key: 'filterOwnership', kind: 'prop' },
      { key: 'paginationStatePath', kind: 'prop' },
      { key: 'selectionStatePath', kind: 'prop' },
      { key: 'sortStatePath', kind: 'prop' },
      { key: 'filterStatePath', kind: 'prop' },
      { key: 'header', kind: 'value-or-region', regionKey: 'header' },
      { key: 'footer', kind: 'value-or-region', regionKey: 'footer' },
      { key: 'loading', kind: 'prop' },
      { key: 'stripe', kind: 'prop' },
      { key: 'bordered', kind: 'prop' },
      { key: 'virtualThreshold', kind: 'prop' },
      { key: 'scrollHeight', kind: 'prop' },
      { key: 'columnSettings', kind: 'prop' },
      { key: 'responsive', kind: 'prop' },
      { key: 'pagination', kind: 'prop' },
      { key: 'rowSelection', kind: 'prop' },
      { key: 'expandable', kind: 'prop' },
      { key: 'quickSaveAction', kind: 'event' },
      { key: 'quickSaveItemAction', kind: 'event' },
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
    component: LazyChartRenderer,
    fields: [
      { key: 'source', kind: 'prop' },
      { key: 'series', kind: 'prop' },
      { key: 'chartType', kind: 'prop' },
      { key: 'title', kind: 'prop' },
      { key: 'xAxis', kind: 'prop' },
      { key: 'yAxis', kind: 'prop' },
      { key: 'height', kind: 'prop' },
      { key: 'loading', kind: 'prop' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
      { key: 'onClick', kind: 'event' },
      { key: 'onHover', kind: 'event' },
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
