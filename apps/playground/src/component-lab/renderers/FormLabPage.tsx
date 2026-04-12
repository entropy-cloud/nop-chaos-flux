import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'demoForm',
      data: { username: '', role: 'viewer' },
      body: [
        { type: 'input-text', name: 'username', label: 'Username', placeholder: 'Enter username', required: true },
        { type: 'input-email', name: 'email', label: 'Email', placeholder: 'Enter email' },
        { type: 'select', name: 'role', label: 'Role', options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Editor', value: 'editor' },
          { label: 'Viewer', value: 'viewer' }
        ]}
      ],
      actions: [
        { type: 'button', label: 'Submit', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function FormLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Root form container that manages field values, validation, and submit lifecycle."
      notes="The form renderer provides field binding, validation coordination, and submit/reset actions to its child field renderers."
    />
  );
}
