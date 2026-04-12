import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'container',
      body: [
        { type: 'text', text: 'Container body item 1' },
        { type: 'text', text: 'Container body item 2' }
      ]
    }
  ]
};

export function ContainerLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Generic layout container with body, header, and footer regions."
    />
  );
}
