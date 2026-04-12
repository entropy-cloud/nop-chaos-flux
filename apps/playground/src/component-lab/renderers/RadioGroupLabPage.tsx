import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'radioGroupForm',
      body: [
        {
          type: 'radio-group',
          name: 'plan',
          label: 'Choose Plan',
          required: true,
          options: [
            { label: 'Free', value: 'free' },
            { label: 'Pro ($9/mo)', value: 'pro' },
            { label: 'Enterprise', value: 'enterprise' }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Select Plan', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function RadioGroupLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Single-choice radio group. Options can be provided inline or from an async source."
    />
  );
}
