import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const crudHost = {
  type: 'page',
  body: [
    {
      type: 'crud',
      id: 'labBatchBarCrud',
      selection: true,
      source: [
        { id: '1', name: 'Alice', status: 'active' },
        { id: '2', name: 'Bob', status: 'inactive' },
        { id: '3', name: 'Carol', status: 'active' },
        { id: '4', name: 'Dave', status: 'inactive' },
      ],
      toolbar: [
        {
          type: 'batch-bar',
          testid: 'lab-bar-crud',
          selectionPath: '$crud.selectedRowKeys',
          countTemplate: '已选择 ${count} 项',
          clearTarget: 'labBatchBarCrud',
          actions: [
            {
              type: 'button',
              label: 'Bulk activate',
              variant: 'outline',
              disabled: '${!$crud.hasSelection}',
            },
          ],
        },
      ],
      columns: [
        { name: 'name', label: 'Name' },
        { name: 'status', label: 'Status' },
      ],
    },
  ],
};

const tableHost = {
  type: 'page',
  data: { issueSelection: [] },
  body: [
    {
      type: 'table',
      id: 'labBatchBarTable',
      rowKey: 'id',
      source: [
        { id: 'a', name: 'Issue A', priority: 'high' },
        { id: 'b', name: 'Issue B', priority: 'medium' },
        { id: 'c', name: 'Issue C', priority: 'low' },
        { id: 'd', name: 'Issue D', priority: 'high' },
      ],
      rowSelection: { type: 'checkbox' },
      selectionOwnership: 'scope',
      selectionStatePath: 'issueSelection',
      columns: [
        { name: 'name', label: 'Name' },
        { name: 'priority', label: 'Priority' },
      ],
    },
    {
      type: 'batch-bar',
      testid: 'lab-bar-table',
      selectionPath: 'issueSelection',
      countTemplate: '已选 ${count} 项',
      clearTarget: 'labBatchBarTable',
      actions: [
        {
          type: 'button',
          label: 'Bulk close',
          variant: 'outline',
          disabled: '${!issueSelection || issueSelection.length === 0}',
        },
      ],
    },
  ],
};

const defaultCount = {
  type: 'page',
  body: [
    {
      type: 'table',
      id: 'labBatchBarDefault',
      rowKey: 'id',
      source: [
        { id: 'x', name: 'Item X' },
        { id: 'y', name: 'Item Y' },
      ],
      rowSelection: { type: 'checkbox' },
      selectionOwnership: 'scope',
      selectionStatePath: 'defaultBarSelection',
      columns: [{ name: 'name', label: 'Name' }],
    },
    {
      type: 'batch-bar',
      testid: 'lab-bar-default',
      selectionPath: 'defaultBarSelection',
      clearLabel: 'Deselect all',
    },
  ],
};

export function BatchBarLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Selection-set-driven batch-operation bar: count template, action area, built-in clear, and a built-in non-empty visibility gate. Binds crud ($crud.selectedRowKeys) and table (selectionStatePath) selection sets."
      scenarios={[
        {
          title: 'Crud host ($crud scope contract)',
          description:
            'Nested in crud toolbar. The envelope appears only while rows are selected; Clear resolves the crud clearSelection handle.',
          schema: crudHost,
        },
        {
          title: 'Table host (page-scope selection contract)',
          description:
            'Page-body sibling of a table with scope-owned selection. Clear resolves the table setSelection handle with an empty set.',
          schema: tableHost,
        },
        {
          title: 'Default count text without a template',
          description:
            'Without countTemplate the bar renders the i18n selected-count message; clearLabel renames the built-in clear button.',
          schema: defaultCount,
        },
      ]}
    />
  );
}
