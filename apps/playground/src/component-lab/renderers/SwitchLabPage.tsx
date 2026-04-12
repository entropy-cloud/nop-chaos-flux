import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'switchForm',
      body: [
        { type: 'switch', name: 'notifications', label: 'Enable notifications' },
        { type: 'switch', name: 'darkMode', label: 'Dark mode' }
      ],
      actions: [
        { type: 'button', label: 'Save Preferences', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function SwitchLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Toggle switch bound to a boolean form field."
    />
  );
}
