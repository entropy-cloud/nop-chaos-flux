import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicCrud = {
  type: 'page',
  body: [
    {
      type: 'crud',
      source: '${records}',
      rowKey: 'id',
      columns: [
        { title: 'ID', name: 'id' },
        { title: 'Name', name: 'name', fixed: 'left', width: 160 },
        { title: 'Status', name: 'status', type: 'badge' }
      ],
      toolbar: [
        { type: 'button', label: 'Create' }
      ]
    }
  ]
};

const queryCrud = {
  type: 'page',
  body: [
    {
      type: 'crud',
      source: '${records}',
      rowKey: 'id',
      queryForm: {
        body: [
          { type: 'input-text', name: 'keyword', label: 'Keyword' }
        ]
      },
      footerToolbar: [
        { type: 'text', text: 'Visible rows: ${$crud.itemCount}' }
      ],
      toolbarLayout: {
        header: ['listActions', 'pagination'],
        footer: ['statistics', 'switch-per-page']
      },
      toolbar: [
        { type: 'button', label: 'Refresh' }
      ],
      listActions: [
        { type: 'button', label: 'Delete Selected' }
      ],
      columns: [
        { title: 'ID', name: 'id', fixed: 'left', width: 120 },
        { title: 'Name', name: 'name', width: 180 },
        { title: 'Owner', name: 'owner', width: 160 },
        {
          type: 'operation',
          title: 'Actions',
          label: 'Actions',
          fixed: 'right',
          width: 180,
          buttons: [
            { type: 'button', label: 'Inspect' }
          ]
        }
      ]
    }
  ]
};

const records = [
  { id: 1, name: 'Alpha', status: 'active', owner: 'Alice' },
  { id: 2, name: 'Beta', status: 'draft', owner: 'Bob' },
  { id: 3, name: 'Gamma', status: 'archived', owner: 'Carol' }
];

export function CrudLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Composite data workflow renderer that combines optional query form, toolbar, bulk actions, and table presentation into one owner surface."
      scenarios={[
        {
          title: 'Basic CRUD shell',
          description: 'Minimal CRUD configuration with toolbar and badge-backed status column.',
          schema: basicCrud,
          data: { records }
        },
        {
          title: 'CRUD workflow with query, toolbars, and fixed columns',
          description: 'Shows query-driven workflow, list actions, footer summary, and fixed left/right columns including an operation column.',
          schema: queryCrud,
          data: { records }
        }
      ]}
    />
  );
}
