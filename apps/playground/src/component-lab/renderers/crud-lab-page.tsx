import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicCrud = {
  type: 'page',
  body: [
    {
      type: 'crud',
      data: '${records}',
      rowKey: 'id',
      columns: [
        { title: 'ID', name: 'id' },
        { title: 'Name', name: 'name' },
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
      data: '${records}',
      rowKey: 'id',
      queryForm: {
        type: 'form',
        body: [
          { type: 'input-text', name: 'keyword', label: 'Keyword' }
        ]
      },
      toolbar: [
        { type: 'button', label: 'Refresh' }
      ],
      bulkActions: [
        { type: 'button', label: 'Delete Selected' }
      ],
      columns: [
        { title: 'ID', name: 'id' },
        { title: 'Name', name: 'name' },
        { title: 'Owner', name: 'owner' }
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
          title: 'CRUD with query form and bulk actions',
          description: 'Shows the full shell shape: query form, toolbar, bulk actions, and table body in one renderer.',
          schema: queryCrud,
          data: { records }
        }
      ]}
    />
  );
}
