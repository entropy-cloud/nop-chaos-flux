import type { RendererEnv } from '@nop-chaos/flux-core';

/**
 * C4.2 Phase 3 host-scenario fetcher state (real-browser probes).
 * Extracted to keep crud-lab-page.tsx within the lint max-lines budget.
 */
let c4c2FlakyFailures = 0;

export const c4c2HostEnv = {
  fetcher: async <T,>(api: { url?: string; data?: unknown; params?: unknown }) => {
    const url = api.url ?? '';
    if (url.includes('/api/c4c2/quick-save')) {
      (window as unknown as { __c4c2QuickEditProbe?: unknown }).__c4c2QuickEditProbe = api.data;
      return { ok: true, status: 200, data: api.data as T };
    }
    if (url.includes('/api/c4c2/load')) {
      const data = (api.data ?? {}) as { keyword?: string };
      const keyword = data.keyword;
      const loadWin = window as unknown as {
        __c4c2LoadProbe?: Array<{ data: unknown; params: unknown }>;
      };
      loadWin.__c4c2LoadProbe = (loadWin.__c4c2LoadProbe ?? []).concat([
        { data: api.data, params: api.params },
      ]);
      return {
        ok: true,
        status: 200,
        data: {
          items: keyword
            ? [{ id: 'q1', name: `Found-${keyword}`, status: 'active' }]
            : [{ id: 'r1', name: 'AllRows', status: 'active' }],
          total: keyword ? 1 : 3,
        } as T,
      };
    }
    if (url.includes('/api/c4c2/include')) {
      (window as unknown as { __c4c2IncludeScopeProbe?: unknown }).__c4c2IncludeScopeProbe =
        api.data;
      return {
        ok: true,
        status: 200,
        data: { items: [{ id: 'i1', name: 'IncludeItem', status: 'active' }], total: 1 } as T,
      };
    }
    if (url.includes('/api/c4c2/flaky')) {
      if (c4c2FlakyFailures < 2) {
        c4c2FlakyFailures += 1;
        return {
          ok: false,
          status: 500,
          error: 'simulated load failure',
          data: null,
        } as unknown as T;
      }
      return {
        ok: true,
        status: 200,
        data: { items: [{ id: 'f1', name: 'RecoveredRow', status: 'active' }], total: 1 } as T,
      };
    }
    return { ok: true, status: 200, data: null as T };
  },
} as unknown as Partial<RendererEnv>;

export const c4c2HostSchemas = {
  quickEdit: {
    type: 'page',
    body: [
      {
        type: 'crud',
        id: 'c4c2-quick-edit',
        source: '${records}',
        rowKey: 'id',
        quickSaveItemAction: {
          action: 'ajax',
          args: {
            url: '/api/c4c2/quick-save',
            data: { name: '${$slot.record.name}', id: '${$slot.record.id}' },
          },
        },
        columns: [
          { label: 'ID', name: 'id', width: 80 },
          { label: 'Name', name: 'name', quickEdit: true },
          { label: 'Status', name: 'status' },
        ],
      },
    ],
  },
  queryLoad: {
    type: 'page',
    body: [
      {
        type: 'crud',
        id: 'c4c2-query-load',
        loadAction: {
          action: 'ajax',
          args: { url: '/api/c4c2/load', data: { keyword: '${query.keyword}' } },
        },
        queryForm: {
          body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
        },
        footerToolbar: [{ type: 'text', text: 'Query: ${$crud.query.keyword || "none"}' }],
        columns: [
          { label: 'ID', name: 'id' },
          { label: 'Name', name: 'name' },
          { label: 'Status', name: 'status' },
        ],
      },
    ],
  },
  includeScope: {
    type: 'page',
    body: [
      {
        type: 'crud',
        id: 'c4c2-include',
        loadAction: {
          action: 'ajax',
          args: { url: '/api/c4c2/include', includeScope: '*' },
        },
        footerToolbar: [{ type: 'text', text: 'Total: ${$crud.total}' }],
        columns: [
          { label: 'ID', name: 'id' },
          { label: 'Name', name: 'name' },
        ],
      },
    ],
  },
  flakyLoad: {
    type: 'page',
    body: [
      {
        type: 'crud',
        id: 'c4c2-flaky',
        loadAction: { action: 'ajax', args: { url: '/api/c4c2/flaky' } },
        toolbar: [
          {
            type: 'button',
            label: 'Refresh list',
            onClick: {
              action: 'component:refresh',
              componentId: 'c4c2-flaky',
            },
          },
        ],
        footerToolbar: [{ type: 'text', text: 'Total: ${$crud.total}' }],
        columns: [
          { label: 'ID', name: 'id' },
          { label: 'Name', name: 'name' },
        ],
      },
    ],
  },
  pagingSortSelection: {
    type: 'page',
    body: [
      {
        type: 'crud',
        id: 'c4c2-paging',
        source: '${pagedRecords}',
        rowKey: 'id',
        selection: { keepOnPageChange: true },
        pagination: { mode: 'pages' },
        footerToolbar: [
          {
            type: 'text',
            text: 'Page: ${$crud.pagination.currentPage}; Sort: ${$crud.sort.column || "none"}; Sel: ${$crud.selectionCount}',
          },
        ],
        columns: [
          { label: 'Name', name: 'name', sortable: true },
          { label: 'Owner', name: 'owner' },
        ],
      },
    ],
  },
};
