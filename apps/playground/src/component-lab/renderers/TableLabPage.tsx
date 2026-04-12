import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
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
      ]
    }
  ]
};

export function TableLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      data={{
        users: [
          { id: 1, username: 'alice', email: 'alice@example.com', role: 'admin' },
          { id: 2, username: 'bob', email: 'bob@example.com', role: 'editor' },
          { id: 3, username: 'carol', email: 'carol@example.com', role: 'viewer' },
          { id: 4, username: 'dave', email: 'dave@example.com', role: 'viewer' },
          { id: 5, username: 'eve', email: 'eve@example.com', role: 'editor' }
        ]
      }}
      description="Data table with configurable columns, sorting, pagination, selection, and expandable rows."
    />
  );
}
