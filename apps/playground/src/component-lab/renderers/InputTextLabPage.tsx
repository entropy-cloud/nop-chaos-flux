import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'inputForm',
      body: [
        { type: 'input-text', name: 'name', label: 'Full Name', placeholder: 'Enter your name', required: true },
        { type: 'input-text', name: 'city', label: 'City', placeholder: 'Optional city' }
      ],
      actions: [
        { type: 'button', label: 'Submit', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function InputTextLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Single-line text input bound to a named form field."
    />
  );
}
