import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'flex',
      body: [
        { type: 'button', label: 'Default' },
        { type: 'button', label: 'Secondary', variant: 'secondary' },
        { type: 'button', label: 'Outline', variant: 'outline' },
        { type: 'button', label: 'Ghost', variant: 'ghost' },
        { type: 'button', label: 'Destructive', variant: 'destructive' },
        { type: 'button', label: 'Disabled', disabled: true }
      ]
    }
  ]
};

export function ButtonLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Action button with configurable variant, size, disabled state, and onClick handler."
    />
  );
}
