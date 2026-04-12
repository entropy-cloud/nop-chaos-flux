import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    { type: 'text', text: 'Users loaded: ${users.length}' },
    {
      type: 'data-source',
      name: 'userLoader',
      api: { method: 'get', url: '/api/users' },
      target: 'users'
    },
    {
      type: 'loop',
      items: '${users}',
      itemName: 'user',
      body: [{ type: 'text', text: '${user.username}' }]
    }
  ]
};

export function DataSourceLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      data={{ users: [] }}
      description="Logic-only renderer: loads remote data and injects results into a named scope path."
      notes="In this sandbox the /api/users request returns empty (no fetcher configured). In a real environment, the data-source renderer fetches and stores results in the target scope path."
    />
  );
}
