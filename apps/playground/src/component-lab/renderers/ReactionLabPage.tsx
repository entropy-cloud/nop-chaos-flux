import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    { type: 'text', text: 'counter: ${counter}' },
    {
      type: 'button',
      label: 'Increment',
      onClick: { action: 'setValue', args: { path: 'counter', value: '${(counter ?? 0) + 1}' } }
    },
    {
      type: 'reaction',
      watch: ['counter'],
      actions: [
        { action: 'setValue', args: { path: 'doubled', value: '${(counter ?? 0) * 2}' } }
      ]
    },
    { type: 'text', text: 'doubled: ${doubled}' }
  ]
};

export function ReactionLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      data={{ counter: 0, doubled: 0 }}
      description="Side-effect trigger: fires actions when watched scope values change."
      notes="Click Increment to increment counter. The reaction automatically computes doubled = counter * 2 whenever counter changes."
    />
  );
}
