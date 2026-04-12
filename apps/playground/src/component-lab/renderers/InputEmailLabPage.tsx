import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'emailForm',
      body: [
        { type: 'input-email', name: 'email', label: 'Email Address', placeholder: 'user@example.com', required: true }
      ],
      actions: [
        { type: 'button', label: 'Verify', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function InputEmailLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Email input with built-in format validation. Triggers an email format error on blur if the value is not a valid email."
    />
  );
}
