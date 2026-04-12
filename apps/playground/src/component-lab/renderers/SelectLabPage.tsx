import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'selectForm',
      body: [
        {
          type: 'select',
          name: 'country',
          label: 'Country',
          required: true,
          options: [
            { label: 'United States', value: 'us' },
            { label: 'United Kingdom', value: 'uk' },
            { label: 'Canada', value: 'ca' },
            { label: 'Australia', value: 'au' }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Submit', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function SelectLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Single-value dropdown selector. Options can be provided inline or from an async source."
    />
  );
}
