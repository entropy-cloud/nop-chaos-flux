import { MultiScenarioLabPage } from '../MultiScenarioLabPage';

const scopeInjection = {
  type: 'page',
  body: [
    { type: 'text', text: 'Parent scope: topLevel = "${topLevel}"' },
    {
      type: 'fragment',
      data: { greeting: 'Hello from fragment scope', count: 5 },
      body: [
        { type: 'text', text: 'Fragment greeting: ${greeting}' },
        { type: 'text', text: 'Fragment count: ${count}' },
        { type: 'text', text: 'Parent var visible: "${topLevel}"' }
      ]
    }
  ]
};

const scopeIsolation = {
  type: 'page',
  body: [
    { type: 'text', text: 'Parent var: secret = "${secret}"' },
    {
      type: 'fragment',
      isolate: true,
      data: { localOnly: 'only inside fragment' },
      body: [
        { type: 'text', text: 'Inside isolated fragment — localOnly: "${localOnly}"' },
        { type: 'text', text: 'Parent var secret here: "${secret}" (empty because isolated)' }
      ]
    },
    { type: 'text', text: 'Back in parent — secret still: "${secret}"' }
  ]
};

export function FragmentLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Scope sub-container that optionally injects extra data into a child scope. Use isolate: true to prevent parent scope variables from leaking in."
      scenarios={[
        {
          title: 'Scope injection — fragment data merges with parent',
          description: 'By default a fragment merges its data prop into the parent scope. Both parent and fragment variables are accessible inside.',
          schema: scopeInjection,
          data: { topLevel: 'parent-value' }
        },
        {
          title: 'Scope isolation — parent variables are hidden',
          description: 'With isolate: true the fragment gets a fresh scope. Only the fragment\'s own data prop is visible inside.',
          schema: scopeIsolation,
          data: { secret: 'should-not-leak' }
        }
      ]}
    />
  );
}
