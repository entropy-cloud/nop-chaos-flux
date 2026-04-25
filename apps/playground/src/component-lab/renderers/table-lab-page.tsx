import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

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
        { label: 'Role', name: 'role' }
      ],
      stripe: true
    }
  ]
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
        { label: 'Role', name: 'role' }
      ],
      empty: 'No users found. Try adjusting your search filters.'
    }
  ]
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
              { label: 'viewer', value: 'viewer' }
            ]
          }
        },
        { label: 'Email', name: 'email' }
      ]
    }
  ]
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
        expandTrigger: 'row'
      },
      columns: [
        { label: 'Username', name: 'username', fixed: 'left', width: 160 },
        { label: 'Email', name: 'email' },
        { label: 'Role', name: 'role' },
        { label: 'Team', name: 'team' }
      ]
    }
  ]
};

const userData = [
  { id: 1, username: 'alice', email: 'alice@example.com', role: 'admin', team: 'Platform' },
  { id: 2, username: 'bob', email: 'bob@example.com', role: 'editor', team: 'Design' },
  { id: 3, username: 'carol', email: 'carol@example.com', role: 'viewer', team: 'Ops' },
  { id: 4, username: 'dave', email: 'dave@example.com', role: 'viewer', team: 'Ops' },
  { id: 5, username: 'eve', email: 'eve@example.com', role: 'editor', team: 'Platform' }
];

export function TableLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Data table with configurable columns, sorting, pagination, selection, and empty-state handling."
      scenarios={[
        {
          title: 'Table with sortable text columns',
          description: 'The ID and Username columns are sortable. Rows render directly from the table source array.',
          schema: sortableTextTable,
          data: { users: userData }
        },
        {
          title: 'Empty state scenario',
          description: 'When data is an empty array, the table shows the configured empty content.',
          schema: emptyTable,
          data: { users: [] }
        },
        {
          title: 'Header search and filter controls',
          description: 'Shows the current Phase 3 baseline for column-level search/filter menus, including active-state trigger styling and clear-all per-column reset.',
          schema: searchableFilterableTable,
          data: { users: userData }
        },
        {
          title: 'Responsive expand baseline',
          description: 'Shows the first responsive more-columns baseline: below the configured breakpoint, the primary column stays in the main row while secondary columns move into an expandable detail row triggered by row click.',
          schema: responsiveExpandTable,
          data: { users: userData }
        }
      ]}
    />
  );
}
