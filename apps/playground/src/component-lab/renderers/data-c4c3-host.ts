import type { RendererEnv } from '@nop-chaos/flux-core';

/**
 * C4.3 Phase 3 host-scenario fetcher state (real-browser probes).
 * Extracted to keep the lab pages within the lint max-lines budget.
 */
let c4c3UserFetchCount = 0;
let c4c3FlakyFailures = 0;

export const c4c3HostEnv = {
  fetcher: async <T,>(api: { url?: string }) => {
    const url = api.url ?? '';
    if (url.includes('/api/c4c3/users')) {
      c4c3UserFetchCount += 1;
      const batch = [
        { id: c4c3UserFetchCount * 2 - 1, username: `User${c4c3UserFetchCount}-A` },
        { id: c4c3UserFetchCount * 2, username: `User${c4c3UserFetchCount}-B` },
      ];
      (window as unknown as { __c4c3UsersProbe?: number }).__c4c3UsersProbe =
        c4c3UserFetchCount;
      return { ok: true, status: 200, data: batch as T };
    }
    if (url.includes('/api/c4c3/flaky')) {
      if (c4c3FlakyFailures < 2) {
        c4c3FlakyFailures += 1;
        return {
          ok: false,
          status: 500,
          error: 'simulated flaky failure',
          data: null,
        } as unknown as T;
      }
      return {
        ok: true,
        status: 200,
        data: [{ id: 9, username: 'FlakyRecovered' }] as T,
      };
    }
    return { ok: true, status: 200, data: null as T };
  },
} as unknown as Partial<RendererEnv>;

export const c4c3OrgTree = [
  {
    id: '1',
    name: 'Engineering',
    children: [
      { id: '1-1', name: 'Frontend', children: [] },
      { id: '1-2', name: 'Backend', children: [] },
      { id: '1-3', name: 'Platform', children: [] },
    ],
  },
  {
    id: '2',
    name: 'Product',
    children: [
      { id: '2-1', name: 'Design', children: [] },
      { id: '2-2', name: 'Research', children: [] },
    ],
  },
];

export const c4c3PagedRecords = Array.from({ length: 6 }, (_, i) => ({
  id: `r${i + 1}`,
  label: `Record ${i + 1}`,
}));

export const c4c3HostSchemas = {
  dsList: {
    type: 'page',
    body: [
      {
        type: 'data-source',
        id: 'c4c3-users-source',
        name: 'users',
        action: 'ajax',
        args: { method: 'get', url: '/api/c4c3/users' },
        initialData: [],
      },
      {
        type: 'list',
        testid: 'c4c3-ds-list',
        items: '${users}',
        item: { type: 'text', text: '${$slot.item.username}' },
      },
      {
        type: 'statistics',
        testid: 'c4c3-ds-statistics',
        total: '${COUNT(users)}',
      },
      {
        type: 'button',
        label: 'Refresh users',
        onClick: { action: 'component:refresh', componentId: 'c4c3-users-source' },
      },
    ],
  },
  dsFail: {
    type: 'page',
    body: [
      {
        type: 'data-source',
        id: 'c4c3-flaky-source',
        name: 'flakyUsers',
        action: 'ajax',
        args: { method: 'get', url: '/api/c4c3/flaky' },
        initialData: [{ id: 0, username: 'InitialUser' }],
        statusPath: 'flakyStatus',
      },
      { type: 'text', text: 'state:${flakyStatus?.hasError ? "failed" : "ok"}' },
      {
        type: 'list',
        testid: 'c4c3-flaky-list',
        items: '${flakyUsers}',
        item: { type: 'text', text: '${$slot.item.username}' },
      },
      {
        type: 'button',
        label: 'Retry load',
        onClick: { action: 'component:refresh', componentId: 'c4c3-flaky-source' },
      },
    ],
  },
  treeSearch: {
    type: 'page',
    body: [
      {
        type: 'tree',
        testid: 'c4c3-tree',
        data: '${orgTree}',
        labelField: 'name',
        keyField: 'id',
        childrenKey: 'children',
        searchable: true,
        initiallyExpanded: false,
      },
      { type: 'text', text: 'Search the org tree' },
    ],
  },
  paginationDrivesList: {
    type: 'page',
    body: [
      {
        type: 'pagination',
        testid: 'c4c3-pager',
        currentPage: 1,
        pageSize: 2,
        total: 6,
        mode: 'with-page-size',
        statusPath: 'pagerState',
      },
      {
        type: 'list',
        testid: 'c4c3-paged-list',
        items: '${records}',
        paginationOwnership: 'controlled',
        pagination: {
          enabled: true,
          mode: 'page',
          pageSize: 2,
          total: 6,
          currentPage: '${pagerState?.currentPage}',
        },
        item: { type: 'text', text: '${$slot.item.label}' },
      },
      { type: 'text', text: 'page:${pagerState?.currentPage}' },
    ],
  },
  chartFlow: {
    type: 'page',
    body: [
      {
        type: 'chart',
        testid: 'c4c3-chart',
        chartType: 'bar',
        title: 'C4C3 chart',
        source: '${chartRows}',
        xAxis: { dataKey: 'name' },
        series: [{ name: 'Value', dataRegionKey: 'value' }],
      },
      {
        type: 'button',
        label: 'Update data',
        onClick: {
          action: 'setValue',
          args: { path: 'chartRows', value: '${chartRows2}' },
        },
      },
      {
        type: 'button',
        label: 'Clear data',
        onClick: {
          action: 'setValue',
          args: { path: 'chartRows', value: [] },
        },
      },
    ],
  },
};
