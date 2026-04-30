import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const preloadedData = {
  type: 'page',
  body: [
    { type: 'text', text: 'Users loaded via page data: ${users.length}' },
    {
      type: 'loop',
      items: '${users}',
      itemName: 'user',
      body: [
        {
          type: 'flex',
          direction: 'row',
          gap: 2,
          align: 'center',
          body: [
            { type: 'icon', icon: 'User', size: 14 },
            { type: 'text', text: '${user.username}' },
            { type: 'badge', label: '${user.role}', variant: 'secondary' },
          ],
        },
      ],
    },
  ],
};

const withDataSource = {
  type: 'page',
  body: [
    { type: 'text', text: 'Users loaded: ${users.length}' },
    {
      type: 'data-source',
      name: 'userLoader',
      api: { method: 'get', url: '/api/users' },
      target: 'users',
    },
    {
      type: 'loop',
      items: '${users}',
      itemName: 'user',
      body: [{ type: 'text', text: '${user.username}' }],
    },
  ],
};

const preloadedUsers = [
  { id: 1, username: 'alice', role: 'admin' },
  { id: 2, username: 'bob', role: 'editor' },
  { id: 3, username: 'carol', role: 'viewer' },
];

export function DataSourceLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Logic-only renderer: loads remote data and injects results into a named scope path via target. Renders nothing itself — a companion renderer displays the loaded data."
      scenarios={[
        {
          title: 'Pre-loaded data via page scope (sandbox equivalent)',
          description:
            'In this sandbox there is no live API. Preloading data directly into page scope simulates what data-source would inject. In production, data-source fetches automatically on mount.',
          schema: preloadedData,
          data: { users: preloadedUsers },
        },
        {
          title: 'Real data-source schema (empty in sandbox)',
          description:
            'This shows the actual data-source schema. The /api/users request returns empty because no fetcher is configured here. In a real environment, results are injected into the users scope path and the loop renders them.',
          schema: withDataSource,
          data: { users: [] },
        },
      ]}
    />
  );
}
