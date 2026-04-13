import { MultiScenarioLabPage } from '../MultiScenarioLabPage';

const tableWithBadge = {
  type: 'page',
  body: [
    {
      type: 'table',
      data: '${users}',
      rowKey: 'id',
      columns: [
        { title: 'ID', name: 'id' },
        { title: 'Username', name: 'username' },
        { title: 'Email', name: 'email' },
        {
          title: 'Role',
          name: 'role',
          type: 'badge',
          variantMap: {
            admin: 'default',
            editor: 'secondary',
            viewer: 'outline'
          }
        }
      ],
      sortable: true
    }
  ]
};

const emptyTable = {
  type: 'page',
  body: [
    {
      type: 'table',
      data: '${users}',
      rowKey: 'id',
      columns: [
        { title: 'ID', name: 'id' },
        { title: 'Username', name: 'username' },
        { title: 'Email', name: 'email' },
        { title: 'Role', name: 'role' }
      ],
      emptyText: 'No users found. Try adjusting your search filters.'
    }
  ]
};

const userData = [
  { id: 1, username: 'alice', email: 'alice@example.com', role: 'admin' },
  { id: 2, username: 'bob', email: 'bob@example.com', role: 'editor' },
  { id: 3, username: 'carol', email: 'carol@example.com', role: 'viewer' },
  { id: 4, username: 'dave', email: 'dave@example.com', role: 'viewer' },
  { id: 5, username: 'eve', email: 'eve@example.com', role: 'editor' }
];

export function TableLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Data table with configurable columns, sorting, pagination, and selection. Column renderers can display rich content like badges alongside text."
      scenarios={[
        {
          title: 'Table with badge column renderer and sortable columns',
          description: 'The Role column uses a badge renderer with a variantMap to color-code each role. Click column headers to sort.',
          schema: tableWithBadge,
          data: { users: userData }
        },
        {
          title: 'Empty state scenario',
          description: 'When data is an empty array, the table shows the emptyText message.',
          schema: emptyTable,
          data: { users: [] }
        }
      ]}
    />
  );
}
