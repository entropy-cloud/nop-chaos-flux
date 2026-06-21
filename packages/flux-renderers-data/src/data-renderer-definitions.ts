import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createTemplateRegion, extractNestedSchemaRegions, isSchemaInput } from '@nop-chaos/flux-core';
import { createLazyRendererComponent } from '@nop-chaos/flux-react';
import { DataSourceRenderer } from './data-source-renderer.js';
import { validateTableSchema } from './data-schema-validation.js';
import { TableRenderer } from './table-renderer.js';
import { TreeRenderer } from './tree-renderer.js';
import { crudRendererDefinition } from './crud-renderer-definition.js';
import type { ChartSchema } from './chart-schemas.js';

function normalizeTableColumns(
  value: unknown,
  path: string,
  regions: Record<string, import('@nop-chaos/flux-core').TemplateRegion>,
  compileSchema: (
    input: import('@nop-chaos/flux-core').SchemaInput,
    options?: import('@nop-chaos/flux-core').CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => import('@nop-chaos/flux-core').TemplateNode | import('@nop-chaos/flux-core').TemplateNode[],
) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((column, index) => {
    if (!column || typeof column !== 'object') {
      return column;
    }

    const normalizedColumn = extractNestedSchemaRegions({
      candidate: column as Record<string, unknown>,
      itemRegionPath: `${path}.columns[${index}]`,
      itemRegionKeyPrefix: `columns.${index}`,
      rules: [
        { key: 'label', regionKeySuffix: 'label', compiledKey: 'labelRegionKey' },
        {
          key: 'buttons',
          regionKeySuffix: 'buttons',
          compiledKey: 'buttonsRegionKey',
          params: ['record', 'index'] as readonly string[],
          isolate: true,
        },
        {
          key: 'cell',
          regionKeySuffix: 'cell',
          compiledKey: 'cellRegionKey',
          params: ['record', 'index'] as readonly string[],
          isolate: true,
        },
        {
          key: 'body',
          regionKeySuffix: 'quickEditBody',
          compiledKey: 'quickEditBodyRegionKey',
        },
      ],
      regions,
      compileSchema,
    }).value as Record<string, unknown>;

    const quickEdit = normalizedColumn.quickEdit;
    if (
      quickEdit &&
      typeof quickEdit === 'object' &&
      !Array.isArray(quickEdit) &&
      isSchemaInput((quickEdit as Record<string, unknown>).body)
    ) {
      const quickEditBodyRegionKey =
        typeof normalizedColumn.quickEditBodyRegionKey === 'string'
          ? normalizedColumn.quickEditBodyRegionKey
          : `columns.${index}.quickEditBody`;
      const quickEditBodyRegionPath = `${path}.columns[${index}].quickEdit.body`;

      regions[quickEditBodyRegionKey] = createTemplateRegion(
        quickEditBodyRegionKey,
        (quickEdit as Record<string, unknown>).body,
        quickEditBodyRegionPath,
        compileSchema,
      );

      const nextQuickEdit = { ...(quickEdit as Record<string, unknown>) };
      delete nextQuickEdit.body;

      return {
        ...normalizedColumn,
        quickEdit: nextQuickEdit,
        quickEditBodyRegionKey,
      };
    }

    return normalizedColumn;
  });
}

