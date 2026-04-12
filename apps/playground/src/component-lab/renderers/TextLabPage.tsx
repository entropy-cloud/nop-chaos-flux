import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    { type: 'text', text: 'Plain string text' },
    { type: 'text', text: 'Hello, ${name}!' },
    { type: 'text', text: 'Count: ${count}' }
  ]
};

export function TextLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      data={{ name: 'Playground', count: 42 }}
      description="Renders a text string from a literal or scope expression."
    />
  );
}
