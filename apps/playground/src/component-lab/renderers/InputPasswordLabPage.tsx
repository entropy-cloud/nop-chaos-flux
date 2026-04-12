import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'passwordForm',
      body: [
        { type: 'input-password', name: 'password', label: 'Password', required: true },
        { type: 'input-password', name: 'confirmPassword', label: 'Confirm Password', required: true }
      ],
      actions: [
        { type: 'button', label: 'Set Password', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function InputPasswordLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Password input with masked characters. Uses the standard form field binding and validation pipeline."
    />
  );
}
