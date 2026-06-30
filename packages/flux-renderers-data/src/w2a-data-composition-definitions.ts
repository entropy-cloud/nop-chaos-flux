import type { RendererDefinition } from '@nop-chaos/flux-core';
import { PaginationRenderer } from './pagination-renderer.js';
import { ServiceRenderer } from './service-renderer.js';

/**
 * W2a data-composition renderer definitions (service + pagination).
 *
 * Extracted from `data-renderer-definitions.ts` to keep that file under the
 * 700-line lint cap. Both renderers belong to the data package per roadmap §95
 * (service/pagination → flux-renderers-data).
 *
 * Request-sink gate: `service` owns NO request protocol — all of
 * api/initFetch/interval/sendOn/source belong to <data-source>. `service`
 * reads already-loaded data from scope via the `items` expression.
 */
export const w2aDataCompositionDefinitions: RendererDefinition[] = [
  {
    type: 'service',
    displayName: 'Service',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: ServiceRenderer,
    propContracts: {
      items: {
        shape: { kind: 'unknown' },
        displayName: 'Items',
        description:
          'Expression-bound value: reads already-loaded data from scope (loaded by an external or nested <data-source>). Service reads scope only and does NOT trigger HTTP.',
        editorType: 'expression',
      },
      data: {
        shape: { kind: 'unknown' },
        displayName: 'Data',
        description:
          'Optional local data injection (compiled-time evaluated expression). Same semantics as form.data.',
        editorType: 'expression',
      },
      statusPath: {
        shape: { kind: 'string' },
        displayName: 'Status Path',
        description:
          'Publishes a service visual-layer status summary (idle/ready/error + itemCount). Derived from items resolution, NOT a request mirror.',
        editorType: 'expression',
      },
    },
    fields: [
      { key: 'items', kind: 'prop' },
      { key: 'data', kind: 'prop' },
      { key: 'statusPath', kind: 'prop' },
      { key: 'body', kind: 'region' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
      { key: 'error', kind: 'value-or-region', regionKey: 'error' },
      { key: 'loading', kind: 'value-or-region', regionKey: 'loading' },
    ],
  },
  {
    type: 'pagination',
    displayName: 'Pagination',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: PaginationRenderer,
    propContracts: {
      currentPage: {
        shape: { kind: 'number' },
        displayName: 'Current Page',
        description:
          'Current page number (1-based). Out-of-range values are normalized to [1, totalPages].',
        editorType: 'expression',
        defaultValue: 1,
      },
      pageSize: {
        shape: { kind: 'number' },
        displayName: 'Page Size',
        description: 'Items per page. Defaults to 10.',
        editorType: 'expression',
        defaultValue: 10,
      },
      total: {
        shape: { kind: 'number' },
        displayName: 'Total',
        description: 'Total item count used to derive totalPages = ceil(total / pageSize).',
        editorType: 'expression',
      },
      pageSizeOptions: {
        shape: { kind: 'array', item: { kind: 'number' } },
        displayName: 'Page Size Options',
        description:
          'Selectable page sizes when mode is "with-page-size". Defaults to [10, 20, 50, 100].',
        editorType: 'expression',
      },
      mode: {
        shape: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'simple' },
            { kind: 'literal', value: 'with-page-size' },
          ],
        },
        displayName: 'Mode',
        description: 'simple = page numbers only; with-page-size = includes a page-size selector.',
        editorType: 'select',
        defaultValue: 'simple',
      },
      statusPath: {
        shape: { kind: 'string' },
        displayName: 'Status Path',
        description: 'Scope path publishing a read-only pagination summary.',
        editorType: 'expression',
      },
    },
    eventContracts: {
      onChange: {
        displayName: 'On Change',
        description:
          'Dispatched when currentPage changes (page click, prev/next, or page-size reset). Payload: { currentPage, pageSize, total }. Reports the normalized page value.',
        payload: {
          kind: 'object',
          fields: {
            currentPage: { kind: 'number' },
            pageSize: { kind: 'number' },
            total: { kind: 'number' },
          },
        },
      },
      onPageSizeChange: {
        displayName: 'On Page Size Change',
        description:
          'Dispatched when the page size is changed via the selector. Resets currentPage to 1 to avoid empty pages. Payload: { pageSize, currentPage, totalPages, total }.',
        payload: {
          kind: 'object',
          fields: {
            pageSize: { kind: 'number' },
            currentPage: { kind: 'number' },
            totalPages: { kind: 'number' },
            total: { kind: 'number' },
          },
        },
      },
    },
    fields: [
      { key: 'currentPage', kind: 'prop' },
      { key: 'pageSize', kind: 'prop' },
      { key: 'total', kind: 'prop' },
      { key: 'pageSizeOptions', kind: 'prop' },
      { key: 'mode', kind: 'prop' },
      { key: 'statusPath', kind: 'prop' },
      { key: 'onChange', kind: 'event' },
      { key: 'onPageSizeChange', kind: 'event' },
    ],
  },
];
