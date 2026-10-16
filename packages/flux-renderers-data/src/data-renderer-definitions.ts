import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { createLazyRendererComponent } from '@nop-chaos/flux-react';
import { DataSourceRenderer } from './data-source-renderer.js';
import { validateTableSchema } from './data-schema-validation.js';
import { TableRenderer } from './table-renderer.js';
import { TreeRenderer } from './tree-renderer.js';
import { crudRendererDefinition } from './crud-renderer-definition.js';
import { queryFilterRendererDefinition } from './query-filter-definition.js';
import { batchBarRendererDefinition } from './batch-bar-definition.js';
import { w2aDataCompositionDefinitions } from './w2a-data-composition-definitions.js';
import { statTileRendererDefinition } from './stat-tile-renderer-definition.js';
import { sparklineRendererDefinition } from './sparkline-renderer-definition.js';
import { listRendererDefinition } from './list-renderer-definition.js';
import type { ChartSchema } from './chart-schemas.js';

const LazyChartRenderer = createLazyRendererComponent<ChartSchema>(
  () => import('./chart-renderer.js').then((m) => m.ChartRenderer),
);

export { crudRendererDefinition } from './crud-renderer-definition.js';
export { queryFilterRendererDefinition } from './query-filter-definition.js';
export { batchBarRendererDefinition } from './batch-bar-definition.js';
export { sparklineRendererDefinition } from './sparkline-renderer-definition.js';
export { echartsRendererDefinition } from './echarts-renderer-definition.js';
import { echartsRendererDefinition } from './echarts-renderer-definition.js';

