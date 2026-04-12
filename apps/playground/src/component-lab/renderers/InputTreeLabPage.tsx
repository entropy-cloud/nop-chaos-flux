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
      name: 'inputTreeForm',
      body: [
        {
          type: 'input-tree',
          name: 'department',
          label: 'Department',
          treeMode: 'radio',
          options: treeOptions
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function InputTreeLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Inline tree selector with radio (single) and checkbox (multi) modes."
    />
  );
}
