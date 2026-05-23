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

type DiagnosticsProbeSlots = {
  tableTargetRowKey: string;
  tablePrevSiblingRowKey: string;
  tableNextSiblingRowKey: string;
  arrayTargetItemKey: string;
  arrayPrevSiblingItemKey: string;
  arrayNextSiblingItemKey: string;
};

type PerformanceSchemaOptions = {
  diagnosticsEnabled?: boolean;
  probes?: DiagnosticsProbeSlots;
};

function equalsRecordId(rowKey: string): string {
  return '${$slot.record.id === "' + rowKey + '"}';
}

function equalsItemKey(itemKey: string): string {
  return '${$slot.value.itemKey === "' + itemKey + '"}';
}

function createProfileCell(options: PerformanceSchemaOptions): SchemaInput {
  const probes = options.probes;
  if (!options.diagnosticsEnabled || !probes) {
    return {
      type: 'text',
      text: '${$slot.record.index}. ${$slot.record.username} <${$slot.record.email}>',
    };
  }

  return {
    type: 'container',
    className: 'stack-xs',
    body: [
      {
        type: 'perf-render-probe',
        probeKey: 'table-target-row',
        testid: 'table-target-row-probe',
        trackedValue: '${$slot.record.username}',
        visible: equalsRecordId(probes.tableTargetRowKey),
      },
      {
        type: 'perf-render-probe',
        probeKey: 'table-prev-sibling-row',
        testid: 'table-prev-sibling-row-probe',
        trackedValue: '${$slot.record.username}',
        visible: equalsRecordId(probes.tablePrevSiblingRowKey),
      },
      {
        type: 'perf-render-probe',
        probeKey: 'table-next-sibling-row',
        testid: 'table-next-sibling-row-probe',
        trackedValue: '${$slot.record.username}',
        visible: equalsRecordId(probes.tableNextSiblingRowKey),
      },
      {
        type: 'text',
        text: '${$slot.record.index}. ${$slot.record.username} <${$slot.record.email}>',
      },
    ],
  };
}

function createTableColumns(options: PerformanceSchemaOptions): ColumnDef[] {
  return [
    {
      label: 'Profile',
      name: 'username',
      sortable: true,
      cell: createProfileCell(options),
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
      buttons: [{ type: 'perf-ping-button', label: 'Ping', size: 'sm' }],
    },
  ];
}

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
        args: { path: 'perfRows', value: '${initialPerfRows}' },
      },
    },
  ],
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
        text:
          'Average score: ${INT((perfRows.reduce((sum, row) => sum + row.score, 0) / perfRows.length) + 0.5)}',
      },
      { type: 'text', text: 'Tag fanout: ${perfRows.reduce((sum, row) => sum + row.tags.length, 0)}' },
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
        defaultExpand: true,
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
            { type: 'text', text: '${$slot.row.username} / ${$slot.row.region} / ${$slot.row.status}' },
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
        text:
          'Selected keys: ${perfState.selectedKeys && perfState.selectedKeys.length ? perfState.selectedKeys.join(", ") : "none"}',
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
        data: { rows: '${perfRows.slice(0, 8)}' },
        body: [
          {
            type: 'array-field',
            name: 'rows',
            itemKind: 'object',
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

function createArrayDiagnosticsScenario(options: PerformanceSchemaOptions): SchemaInput | null {
  const probes = options.probes;
  if (!options.diagnosticsEnabled || !probes) {
    return null;
  }

  return {
    type: 'container',
    className: 'stack-sm border rounded-lg p-4',
    body: [
      { type: 'text', text: 'Diagnostics Array Scenario', className: 'font-semibold' },
      {
        type: 'text',
        text: 'Object-array locality gate for visible item rerender/remount behavior. Validation and writeback remain index-addressed.',
      },
      {
        type: 'form',
        name: 'perfDiagnosticsForm',
        data: { lineItems: '${lineItems}' },
        body: [
          {
            type: 'perf-form-runtime-probe',
          },
          {
            type: 'array-field',
            name: 'lineItems',
            itemKind: 'object',
            itemKey: 'itemKey',
            addable: false,
            removable: false,
            item: [
              {
                type: 'container',
                className: 'grid gap-3 md:grid-cols-3',
                body: [
                  {
                    type: 'container',
                    className: 'stack-xs',
                    body: [
                      {
                        type: 'perf-render-probe',
                        probeKey: 'array-target-item',
                        testid: 'array-target-item-probe',
                        trackedValue: '${$slot.value.qty}',
                        visible: equalsItemKey(probes.arrayTargetItemKey),
                      },
                      {
                        type: 'perf-render-probe',
                        probeKey: 'array-prev-sibling-item',
                        testid: 'array-prev-sibling-item-probe',
                        trackedValue: '${$slot.value.qty}',
                        visible: equalsItemKey(probes.arrayPrevSiblingItemKey),
                      },
                      {
                        type: 'perf-render-probe',
                        probeKey: 'array-next-sibling-item',
                        testid: 'array-next-sibling-item-probe',
                        trackedValue: '${$slot.value.qty}',
                        visible: equalsItemKey(probes.arrayNextSiblingItemKey),
                      },
                      { type: 'input-text', name: 'sku', label: 'SKU', readOnly: true },
                    ],
                  },
                  { type: 'input-number', name: 'qty', label: 'Qty' },
                  { type: 'textarea', name: 'note', label: 'Note', minRows: 2, maxRows: 3 },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

export function createPerformanceSchema(
  mode: PerformanceMode,
  options: PerformanceSchemaOptions = {},
): SchemaInput {
  const body: SchemaInput[] = [
    HEADER_SCHEMA,
    ACTIONS_SCHEMA,
    {
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
        expandedRow: {
          type: 'container',
          className: 'stack-sm py-3',
          body: [
            {
              type: 'text',
              text:
                'Expanded ${$slot.record.username} | tags=${$slot.record.tags.length} | children=${$slot.record.children.length}',
            },
            {
              type: 'loop',
              items: '${$slot.record.children}',
              itemName: 'child',
              body: { type: 'text', text: '${$slot.child.label}: ${$slot.child.value}' },
            },
          ],
        },
      },
      columns: createTableColumns(options),
    },
  ];

  if (options.diagnosticsEnabled) {
    body.push({
      type: 'container',
      className: 'stack-sm border rounded-lg p-4',
      body: [
        { type: 'text', text: 'Diagnostics mode is enabled.', className: 'font-semibold' },
        {
          type: 'text',
          text: 'This mode installs page-local render probes and debugger-backed structured reports for Playwright locality gates.',
        },
      ],
    });
  }

  if (mode !== 'table-only') {
    const scenarios =
      mode === 'full-stress' ? [STRESS_SCENARIOS[0], ...FULL_STRESS_SCENARIOS] : STRESS_SCENARIOS;
    body.push({
      type: 'container',
      className: 'grid gap-6 lg:grid-cols-2',
      body: scenarios,
    });
  }

  const arrayDiagnosticsScenario = createArrayDiagnosticsScenario(options);
  if (arrayDiagnosticsScenario) {
    body.push(arrayDiagnosticsScenario);
  }

  return {
    type: 'page',
    className: 'stack-lg p-6',
    body,
  };
}
