import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c4c3HostEnv, c4c3HostSchemas } from './data-c4c3-host';

const preloadedData = {
  type: 'page',
  body: [
    { type: 'text', text: 'Users loaded via page data: ${COUNT(users)}' },
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
            { type: 'icon', icon: 'user', size: 14 },
            { type: 'text', text: '${$slot.user.username}' },
            { type: 'badge', text: '${$slot.user.role}', level: 'warning' },
          ],
        },
      ],
    },
  ],
};

const withDataSource = {
  type: 'page',
  body: [
    { type: 'text', text: 'Users loaded: ${COUNT(users)}' },
    {
      type: 'data-source',
      name: 'users',
      action: 'ajax',
      args: { method: 'get', url: '/api/users' },
      initialData: [],
      mergeStrategy: 'append',
    },
    {
      type: 'loop',
      items: '${users}',
      itemName: 'user',
      body: [{ type: 'text', text: '${$slot.user.username}' }],
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
      introDescription="Logic-only renderer: loads remote data and publishes results into the current scope by `name`. Renders nothing itself; companion renderers consume the published value."
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
            'This shows the actual live data-source contract. The default playground fetcher returns null for /api/users here, so the loop stays empty; in a real environment the named `users` value would be published and rendered below.',
          schema: withDataSource,
          data: { users: [] },
        },
        {
          title: 'Host data-source loads remote users into list (C4.3 Phase 3)',
          description:
            'C4.3 Phase 3: a data-source fetches users through the env IO boundary into the page scope; the list renders the published value and statistics echoes the count. component:refresh re-fetches a new batch.',
          schema: c4c3HostSchemas.dsList,
          data: {},
          env: c4c3HostEnv,
        },
        {
          title: 'Host data-source failure keeps data + retry (C4.3 bug 73 pattern)',
          description:
            'C4.3 Phase 3: the first two fetches fail (500). The statusPath reports hasError, the list keeps the initialData rows (old data retained), and component:refresh retries to recovery.',
          schema: c4c3HostSchemas.dsFail,
          data: {},
          env: c4c3HostEnv,
        },
      ]}
    />
  );
}
