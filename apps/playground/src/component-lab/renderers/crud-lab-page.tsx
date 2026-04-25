import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicCrud = {
  type: 'page',
  body: [
    {
      type: 'crud',
      source: '${records}',
      rowKey: 'id',
      columns: [
        { label: 'ID', name: 'id' },
        { label: 'Name', name: 'name', fixed: 'left', width: 160 },
        { label: 'Status', name: 'status' }
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
      columnSettings: {
        enabled: true,
        overlay: false,
        align: 'left'
      },
      columns: [
        { label: 'ID', name: 'id', fixed: 'left', width: 120 },
        { label: 'Name', name: 'name', width: 180, searchable: true },
        {
          label: 'Owner',
          name: 'owner',
          width: 160,
          filterable: {
            options: [
              { label: 'Alice', value: 'Alice' },
              { label: 'Bob', value: 'Bob' },
              { label: 'Carol', value: 'Carol' }
            ]
          }
        },
        {
          type: 'operation',
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

const responsiveCrud = {
  type: 'page',
  body: [
    {
      type: 'crud',
      source: '${records}',
      rowKey: 'id',
      responsive: {
        mode: 'expand',
        breakpoint: 1400,
        expandTrigger: 'row'
      },
      columns: [
        { label: 'Name', name: 'name', fixed: 'left', width: 180 },
        { label: 'Status', name: 'status' },
        { label: 'Owner', name: 'owner' },
        { label: 'Category', name: 'category' }
      ]
    }
  ]
};

const sourceResultCrud = {
  type: 'page',
  body: [
    {
      type: 'crud',
      source: '${pagedRecords}',
      rowKey: 'id',
      queryForm: {
        body: [
          { type: 'input-text', name: 'keyword', label: 'Keyword' }
        ]
      },
      footerToolbar: [
        { type: 'text', text: 'Visible rows: ${$crud.itemCount}; Total: ${$crud.total}' }
      ],
      columns: [
        { label: 'Name', name: 'name' },
        { label: 'Owner', name: 'owner' },
        { label: 'Status', name: 'status' }
      ]
    }
  ]
};

const records = [
  { id: 1, name: 'Alpha', status: 'active', owner: 'Alice', category: 'Platform' },
  { id: 2, name: 'Beta', status: 'draft', owner: 'Bob', category: 'Design' },
  { id: 3, name: 'Gamma', status: 'archived', owner: 'Carol', category: 'Ops' }
];

export function CrudLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Composite data workflow renderer that combines optional query form, toolbar, bulk actions, and table presentation into one owner surface."
      scenarios={[
        {
          title: 'Basic CRUD shell',
          description: 'Minimal CRUD configuration with toolbar and a plain status column rendered through the shared table bridge.',
          schema: basicCrud,
          data: { records }
        },
        {
          title: 'CRUD workflow with query, toolbars, and fixed columns',
          description: 'Shows query-driven workflow, inline column settings (`overlay: false`), basic header search/filter controls, and fixed left/right columns including an operation column. Drag reorder is intentionally not shown because `draggable` is still deferred.',
          schema: queryCrud,
          data: { records }
        },
        {
          title: 'CRUD responsive expand baseline',
          description: 'Shows the CRUD-owned responsive more-columns baseline. Below the configured breakpoint, the primary column stays in the main row while secondary columns move into the expandable detail row via the internal table bridge.',
          schema: responsiveCrud,
          data: { records }
        },
        {
          title: 'CRUD source-result baseline',
          description: 'Shows the first request-owned/source-owned baseline: CRUD consumes a scope-resolved source result object with `items` and `total`, keeps upstream total in `$crud.total`, and still applies local query filtering to the visible rows.',
          schema: sourceResultCrud,
          data: { pagedRecords: { items: records, total: 42 } }
        }
      ]}
    />
  );
}
