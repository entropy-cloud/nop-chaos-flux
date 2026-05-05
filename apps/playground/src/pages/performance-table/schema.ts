import type { SchemaInput } from '@nop-chaos/flux-core';
import type { PerformanceMode } from './types.js';

type ColumnDef = {
  type?: string;
  label?: string;
  name?: string;
  sortable?: boolean;
  cell?: SchemaInput;
  buttons?: SchemaInput[];
};

const TABLE_COLUMNS: ColumnDef[] = [
  {
    label: 'Profile',
    name: 'username',
    sortable: true,
    cell: {
      type: 'text',
      text: '${$slot.record.index}. ${$slot.record.username} <${$slot.record.email}>',
    },
  },
  {
    label: 'Role Badge',
    name: 'role',
    sortable: true,
    cell: {
      type: 'badge',
      text: '${$slot.record.role}',
      level:
        '${$slot.record.role === "admin" ? "success" : ($slot.record.role === "editor" ? "warning" : "info")}',
    },
  },
  {
    label: 'Status',
    name: 'status',
    sortable: true,
    cell: {
      type: 'text',
      text: '${$slot.record.active ? "ACTIVE" : "PAUSED"} / ${$slot.record.status}',
    },
  },
  {
    label: 'Region Select',
    name: 'region',
    sortable: true,
    cell: {
      type: 'select',
      name: '$slot.record.region',
      options: [
        { label: 'APAC', value: 'apac' },
        { label: 'EMEA', value: 'emea' },
        { label: 'AMER', value: 'amer' },
      ],
    },
  },
  {
    label: 'Verified',
    name: 'verified',
    sortable: true,
    cell: {
      type: 'checkbox',
      name: '$slot.record.verified',
      option: 'Verified',
    },
  },
  {
    label: 'Enabled',
    name: 'active',
    sortable: true,
    cell: {
      type: 'switch',
      name: '$slot.record.active',
    },
  },
  {
    label: 'Notes',
    name: 'notes',
    cell: {
      type: 'textarea',
      name: '$slot.record.notes',
      minRows: 2,
      maxRows: 4,
    },
  },
  {
    label: 'Tags',
    name: 'tagsText',
    cell: {
      type: 'tag-list',
      name: '$slot.record.tags',
      tags: [
        'tag-0',
        'tag-1',
        'tag-2',
        'tag-3',
        'tag-4',
        'grp-0',
        'grp-1',
        'grp-2',
        'grp-3',
        'grp-4',
        'grp-5',
        'grp-6',
        'admin',
        'editor',
        'viewer',
      ],
    },
  },
  {
    label: 'Score',
    name: 'score',
    sortable: true,
    cell: {
      type: 'radio-group',
      name: '$slot.record.scoreBand',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Mid', value: 'mid' },
        { label: 'High', value: 'high' },
      ],
    },
  },
  {
    type: 'operation',
    label: 'Actions',
    buttons: [
      {
        type: 'button',
        label: 'Ping',
        size: 'sm',
        onClick: {
          action: 'setValue',
          args: {
            path: 'perfState.lastAction',
            value: 'ping:${$slot.record.id}:${$slot.record.status}',
          },
        },
      },
    ],
  },
];

const HEADER_SCHEMA: SchemaInput = {
  type: 'container',
  className: 'stack-sm',
  body: [
    { type: 'text', text: 'Performance Table Playground', className: 'text-2xl font-semibold' },
    {
      type: 'text',
      text: '1000-row dataset rendered through a paged mixed-renderer table plus attributable stress scenarios for sorting, selection, expanded rows, looped cell rendering, and broad row-scope updates.',
    },
    {
      type: 'text',
      text: 'Total: ${perfRows.length} rows | Selected: ${perfState.selectedKeys ? perfState.selectedKeys.length : 0} | Page: ${perfState.pagination.currentPage}',
    },
  ],
};

const ACTIONS_SCHEMA: SchemaInput = {
  type: 'container',
  className: 'hstack-sm flex-wrap',
  body: [
    {
      type: 'button',
      label: 'Shuffle Scores',
      onClick: {
        action: 'setValue',
        args: {
          path: 'perfRows',
          value:
            '${perfRows.map((row, idx) => ({ ...row, score: ((row.score + idx + 13) % 100) + 1, scoreBand: ((row.score + idx + 13) % 100) + 1 < 60 ? "low" : (((row.score + idx + 13) % 100) + 1 < 85 ? "mid" : "high"), progress: ((row.progress + idx + 17) % 100) }))}',
        },
      },
    },
    {
      type: 'button',
      label: 'Toggle Active Flags',
      onClick: {
        action: 'setValue',
        args: {
          path: 'perfRows',
          value:
            '${perfRows.map((row, idx) => idx % 3 === 0 ? { ...row, active: !row.active, verified: !row.verified } : row)}',
        },
      },
    },
    {
      type: 'button',
      label: 'Append Tag To All Rows',
      onClick: {
        action: 'setValue',
        args: {
          path: 'perfRows',
          value:
            '${perfRows.map((row, idx) => ({ ...row, tags: [...row.tags, "burst-" + (idx % 4)], tagsText: [...row.tags, "burst-" + (idx % 4)].join(", ") }))}',
        },
      },
    },
    {
      type: 'button',
      label: 'Reset Dataset',
      onClick: {
        action: 'setValue',
        args: {
          path: 'perfRows',
          value: '${initialPerfRows}',
        },
      },
    },
  ],
};