function normalizeTableExpandable(
  value: unknown,
  path: string,
  regions: Record<string, import('@nop-chaos/flux-core').TemplateRegion>,
  compileSchema: (
    input: import('@nop-chaos/flux-core').SchemaInput,
    options?: import('@nop-chaos/flux-core').CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => import('@nop-chaos/flux-core').TemplateNode | import('@nop-chaos/flux-core').TemplateNode[],
) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  return extractNestedSchemaRegions({
    candidate: value as Record<string, unknown>,
    itemRegionPath: `${path}.expandable`,
    itemRegionKeyPrefix: 'expandable',
    rules: [
      {
        key: 'expandedRow',
        regionKeySuffix: 'expandedRow',
        compiledKey: 'expandedRowRegionKey',
        params: ['record', 'index'] as readonly string[],
        isolate: true,
      },
    ],
    regions,
    compileSchema,
  }).value;
}

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
    componentCapabilityContracts: [
      {
        handle: 'refresh',
        displayName: 'Refresh',
        description: 'Refresh the current table view and return its pagination snapshot.',
        result: {
          kind: 'object',
          fields: {
            page: { kind: 'number' },
            pageSize: { kind: 'number' },
          },
        },
      },
      {
        handle: 'getSelection',
        displayName: 'Get Selection',
        description: 'Return the currently selected row keys.',
        result: { kind: 'array', item: { kind: 'string' } },
      },
      {
        handle: 'setSelection',
        displayName: 'Set Selection',
        description: 'Replace the current table selection and return the applied row keys.',
        args: {
          kind: 'unknown',
        },
        result: { kind: 'array', item: { kind: 'string' } },
      },
    ],
    deepFields: [
      {
        key: 'columns',
        nestedRegions: [
          { key: 'label', regionKeySuffix: 'label', compiledKey: 'labelRegionKey' },
          {
            key: 'buttons',
            regionKeySuffix: 'buttons',
            compiledKey: 'buttonsRegionKey',
            params: ['record', 'index'],
            isolate: true,
          },
          {
            key: 'cell',
            regionKeySuffix: 'cell',
            compiledKey: 'cellRegionKey',
            params: ['record', 'index'],
            isolate: true,
          },
          {
            key: 'body',
            regionKeySuffix: 'quickEditBody',
            compiledKey: 'quickEditBodyRegionKey',
          },
        ],
        normalize(input) {
          return normalizeTableColumns(input.value, input.path, input.regions, input.compileSchema);
        },
      },
      {
        key: 'expandable',
        nestedRegions: [
          {
            key: 'expandedRow',
            regionKeySuffix: 'expandedRow',
            compiledKey: 'expandedRowRegionKey',
            params: ['record', 'index'],
            isolate: true,
          },
        ],
        normalize(input) {
          return normalizeTableExpandable(input.value, input.path, input.regions, input.compileSchema);
        },
      },
    ],
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
      { key: 'columnResize', kind: 'prop', valueType: 'boolean' },
      { key: 'affixHeader', kind: 'prop', valueType: 'boolean' },
      { key: 'prefixRow', kind: 'prop' },
      { key: 'affixRow', kind: 'prop' },
      { key: 'combineNum', kind: 'prop' },
      { key: 'draggable', kind: 'prop', valueType: 'boolean' },
      { key: 'orderField', kind: 'prop' },
      { key: 'rowChildrenField', kind: 'prop' },
      { key: 'columnWidthsOwnership', kind: 'prop' },
      { key: 'columnWidthsStatePath', kind: 'prop' },
      { key: 'multiSort', kind: 'prop', valueType: 'boolean' },
      { key: 'pagination', kind: 'prop' },
      { key: 'rowSelection', kind: 'prop' },
      { key: 'expandable', kind: 'prop' },
      { key: 'quickSaveAction', kind: 'prop' },
      { key: 'quickSaveItemAction', kind: 'prop' },
      { key: 'onRowClick', kind: 'event' },
      { key: 'onSortChange', kind: 'event' },
      { key: 'onFilterChange', kind: 'event' },
      { key: 'onPageChange', kind: 'event' },
      { key: 'onSelectionChange', kind: 'event' },
      { key: 'onRefresh', kind: 'event' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
      { key: 'loadingContent', kind: 'value-or-region', regionKey: 'loading' },
    ],
  },
  {
    type: 'data-source',
    displayName: 'Data Source',
    category: 'logic',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: DataSourceRenderer,
    compilation: {
      artifacts: ['data-source'],
    },
    propContracts: {
      sendOn: {
        shape: { kind: 'string' },
        displayName: 'Send On',
        description:
          'Raw boolean expression (no `${}`). When falsy or evaluation throws, the request is skipped.',
        editorType: 'expression',
      },
      initFetch: {
        shape: { kind: 'boolean' },
        displayName: 'Init Fetch',
        description:
          'Whether to automatically fetch on mount. Defaults to true; set to false to require an explicit refresh.',
        editorType: 'switch',
        defaultValue: true,
      },
    },
    eventContracts: {
      onSuccess: {
        displayName: 'On Success',
        description: 'Dispatched after a successful fetch. Payload: { data, dataUpdatedAt }.',
        payload: {
          kind: 'object',
          fields: {
            data: { kind: 'unknown' },
            dataUpdatedAt: { kind: 'number' },
          },
        },
      },
      onError: {
        displayName: 'On Error',
        description: 'Dispatched after a failed fetch. Payload: { error, failureCount }.',
        payload: {
          kind: 'object',
          fields: {
            error: { kind: 'unknown' },
            failureCount: { kind: 'number' },
          },
        },
      },
    },
    componentCapabilityContracts: [
      {
        handle: 'refresh',
        displayName: 'Refresh',
        description:
          'Trigger a manual refresh. The ActionResult carries `skipped` (boolean) in `data`, reflecting whether the sendOn gate suppressed the request.',
      },
      {
        handle: 'cancel',
        displayName: 'Cancel',
        description:
          'Cancel any in-flight request and stop the controller. No-op when no request is active.',
      },
      {
        handle: 'start',
        displayName: 'Start',
        description:
          'Start (or resume) the controller. Idempotent: no-op when already started. Used by polling orchestrators (e.g. crud `polling.enabled`) to resume upstream data-source polling.',
      },
    ],
    fields: [
      { key: 'sendOn', kind: 'prop' },
      { key: 'initFetch', kind: 'prop', valueType: 'boolean' },
      { key: 'onSuccess', kind: 'event' },
      { key: 'onError', kind: 'event' },
    ],
  },
  {
    type: 'chart',
    displayName: 'Chart',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: LazyChartRenderer,
    componentCapabilityContracts: [
      {
        handle: 'resize',
        displayName: 'Resize',
        description: 'Request the current chart instance to recompute its layout.',
      },
    ],
    fields: [
      { key: 'source', kind: 'prop' },
      { key: 'series', kind: 'prop' },
      { key: 'chartType', kind: 'prop' },
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'xAxis', kind: 'prop' },
      { key: 'yAxis', kind: 'prop' },
      { key: 'height', kind: 'prop' },
      { key: 'loading', kind: 'prop' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
      { key: 'legend', kind: 'prop' },
      { key: 'stacked', kind: 'prop' },
      { key: 'grid', kind: 'prop' },
      { key: 'colors', kind: 'prop' },
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
      { key: 'label', kind: 'prop' },
      { key: 'title', kind: 'prop' },
      { key: 'childrenKey', kind: 'prop' },
      { key: 'labelField', kind: 'prop' },
      { key: 'keyField', kind: 'prop' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
      { key: 'initiallyExpanded', kind: 'prop' },
      { key: 'expandOnClickNode', kind: 'prop' },
      { key: 'statusPath', kind: 'prop' },
      { key: 'searchable', kind: 'prop', valueType: 'boolean' },
      { key: 'showIcon', kind: 'prop', valueType: 'boolean' },
      { key: 'iconField', kind: 'prop' },
      { key: 'showGuideLine', kind: 'prop', valueType: 'boolean' },
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
