import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import type { RendererEnv } from '@nop-chaos/flux-core';

const sortableTextTable = {
  type: 'page',
  body: [
    {
      type: 'table',
      source: '${users}',
      rowKey: 'id',
      columns: [
        { label: 'ID', name: 'id', sortable: true },
        { label: 'Username', name: 'username', sortable: true },
        { label: 'Email', name: 'email' },
        { label: 'Role', name: 'role' },
      ],
      stripe: true,
    },
  ],
};

const emptyTable = {
  type: 'page',
  body: [
    {
      type: 'table',
      source: '${users}',
      rowKey: 'id',
      columns: [
        { label: 'ID', name: 'id' },
        { label: 'Username', name: 'username' },
        { label: 'Email', name: 'email' },
        { label: 'Role', name: 'role' },
      ],
      empty: 'No users found. Try adjusting your search filters.',
    },
  ],
};

const searchableFilterableTable = {
  type: 'page',
  body: [
    {
      type: 'table',
      source: '${users}',
      rowKey: 'id',
      columns: [
        { label: 'Username', name: 'username', searchable: true },
        {
          label: 'Role',
          name: 'role',
          filterable: {
            options: [
              { label: 'admin', value: 'admin' },
              { label: 'editor', value: 'editor' },
              { label: 'viewer', value: 'viewer' },
            ],
          },
        },
        { label: 'Email', name: 'email' },
      ],
    },
  ],
};

const responsiveExpandTable = {
  type: 'page',
  body: [
    {
      type: 'table',
      source: '${users}',
      rowKey: 'id',
      responsive: {
        mode: 'expand',
        breakpoint: 1400,
        expandTrigger: 'row',
      },
      columns: [
        { label: 'Username', name: 'username', fixed: 'left', width: 160 },
        { label: 'Email', name: 'email' },
        { label: 'Role', name: 'role' },
        { label: 'Team', name: 'team' },
      ],
    },
  ],
};

const userData = [
  { id: 1, username: 'alice', email: 'alice@example.com', role: 'admin', team: 'Platform' },
  { id: 2, username: 'bob', email: 'bob@example.com', role: 'editor', team: 'Design' },
  { id: 3, username: 'carol', email: 'carol@example.com', role: 'viewer', team: 'Ops' },
  { id: 4, username: 'dave', email: 'dave@example.com', role: 'viewer', team: 'Ops' },
  { id: 5, username: 'eve', email: 'eve@example.com', role: 'editor', team: 'Platform' },
];

/**
 * C4.1 Phase 3 host scenarios (real browser, bug 73 pattern):
 *
 * 1. host-table-qe — quick-edit inline writeback → quickSaveItemAction dispatch
 *    with the EDITED row record (row-scope pollution re-verify) → submit echo.
 * 2. host-table-lazy — tree lazy children load, failure, retry (P1-3 proof),
 *    then submit echo with the loaded child count.
 * 3. host-table-sel — row selection + select-all + pagination echo.
 */
let lazyFailFirst = true;

const tableHostEnv = {
  fetcher: async <T,>(api: { url?: string; data?: unknown }) => {
    const url = api.url ?? '';
    if (url.includes('/api/c4/quick-save')) {
      (window as unknown as { __c4QuickEditProbe?: unknown }).__c4QuickEditProbe = api.data;
      return { ok: true, status: 200, data: api.data as T };
    }
    if (url.includes('/api/c4/children')) {
      if (lazyFailFirst) {
        lazyFailFirst = false;
        return {
          ok: false,
          status: 500,
          error: 'simulated failure',
          data: null,
        } as unknown as T;
      }
      return {
        ok: true,
        status: 200,
        data: [{ id: '1-1', name: 'Lazy Child', __rowKey: '1-1' }] as unknown as T,
      };
    }
    return { ok: true, status: 200, data: null as T };
  },
} as unknown as Partial<RendererEnv>;

const quickEditTable = {
  type: 'page',
  body: [
    {
      type: 'table',
      source: '${users}',
      rowKey: 'id',
      quickSaveItemAction: {
        action: 'ajax',
        args: { url: '/api/c4/quick-save', data: { username: '${$slot.record.username}', id: '${$slot.record.id}' } },
      },
      columns: [
        { label: 'ID', name: 'id', width: 80 },
        { label: 'Username', name: 'username', quickEdit: true },
        { label: 'Role', name: 'role' },
      ],
    },
  ],
};

const lazyTreeTable = {
  type: 'page',
  body: [
    {
      type: 'table',
      source: '${treeUsers}',
      rowKey: 'id',
      rowChildrenField: 'children',
      childrenSource: {
        action: 'ajax',
        args: { url: '/api/c4/children' },
      },
      columns: [{ label: 'Name', name: 'name' }],
    },
  ],
};

const selectionPaginationTable = {
  type: 'page',
  body: [
    {
      type: 'table',
      source: '${pagedUsers}',
      rowKey: 'id',
      pagination: { enabled: true, pageSize: 2 },
      rowSelection: { type: 'checkbox' },
      onSelectionChange: {
        action: 'toast:echo',
      },
      columns: [{ label: 'ID', name: 'id', width: 80 }, { label: 'Name', name: 'username' }],
    },
  ],
};

const pagedUserData = Array.from({ length: 7 }, (_, i) => ({
  id: i + 1,
  username: `user-${i + 1}`,
}));

export function TableLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Data table with configurable columns, sorting, pagination, selection, and empty-state handling."
      scenarios={[
        {
          title: 'Table with sortable text columns',
          description:
            'The ID and Username columns are sortable. Rows render directly from the table source array.',
          schema: sortableTextTable,
          data: { users: userData },
        },
        {
          title: 'Empty state scenario',
          description: 'When data is an empty array, the table shows the configured empty content.',
          schema: emptyTable,
          data: { users: [] },
        },
        {
          title: 'Header search and filter controls',
          description:
            'Shows the current Phase 3 baseline for column-level search/filter menus, including active-state trigger styling and clear-all per-column reset.',
          schema: searchableFilterableTable,
          data: { users: userData },
        },
        {
          title: 'Responsive expand baseline',
          description:
            'Shows the first responsive more-columns baseline: below the configured breakpoint, the primary column stays in the main row while secondary columns move into an expandable detail row triggered by row click.',
          schema: responsiveExpandTable,
          data: { users: userData },
        },
        {
          title: 'Host table quick edit + save + echo (bug 73 pattern)',
          description:
            'C4.1 Phase 3: inline quick edit writes back to the row scope, quickSaveItemAction receives the EDITED record (row-scope pollution re-verify), and the submit button echoes the probe.',
          schema: quickEditTable,
          data: { users: userData },
          env: tableHostEnv,
        },
        {
          title: 'Host tree lazy children fail + retry (P1-3)',
          description:
            'C4.1 Phase 3: expanding the root node fails once (error toggle with retry affordance); clicking retry reloads and renders the lazy child. Re-expanding reuses the cache.',
          schema: lazyTreeTable,
          data: {
            treeUsers: [{ id: '1', name: 'Parent' }],
          },
          env: tableHostEnv,
        },
        {
          title: 'Host selection + pagination echo',
          description:
            'C4.1 Phase 3: checkbox row selection with select-all, pagination (pageSize 2), and selection-change echo via toast.',
          schema: selectionPaginationTable,
          data: { pagedUsers: pagedUserData },
          env: tableHostEnv,
        },
      ]}
    />
  );
}
