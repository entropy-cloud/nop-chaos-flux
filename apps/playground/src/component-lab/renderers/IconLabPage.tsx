import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'flex',
      body: [
        { type: 'icon', icon: 'Star', size: 24 },
        { type: 'icon', icon: 'Heart', size: 24 },
        { type: 'icon', icon: 'Zap', size: 24 },
        { type: 'icon', icon: 'CheckCircle', size: 24 }
      ]
    }
  ]
};

export function IconLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Renders a named Lucide icon with configurable size."
    />
  );
}
