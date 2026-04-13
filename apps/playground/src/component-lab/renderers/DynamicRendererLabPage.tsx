import { MultiScenarioLabPage } from '../MultiScenarioLabPage';

const staticFromScope = {
  type: 'page',
  body: [
    { type: 'text', text: 'The dynamic-renderer reads its schema from the scope.' },
    {
      type: 'dynamic-renderer',
      schema: '${dynamicSchema}'
    }
  ]
};

const schemaSwitcher = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'row',
      gap: 2,
      body: [
        {
          type: 'button',
          label: 'Show Badge',
          variant: 'outline',
          onClick: {
            action: 'setValue',
            args: { path: 'dynamicSchema', value: { type: 'badge', label: 'Dynamically rendered badge', variant: 'default' } }
          }
        },
        {
          type: 'button',
          label: 'Show Text',
          variant: 'outline',
          onClick: {
            action: 'setValue',
            args: { path: 'dynamicSchema', value: { type: 'text', text: 'Dynamically rendered text content.' } }
          }
        },
        {
          type: 'button',
          label: 'Show Button',
          variant: 'outline',
          onClick: {
            action: 'setValue',
            args: { path: 'dynamicSchema', value: { type: 'button', label: 'A button from dynamic schema', variant: 'secondary' } }
          }
        }
      ]
    },
    { type: 'text', text: 'Currently rendering: ${dynamicSchema.type ?? "(none)"}' },
    {
      type: 'dynamic-renderer',
      schema: '${dynamicSchema}'
    }
  ]
};

export function DynamicRendererLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Renders a schema node whose type and props are resolved at runtime from the current scope. Enables fully dynamic, data-driven UI composition."
      scenarios={[
        {
          title: 'Static schema injected as scope data',
          description: 'The dynamicSchema variable is preloaded into scope. The dynamic-renderer resolves and renders it.',
          schema: staticFromScope,
          data: {
            dynamicSchema: { type: 'badge', label: 'Rendered from scope', variant: 'secondary' }
          }
        },
        {
          title: 'Runtime schema switching via buttons',
          description: 'Click the buttons to update dynamicSchema in scope. The dynamic-renderer re-renders immediately with the new schema shape.',
          schema: schemaSwitcher,
          data: {
            dynamicSchema: { type: 'badge', label: 'Initial badge', variant: 'outline' }
          }
        }
      ]}
    />
  );
}
