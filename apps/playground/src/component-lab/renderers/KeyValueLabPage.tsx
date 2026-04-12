import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'keyValueForm',
      data: { headers: [{ key: 'Content-Type', value: 'application/json' }] },
      body: [
        { type: 'key-value', name: 'headers', label: 'HTTP Headers' }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function KeyValueLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Editable list of key-value pairs. Add, edit, and remove rows."
    />
  );
}
