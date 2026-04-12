import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'arrayFieldForm',
      data: {
        members: [
          { name: 'Alice', role: 'admin' },
          { name: 'Bob', role: 'editor' }
        ]
      },
      body: [
        {
          type: 'array-field',
          name: 'members',
          label: 'Team Members',
          itemKind: 'object',
          itemBody: [
            { type: 'input-text', name: 'name', label: 'Name', required: true },
            { type: 'select', name: 'role', label: 'Role', options: [
              { label: 'Admin', value: 'admin' },
              { label: 'Editor', value: 'editor' },
              { label: 'Viewer', value: 'viewer' }
            ]}
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function ArrayFieldLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Inline composite array editing. Each item has its own object scope exposed to itemBody child renderers."
      notes="Add and remove items using the controls at each row. Validation runs per-item."
    />
  );
}