const TABLE_SCHEMA: SchemaInput = {
  type: 'table',
  id: 'perf-mixed-table',
  source: '${perfRows}',
  rowKey: 'id',
  bordered: true,
  stripe: true,
  selectionOwnership: 'scope',
  selectionStatePath: 'perfState.selectedKeys',
  paginationOwnership: 'scope',
  paginationStatePath: 'perfState.pagination',
  pagination: {
    currentPage: '${perfState.pagination.currentPage}',
    pageSize: '${perfState.pagination.pageSize}',
    pageSizeOptions: [25, 50, 100, 250],
    showSizeChanger: true,
  },
  rowSelection: {
    type: 'checkbox',
    selectedRowKeys: '${perfState.selectedKeys || []}',
  },
  expandable: {
    expandedRowKeys: ['user-1', 'user-2', 'user-3'],
    expandedRowRegionKey: 'expanded',
  },
  columns: TABLE_COLUMNS,
  expanded: {
    type: 'container',
    className: 'stack-sm py-3',
    body: [
      {
        type: 'text',
        text: 'Expanded ${username} | tags=${tags.length} | children=${children.length}',
      },
      {
        type: 'loop',
        items: '${children}',
        itemName: 'child',
        body: {
          type: 'text',
          text: '${$slot.child.label}: ${$slot.child.value}',
        },
      },
    ],
  },
};

const STRESS_SCENARIOS: SchemaInput[] = [
  {
    type: 'container',
    className: 'stack-sm border rounded-lg p-4',
    body: [
      { type: 'text', text: 'Scenario A: Broad aggregate watchers', className: 'font-semibold' },
      {
        type: 'text',
      text: 'Exercises wide formulas over the full 1000-row dataset to expose broad-access and full-scan costs on top of the paged visible table baseline.',
      },
      { type: 'text', text: 'Total active rows: ${perfRows.filter(row => row.active).length}' },
      {
        type: 'text',
        text: 'Average score: ${Math.round(perfRows.reduce((sum, row) => sum + row.score, 0) / perfRows.length)}',
      },
      {
        type: 'text',
        text: 'Tag fanout: ${perfRows.reduce((sum, row) => sum + row.tags.length, 0)}',
      },
    ],
  },
  {
    type: 'container',
    className: 'stack-sm border rounded-lg p-4',
    body: [
      {
        type: 'text',
        text: 'Scenario A2: Scope read / full snapshot stress',
        className: 'font-semibold',
      },
      {
        type: 'text',
        text: 'Forces broad scope materialization and JSON serialization through `scope-debug`, which is closer to `scope.read()` hot paths than narrow path-based formulas. Treat this as debug/perf stress, not an authoritative render benchmark.',
      },
      {
        type: 'scope-debug',
        title: 'Full Perf Scope Snapshot',
        className: 'max-h-[280px] overflow-auto text-xs',
      },
    ],
  },
];

const FULL_STRESS_SCENARIOS: SchemaInput[] = [
  {
    type: 'container',
    className: 'stack-sm border rounded-lg p-4',
    body: [
      { type: 'text', text: 'Scenario B: Nested loop card list', className: 'font-semibold' },
      {
        type: 'text',
        text: 'Exercises repeated child scopes outside the paged table using nested list rendering.',
      },
      {
        type: 'loop',
        items: '${perfRows.slice(0, 24)}',
        itemName: 'row',
        body: {
          type: 'container',
          className: 'stack-xs border rounded-md p-3',
          body: [
            {
              type: 'text',
              text: '${$slot.row.username} / ${$slot.row.region} / ${$slot.row.status}',
            },
            {
              type: 'loop',
              items: '${$slot.row.children}',
              itemName: 'child',
              body: { type: 'text', text: '${$slot.child.label}: ${$slot.child.value}' },
            },
          ],
        },
      },
    ],
  },
  {
    type: 'container',
    className: 'stack-sm border rounded-lg p-4',
    body: [
      {
        type: 'text',
        text: 'Scenario C: Scope-owned selection and pagination',
        className: 'font-semibold',
      },
      {
        type: 'text',
        text: 'Exercises table state stored in scope to surface selection/pagination update churn.',
      },
      {
        type: 'text',
        text: 'Selected keys: ${perfState.selectedKeys ? perfState.selectedKeys.join(", ") : "none"}',
      },
      { type: 'text', text: 'Current page size: ${perfState.pagination.pageSize}' },
      { type: 'text', text: 'Last action: ${perfState.lastAction || "none"}' },
    ],
  },
  {
    type: 'container',
    className: 'stack-sm border rounded-lg p-4',
    body: [
      { type: 'text', text: 'Scenario D: Editable subset form', className: 'font-semibold' },
      {
        type: 'text',
        text: 'Exercises many mounted controlled fields at once without virtualization on top of the same page baseline.',
      },
      {
        type: 'form',
        name: 'perfInlineForm',
        data: '${perfRows.slice(0, 8)}',
        body: [
          {
            type: 'array-field',
            name: '',
            item: [
              { type: 'input-text', name: 'username', label: 'User' },
              { type: 'input-email', name: 'email', label: 'Email' },
              { type: 'switch', name: 'active', label: 'Active' },
              { type: 'textarea', name: 'notes', label: 'Notes' },
            ],
          },
        ],
      },
    ],
  },
];

export function createPerformanceSchema(mode: PerformanceMode): SchemaInput {
  const body: SchemaInput[] = [HEADER_SCHEMA, ACTIONS_SCHEMA, TABLE_SCHEMA];

  if (mode !== 'table-only') {
    const scenarios =
      mode === 'full-stress' ? [STRESS_SCENARIOS[0], ...FULL_STRESS_SCENARIOS] : STRESS_SCENARIOS;

    body.push({
      type: 'container',
      className: 'grid gap-6 lg:grid-cols-2',
      body: scenarios,
    });
  }

  return {
    type: 'page',
    className: 'stack-lg p-6',
    body,
  };
}
