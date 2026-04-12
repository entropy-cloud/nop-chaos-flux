import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'detailFieldForm',
      data: {
        profile: { firstName: 'Ada', lastName: 'Lovelace', bio: 'Mathematician' }
      },
      body: [
        {
          type: 'detail-field',
          name: 'profile',
          label: 'User Profile',
          content: [
            { type: 'input-text', name: 'firstName', label: 'First Name', required: true },
            { type: 'input-text', name: 'lastName', label: 'Last Name', required: true },
            { type: 'textarea', name: 'bio', label: 'Bio' }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function DetailFieldLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Opens a dialog form to edit a nested object field. Writes back to the parent form on confirm."
      notes="Click the edit trigger to open the detail-field dialog. Confirm to write changes back."
    />
  );
}
