import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'fragment',
      data: { greeting: 'Hello from fragment scope' },
      body: [
        { type: 'text', text: '${greeting}' }
      ]
    }
  ]
};

export function FragmentLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      data={{ topLevel: 'parent scope value' }}
      description="Scope-isolated fragment. Optionally injects extra data into child scope via the data prop."
      notes="The greeting variable is injected via fragment.data and resolved in the child text renderer."
    />
  );
}
