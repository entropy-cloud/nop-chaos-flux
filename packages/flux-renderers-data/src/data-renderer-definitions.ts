import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createTemplateRegion, extractNestedSchemaRegions, isSchemaInput } from '@nop-chaos/flux-core';
import { createLazyRendererComponent } from '@nop-chaos/flux-react';
import { DataSourceRenderer } from './data-source-renderer.js';
import { validateTableSchema } from './data-schema-validation.js';
import { ListRenderer } from './list-renderer.js';
import { TableRenderer } from './table-renderer.js';
import { TreeRenderer } from './tree-renderer.js';
import { crudRendererDefinition } from './crud-renderer-definition.js';
import { w2aDataCompositionDefinitions } from './w2a-data-composition-definitions.js';
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

    let normalizedColumn = extractNestedSchemaRegions({
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

    const popOverConfig = normalizedColumn.popOver;
    if (
      popOverConfig &&
      typeof popOverConfig === 'object' &&
      !Array.isArray(popOverConfig)
    ) {
      const popOverResult = extractNestedSchemaRegions({
        candidate: popOverConfig as Record<string, unknown>,
        itemRegionPath: `${path}.columns[${index}].popOver`,
        itemRegionKeyPrefix: `columns.${index}.popOver`,
        rules: [
          {
            key: 'content',
            regionKeySuffix: 'content',
            compiledKey: 'contentRegionKey',
            params: ['record', 'index'] as readonly string[],
            isolate: true,
          },
        ],
        regions,
        compileSchema,
      });
      if (popOverResult.changed) {
        normalizedColumn = { ...normalizedColumn, popOver: popOverResult.value };
      }
    }

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
      { key: 'autoFillHeight', kind: 'prop' },
      { key: 'columnSettings', kind: 'prop' },
      { key: 'responsive', kind: 'prop' },
      { key: 'columnResize', kind: 'prop', valueType: 'boolean' },
      { key: 'affixHeader', kind: 'prop', valueType: 'boolean' },
      { key: 'showHeader', kind: 'prop', valueType: 'boolean' },
      { key: 'prefixRow', kind: 'prop' },
      { key: 'affixRow', kind: 'prop' },
      { key: 'combineNum', kind: 'prop' },
      { key: 'combineFromIndex', kind: 'prop' },
      { key: 'draggable', kind: 'prop', valueType: 'boolean' },
      { key: 'orderField', kind: 'prop' },
      { key: 'orderOwnership', kind: 'prop' },
      { key: 'orderStatePath', kind: 'prop' },
      { key: 'rowChildrenField', kind: 'prop' },
      { key: 'childrenSource', kind: 'prop' },
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
    // NOTE: `onSuccess` / `onError` are intentionally NOT declared here as
    // renderer `eventContracts` (kind:'event'). They are data-source *lifecycle
    // actions* — declared on `ActionDataSourceSchema` and compiled into the
    // data-source artifact (`compiledSources[0].onSuccess/onError`), dispatched
    // by the controller (see `runtime-sources-lifecycle.test.ts`). Declaring
    // them as renderer events would route them to `props.events`, which this
    // renderer never reads — a "lying contract". They stay author-facing via the
    // data-source schema type and are surfaced to tooling by the artifact.
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
      { key: 'name', kind: 'prop' },
      { key: 'action', kind: 'prop' },
      { key: 'args', kind: 'prop' },
      { key: 'formula', kind: 'prop' },
      { key: 'sendOn', kind: 'prop' },
      { key: 'initFetch', kind: 'prop', valueType: 'boolean' },
      { key: 'interval', kind: 'prop' },
      { key: 'stopWhen', kind: 'prop' },
      { key: 'silent', kind: 'prop', valueType: 'boolean' },
      { key: 'mergeToScope', kind: 'prop', valueType: 'boolean' },
      { key: 'mergeStrategy', kind: 'prop' },
      { key: 'mergeKey', kind: 'prop' },
      { key: 'statusPath', kind: 'prop' },
      { key: 'dependsOn', kind: 'prop' },
      { key: 'initialData', kind: 'prop' },
      { key: 'resultMapping', kind: 'prop' },
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
  {
    type: 'list',
    displayName: 'List',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: ListRenderer,
    propContracts: {
      items: {
        shape: { kind: 'array', item: { kind: 'unknown' } },
        displayName: 'Items',
        description:
          'The single collection field: the array of records rendered through the item region.',
        editorType: 'expression',
      },
      selectionMode: {
        shape: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'none' },
            { kind: 'literal', value: 'single' },
            { kind: 'literal', value: 'multiple' },
          ],
        },
        displayName: 'Selection Mode',
        description:
          'Selection ownership is local controlled state. "none" disables selection, "single" is mutually exclusive, "multiple" accumulates.',
        editorType: 'select',
        defaultValue: 'none',
      },
      keyField: {
        shape: { kind: 'string' },
        displayName: 'Key Field',
        description:
          'Field used to derive a stable per-item key for selection and React reconciliation. Falls back to the item index when absent.',
        editorType: 'expression',
        defaultValue: 'id',
      },
      pagination: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Pagination',
        description:
          'Pagination / infinite-scroll configuration. Opt-in via enabled. List never owns a request: data flows via onPageChange/onLoadMore → action graph → data-source → scope items (request-sink).',
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
        description:
          'Where pagination interaction state lives. local = list holds currentPage; controlled = pure view driven by pagination.currentPage; scope = read/write paginationStatePath.',
        editorType: 'select',
        defaultValue: 'local',
      },
      paginationStatePath: {
        shape: { kind: 'string' },
        displayName: 'Pagination State Path',
        description:
          'Scope path holding { currentPage, pageSize } for scope ownership. Missing path degrades with a dev warning (no crash).',
        editorType: 'expression',
      },
      pageSizeStatePath: {
        shape: { kind: 'string' },
        displayName: 'Page Size State Path',
        description: 'Optional separate scope path for pageSize (scope ownership).',
        editorType: 'expression',
      },
    },
    eventContracts: {
      onItemClick: {
        displayName: 'On Item Click',
        description:
          'Dispatched when a list item is clicked. Payload: { item, index, key }. The action scope is the per-item scope, so item/index are also reachable as scope values.',
        payload: {
          kind: 'object',
          fields: {
            item: { kind: 'unknown' },
            index: { kind: 'number' },
            key: { kind: 'string' },
          },
        },
      },
      onSelectionChange: {
        displayName: 'On Selection Change',
        description:
          'Dispatched when the local selection changes. Payload: { selectedKeys, selectionMode }.',
        payload: {
          kind: 'object',
          fields: {
            selectedKeys: { kind: 'array', item: { kind: 'string' } },
            selectionMode: { kind: 'string' },
          },
        },
      },
      onPageChange: {
        displayName: 'On Page Change',
        description:
          'Dispatched when the list actively changes its resolved current page (capability gotoPage or infinite load-more). Payload: { currentPage, pageSize, totalPages, total }. Pure passive scope/controlled reads do not dispatch.',
        payload: {
          kind: 'object',
          fields: {
            currentPage: { kind: 'number' },
            pageSize: { kind: 'number' },
            totalPages: { kind: 'number' },
            total: { kind: 'number' },
          },
        },
      },
      onLoadMore: {
        displayName: 'On Load More',
        description:
          'Dispatched when the infinite sentinel intersects (bottom reached). Payload: { currentPage, pageSize, total }. List never self-requests; the host advances the page and appends items to scope.',
        payload: {
          kind: 'object',
          fields: {
            currentPage: { kind: 'number' },
            pageSize: { kind: 'number' },
            total: { kind: 'number' },
          },
        },
      },
    },
    componentCapabilityContracts: [
      {
        handle: 'gotoPage',
        displayName: 'Goto Page',
        description:
          'Clamp and apply a new current page (local/scope ownership). Returns the pagination snapshot. No-op for controlled ownership.',
        args: { kind: 'object', fields: { page: { kind: 'number' } } },
        result: {
          kind: 'object',
          fields: {
            currentPage: { kind: 'number' },
            pageSize: { kind: 'number' },
            totalPages: { kind: 'number' },
            total: { kind: 'number' },
          },
        },
      },
      {
        handle: 'getPagination',
        displayName: 'Get Pagination',
        description: 'Return the current pagination snapshot { currentPage, pageSize, totalPages, total }.',
        result: {
          kind: 'object',
          fields: {
            currentPage: { kind: 'number' },
            pageSize: { kind: 'number' },
            totalPages: { kind: 'number' },
            total: { kind: 'number' },
          },
        },
      },
    ],
    fields: [
      { key: 'items', kind: 'prop' },
      { key: 'selectionMode', kind: 'prop' },
      { key: 'keyField', kind: 'prop' },
      { key: 'pagination', kind: 'prop' },
      { key: 'paginationOwnership', kind: 'prop' },
      { key: 'paginationStatePath', kind: 'prop' },
      { key: 'pageSizeStatePath', kind: 'prop' },
      { key: 'onItemClick', kind: 'event' },
      { key: 'onSelectionChange', kind: 'event' },
      { key: 'onPageChange', kind: 'event' },
      { key: 'onLoadMore', kind: 'event' },
      { key: 'item', kind: 'region', params: ['item', 'index'], isolate: false },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    ],
  },
  ...w2aDataCompositionDefinitions,
  crudRendererDefinition,
];
