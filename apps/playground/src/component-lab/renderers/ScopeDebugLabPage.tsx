import { MultiScenarioLabPage } from '../MultiScenarioLabPage';

const localScopeDebugSchema = {
  type: 'page',
  body: [
    { type: 'text', text: 'The debug panel below is a real renderer reading the current scope.' },
    {
      type: 'button',
      label: 'Increment count',
      onClick: {
        action: 'setValue',
        componentPath: 'count',
        value: '${count + 1}'
      }
    },
    {
      type: 'scope-debug',
      title: 'Local Page Scope',
      defaultExpand: true
    }
  ]
};

const nestedScopeDebugSchema = {
  type: 'page',
  body: [
    {
      type: 'fragment',
      data: {
        user: {
          name: '${user.name}',
          role: '${user.role}',
          debugMode: true
        }
      },
      body: [
        { type: 'text', text: 'Nested fragment scope with injected debugMode flag.' },
        {
          type: 'scope-debug',
          title: 'Fragment Scope',
          defaultExpand: true
        }
      ]
    }
  ]
};

export function ScopeDebugLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Debug-only renderer that snapshots the current scope as JSON and rerenders whenever that scope changes. Use it as a local probe anywhere in a schema tree."
      scenarios={[
        {
          title: 'Live root scope probe',
          description: 'Insert `scope-debug` next to interactive controls to watch local writes land in real time.',
          schema: localScopeDebugSchema,
          data: { count: 0, status: 'idle' }
        },
        {
          title: 'Nested fragment scope probe',
          description: 'Place the renderer inside a fragment or owner boundary to inspect the exact local scope visible there.',
          schema: nestedScopeDebugSchema,
          data: {
            user: {
              name: 'Alice',
              role: 'admin'
            }
          }
        }
      ]}
    />
  );
}
