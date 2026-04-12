import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'arrayEditorForm',
      data: {
        contacts: [
          { name: 'Alice', email: 'alice@example.com' },
          { name: 'Bob', email: 'bob@example.com' }
        ]
      },
      body: [
        {
          type: 'array-editor',
          name: 'contacts',
          label: 'Contacts',
          columns: [
            { name: 'name', label: 'Name', type: 'input-text', placeholder: 'Full name' },
            { name: 'email', label: 'Email', type: 'input-text', placeholder: 'email@example.com' }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function ArrayEditorLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Structured array editor with per-item column fields and add/remove row controls."
      notes="Each row has named columns rendered as inline field editors. Add rows with the + button and remove with the trash icon."
    />
  );
}
