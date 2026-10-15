import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { PaginationRenderer } from './pagination-renderer.js';
import { StatisticsRenderer } from './statistics-renderer.js';

/**
 * W2a data-composition renderer definitions (pagination + statistics).
 *
 * Extracted from `data-renderer-definitions.ts` to keep that file under the
 * 700-line lint cap.
 */
export const w2aDataCompositionDefinitions: RegisteredRendererDefinition[] = [
  {
    type: 'pagination',
    displayName: 'Pagination',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: PaginationRenderer,
    fields: [
      {
        key: 'currentPage',
        kind: 'prop',
        contract: {
          shape: { kind: 'number' },
          displayName: 'Current Page',
          description:
            'Current page number (1-based). Out-of-range values are normalized to [1, totalPages].',
          editorType: 'expression',
          defaultValue: 1,
        },
      },
      {
        key: 'pageSize',
        kind: 'prop',
        contract: {
          shape: { kind: 'number' },
          displayName: 'Page Size',
          description: 'Items per page. Defaults to 10.',
          editorType: 'expression',
          defaultValue: 10,
        },
      },
      {
        key: 'total',
        kind: 'prop',
        contract: {
          shape: { kind: 'number' },
          displayName: 'Total',
          description: 'Total item count used to derive totalPages = ceil(total / pageSize).',
          editorType: 'expression',
        },
      },
      {
        key: 'pageSizeOptions',
        kind: 'prop',
        contract: {
          shape: { kind: 'array', item: { kind: 'number' } },
          displayName: 'Page Size Options',
          description:
            'Selectable page sizes when mode is "with-page-size". Defaults to [10, 20, 50, 100].',
          editorType: 'expression',
        },
      },
      {
        key: 'mode',
        kind: 'prop',
        contract: {
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
      },
      {
        key: 'statusPath',
        kind: 'prop',
        contract: {
          shape: { kind: 'string' },
          displayName: 'Status Path',
          description: 'Scope path publishing a read-only pagination summary.',
          editorType: 'expression',
        },
      },
      {
        key: 'onChange',
        kind: 'event',
        contract: {
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
      },
      {
        key: 'onPageSizeChange',
        kind: 'event',
        contract: {
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
    ],
  },
  {
    type: 'statistics',
    displayName: 'Statistics',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: StatisticsRenderer,
    fields: [
      {
        key: 'total',
        kind: 'prop',
        contract: {
          shape: { kind: 'number' },
          displayName: 'Total',
          description: 'Total item count to display.',
          editorType: 'expression',
        },
      },
    ],
  },
];
