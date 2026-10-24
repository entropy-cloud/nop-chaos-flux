import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { ListRenderer } from './list-renderer.js';

/**
 * RM-5 (plan 607) sibling-extraction precedent (wizard-renderer-definition /
 * w2a-data-composition-definitions): the list definition's absorbed event
 * contracts pushed `data-renderer-definitions.ts` past the 700-line lint cap.
 */
export const listRendererDefinition: RegisteredRendererDefinition = {
  type: 'list',
  displayName: 'List',
  category: 'data',
  sourcePackage: '@nop-chaos/flux-renderers-data',
  component: ListRenderer,
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
    {
      key: 'items',
      kind: 'prop',
      contract: {
        shape: { kind: 'array', item: { kind: 'unknown' } },
        displayName: 'Items',
        description:
          'The single collection field: the array of records rendered through the item region.',
        editorType: 'expression',
      },
    },
    {
      key: 'selectionMode',
      kind: 'prop',
      contract: {
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
    },
    {
      key: 'keyField',
      kind: 'prop',
      contract: {
        shape: { kind: 'string' },
        displayName: 'Key Field',
        description:
          'Field used to derive a stable per-item key for selection and React reconciliation. Falls back to the item index when absent.',
        editorType: 'expression',
        defaultValue: 'id',
      },
    },
    {
      key: 'optionRow',
      kind: 'prop',
      contract: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Option Row',
        description:
          'Interaction-state channel for rows: `value` selected-value binding (owner scope, array = any-match), `valueField` compared item field (default keyField), `selectedClass` schema class for the selected state. Emits data-option-row / data-state / data-selected / aria-selected markers; absent optionRow keeps legacy output.',
        editorType: 'object',
      },
    },
    {
      key: 'pagination',
      kind: 'prop',
      contract: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Pagination',
        description:
          'Pagination / infinite-scroll configuration. Opt-in via enabled. List never owns a request: data flows via onPageChange/onLoadMore → action graph → data-source → scope items (request-sink).',
        editorType: 'object',
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
        description:
          'Where pagination interaction state lives. local = list holds currentPage; controlled = pure view driven by pagination.currentPage; scope = read/write paginationStatePath.',
        editorType: 'select',
        defaultValue: 'local',
      },
    },
    {
      key: 'paginationStatePath',
      kind: 'prop',
      contract: {
        shape: { kind: 'string' },
        displayName: 'Pagination State Path',
        description:
          'Scope path holding { currentPage, pageSize } for scope ownership. Missing path degrades with a dev warning (no crash).',
        editorType: 'expression',
      },
    },
    {
      key: 'pageSizeStatePath',
      kind: 'prop',
      contract: {
        shape: { kind: 'string' },
        displayName: 'Page Size State Path',
        description: 'Optional separate scope path for pageSize (scope ownership).',
        editorType: 'expression',
      },
    },
    {
      key: 'onItemClick',
      kind: 'event',
      contract: {
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
    },
    {
      key: 'onSelectionChange',
      kind: 'event',
      contract: {
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
    },
    {
      key: 'reorderable',
      kind: 'prop',
      valueType: 'boolean',
      contract: {
        shape: { kind: 'boolean' },
        displayName: 'Reorderable',
        description:
          'Drag-reorder switch (defaults to false). Gated: requires stable explicit keys, non-paged pagination, and no windowing — violations disable reorder with a dev warning (design.md §4).',
        editorType: 'switch',
        defaultValue: false,
      },
    },
    {
      key: 'onReorder',
      kind: 'event',
      contract: {
        displayName: 'On Reorder',
        description:
          'Dispatched after a reorder drop or keyboard move. Payload: { type, items, keys }. Host writes scope `items` back (design.md §8).',
        payload: {
          kind: 'object',
          fields: {
            type: { kind: 'string' },
            items: { kind: 'array', item: { kind: 'unknown' } },
            keys: { kind: 'array', item: { kind: 'string' } },
          },
        },
      },
    },
    {
      key: 'onPageChange',
      kind: 'event',
      contract: {
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
    },
    {
      key: 'onLoadMore',
      kind: 'event',
      contract: {
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
    { key: 'item', kind: 'region', params: ['item', 'index'], isolate: false },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
  ],
};
