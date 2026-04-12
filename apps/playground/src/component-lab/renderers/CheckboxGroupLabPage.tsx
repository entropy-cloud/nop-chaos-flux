import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'checkboxGroupForm',
      body: [
        {
          type: 'checkbox-group',
          name: 'interests',
          label: 'Interests',
          options: [
            { label: 'TypeScript', value: 'ts' },
            { label: 'React', value: 'react' },
            { label: 'Rust', value: 'rust' },
            { label: 'Go', value: 'go' }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function CheckboxGroupLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Multi-choice checkbox group. Options can be provided inline or from an async source."
    />
  );
}
