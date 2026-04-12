import { SchemaLabPage } from '../SchemaLabPage';

const treeOptions = [
  {
    label: 'Engineering',
    value: 'engineering',
    children: [
      { label: 'Frontend', value: 'frontend', children: [] },
      { label: 'Backend', value: 'backend', children: [] }
    ]
  },
  {
    label: 'Design',
    value: 'design',
    children: [
      { label: 'UX', value: 'ux', children: [] },
      { label: 'Brand', value: 'brand', children: [] }
    ]
  }
];

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'treeSelectForm',
      body: [
        {
          type: 'tree-select',
          name: 'team',
          label: 'Select Team',
          searchable: true,
          options: treeOptions
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function TreeSelectLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Popover-based tree selector. Supports search and radio/checkbox modes."
    />
  );
}
