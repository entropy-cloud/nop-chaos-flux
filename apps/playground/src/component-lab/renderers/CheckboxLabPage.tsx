import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'checkboxForm',
      body: [
        { type: 'checkbox', name: 'acceptTerms', label: 'I accept the terms and conditions', required: true }
      ],
      actions: [
        { type: 'button', label: 'Continue', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function CheckboxLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Boolean toggle bound to a form field."
    />
  );
}