export const dataRendererDefinitions: RegisteredRendererDefinition[] = [
  {
    type: 'table',
    displayName: 'Table',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: TableRenderer,
    schemaValidator: validateTableSchema,
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
    fields: [
      {
        key: 'source',
        kind: 'prop',
        contract: {
          shape: { kind: 'unknown' },
          displayName: 'Source',
          description: 'Rows rendered by the table after upstream scope/data-source evaluation.',
          editorType: 'expression',
        },
      },
      { key: 'itemKey', kind: 'prop' },
      {
        key: 'columns',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'array',
            item: {
              kind: 'schema-definition',
              fieldRules: {
                label: {
                  kind: 'value-or-region',
                  regionKey: 'labelRegionKey',
                },
                buttons: {
                  kind: 'region',
                  regionKey: 'buttonsRegionKey',
                  params: ['record', 'index'],
                  isolate: true,
                },
                cell: {
                  kind: 'region',
                  regionKey: 'cellRegionKey',
                  params: ['record', 'index'],
                  isolate: true,
                },
                body: {
                  kind: 'region',
                  regionKey: 'quickEditBodyRegionKey',
                  regionKeySuffix: 'quickEditBody',
                },
                quickEdit: {
                  kind: 'region',
                  sourceKey: 'body',
                  regionKey: 'quickEditBodyRegionKey',
                  regionKeySuffix: 'quickEditBody',
                },
                popOver: {
                  kind: 'region',
                  sourceKey: 'content',
                  regionKey: 'popOver.contentRegionKey',
                  regionKeySuffix: 'popOver.content',
                  params: ['record', 'index'],
                  isolate: true,
                },
                searchable: {
                  kind: 'value-or-region',
                  regionKey: 'searchableRegionKey',
                },
              },
            },
          },
          displayName: 'Columns',
          description: 'Table column definitions.',
          editorType: 'object-array',
        },
      },
      {
        key: 'paginationOwnership',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [{ kind: 'literal', value: 'local' }, { kind: 'literal', value: 'controlled' }, { kind: 'literal', value: 'scope' }],
          },
          displayName: 'Pagination Ownership',
          editorType: 'select',
          defaultValue: 'local',
        },
      },
      {
        key: 'selectionOwnership',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [{ kind: 'literal', value: 'local' }, { kind: 'literal', value: 'controlled' }, { kind: 'literal', value: 'scope' }],
          },
          displayName: 'Selection Ownership',
          editorType: 'select',
          defaultValue: 'local',
        },
      },
      {
        key: 'sortOwnership',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [{ kind: 'literal', value: 'local' }, { kind: 'literal', value: 'controlled' }, { kind: 'literal', value: 'scope' }],
          },
          displayName: 'Sort Ownership',
          editorType: 'select',
          defaultValue: 'local',
        },
      },
      {
        key: 'filterOwnership',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [{ kind: 'literal', value: 'local' }, { kind: 'literal', value: 'controlled' }, { kind: 'literal', value: 'scope' }],
          },
          displayName: 'Filter Ownership',
          editorType: 'select',
          defaultValue: 'local',
        },
      },
      { key: 'paginationStatePath', kind: 'prop' },
      { key: 'selectionStatePath', kind: 'prop' },
      { key: 'sortStatePath', kind: 'prop' },
      { key: 'filterStatePath', kind: 'prop' },
      { key: 'sort', kind: 'prop' },
      { key: 'sortEntries', kind: 'prop' },
      { key: 'sortColumn', kind: 'prop' },
      { key: 'sortDirection', kind: 'prop' },
      { key: 'filters', kind: 'prop' },
      { key: 'header', kind: 'value-or-region', regionKey: 'header' },
      { key: 'footer', kind: 'value-or-region', regionKey: 'footer' },
      { key: 'loading', kind: 'prop' },
      { key: 'stripe', kind: 'prop' },
      { key: 'bordered', kind: 'prop' },
      { key: 'density', kind: 'prop' },
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
      {
        key: 'childrenSource',
        kind: 'prop',
        contract: {
          shape: { kind: 'schema-definition', fieldRules: {}, actionValue: true },
          displayName: 'Children Source',
          description:
            'Action dispatched on tree-node expand to lazy-load children (ActionSchema). Template-preserved; row scope evaluated at dispatch.',
        },
      },
      { key: 'columnWidthsOwnership', kind: 'prop' },
      { key: 'columnWidthsStatePath', kind: 'prop' },
      { key: 'multiSort', kind: 'prop', valueType: 'boolean' },
      {
        key: 'pagination',
        kind: 'prop',
        contract: {
          shape: { kind: 'object', fields: {} },
          displayName: 'Pagination',
          description: 'Pagination configuration for the table shell.',
          editorType: 'object',
        },
      },
      {
        key: 'rowSelection',
        kind: 'prop',
        contract: {
          shape: { kind: 'object', fields: {} },
          displayName: 'Row Selection',
          description:
            'Selection configuration for checkbox/radio row selection. `modifierSelect` (checkbox mode only, default false) enables modifier gestures: shift-click additive range from the last acted row (anchor), meta/ctrl-click independent toggle, ⌘/ctrl+A select-all inside the table. `selectAllMode` ("all" default | "page") scopes the header select-all and its checkbox state to the current display page (server-paged tables keep the flowed-in row set).',
          editorType: 'object',
        },
      },
      {
        key: 'optionRow',
        kind: 'prop',
        contract: {
          shape: { kind: 'object', fields: {} },
          displayName: 'Option Row',
          description:
            'Interaction-state channel for rows: `value` selected-value binding (owner scope, array = any-match), `valueField` compared item field (default itemKey), `selectedClass` schema class for the selected state. Emits data-option-row / data-state / data-selected / aria-selected markers on the row; absent optionRow keeps legacy output.',
          editorType: 'object',
        },
      },
      {
        key: 'group',
        kind: 'prop',
        contract: {
          shape: { kind: 'object', fields: {} },
          displayName: 'Group',
          description:
            'Client-side grouping over the sorted/filtered row set (D1 G-D). `field` groups rows by first-appearance order (declaring it enables grouping); `aggregates` renders per-group `fn` (sum/avg/min/max/count) values in the header; `missingLabel` names the fallback group for missing/null/empty values. Group headers are rows with data-slot="table-group-header" and collapse via the chevron toggle; collapsed state survives data refreshes keyed by group. Inert under tree mode (tree precedence); suppresses drag-sort ordering while active.',
          editorType: 'object',
        },
      },
      {
        key: 'expandable',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'schema-definition',
            fieldRules: {
              expandedRow: {
                kind: 'region',
                regionKey: 'expandedRowRegionKey',
                params: ['record', 'index'],
                isolate: true,
              },
            },
          },
          displayName: 'Expandable',
          description: 'Expanded-row configuration for the table.',
          editorType: 'object',
        },
      },
      {
        key: 'quickSaveAction',
        kind: 'prop',
        contract: {
          shape: { kind: 'schema-definition', fieldRules: {}, actionValue: true },
          displayName: 'Quick Save Action',
          description:
            'Action dispatched for batch quick-save (ActionSchema). Template-preserved; row scope evaluated at dispatch.',
        },
      },
      {
        key: 'quickSaveItemAction',
        kind: 'prop',
        contract: {
          shape: { kind: 'schema-definition', fieldRules: {}, actionValue: true },
          displayName: 'Quick Save Item Action',
          description:
            'Action dispatched per row on quick save (ActionSchema). Template-preserved; row scope evaluated at dispatch.',
        },
      },
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
      {
        key: 'sendOn',
        kind: 'prop',
        contract: {
          shape: { kind: 'string' },
          displayName: 'Send On',
          description:
            'Raw boolean expression (no `${}`). When falsy or evaluation throws, the request is skipped.',
          editorType: 'expression',
        },
      },
      {
        key: 'initFetch',
        kind: 'prop',
        valueType: 'boolean',
        contract: {
          shape: { kind: 'boolean' },
          displayName: 'Init Fetch',
          description:
            'Whether to automatically fetch on mount. Defaults to true; set to false to require an explicit refresh.',
          editorType: 'switch',
          defaultValue: true,
        },
      },
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
      { key: 'control', kind: 'prop' },
      { key: 'retry', kind: 'prop' },
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
      { key: 'referenceLines', kind: 'prop' },
      { key: 'band', kind: 'prop' },
      { key: 'markers', kind: 'prop' },
      { key: 'brush', kind: 'prop' },
      { key: 'componentId', kind: 'prop' },
      {
        key: 'onClick',
        kind: 'event',
        contract: {
          displayName: 'On Click',
          description:
            'Dispatched when the chart canvas is clicked (or activated via Enter/Space). Payload is the raw DOM event.',
          payload: { kind: 'unknown' },
        },
      },
      {
        key: 'onHover',
        kind: 'event',
        contract: {
          displayName: 'On Hover',
          description: 'Dispatched when the mouse enters the chart canvas. Payload is the raw DOM event.',
          payload: { kind: 'unknown' },
        },
      },
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
      { key: 'multiple', kind: 'prop', valueType: 'boolean' },
      {
        key: 'node',
        kind: 'region',
        params: ['node', 'index', 'depth', 'key', 'parentNode'],
        isolate: false,
      },
    ],
  },
  listRendererDefinition,
  ...w2aDataCompositionDefinitions,
  statTileRendererDefinition,
  sparklineRendererDefinition,
  echartsRendererDefinition,
  queryFilterRendererDefinition,
  batchBarRendererDefinition,
  crudRendererDefinition,
];
