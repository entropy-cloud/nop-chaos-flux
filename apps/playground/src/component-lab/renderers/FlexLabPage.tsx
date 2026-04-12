import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'flex',
      body: [
        { type: 'badge', label: 'Item A' },
        { type: 'badge', label: 'Item B' },
        { type: 'badge', label: 'Item C' }
      ]
    }
  ]
};

export function FlexLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Flexbox container for horizontal or vertical child layout."
    />
  );
}
