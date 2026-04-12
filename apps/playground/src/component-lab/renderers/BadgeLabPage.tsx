import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'flex',
      body: [
        { type: 'badge', label: 'Default' },
        { type: 'badge', label: 'Secondary', variant: 'secondary' },
        { type: 'badge', label: 'Outline', variant: 'outline' },
        { type: 'badge', label: 'Destructive', variant: 'destructive' }
      ]
    }
  ]
};

export function BadgeLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Renders a styled badge or tag with label and optional variant."
    />
  );
}
