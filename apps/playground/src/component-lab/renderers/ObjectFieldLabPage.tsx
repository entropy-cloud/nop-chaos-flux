import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'objectFieldForm',
      data: {
        address: { street: '123 Main St', city: 'Springfield', zip: '62701' }
      },
      body: [
        {
          type: 'object-field',
          name: 'address',
          label: 'Address',
          body: [
            { type: 'input-text', name: 'street', label: 'Street', required: true },
            { type: 'input-text', name: 'city', label: 'City', required: true },
            { type: 'input-text', name: 'zip', label: 'ZIP Code' }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function ObjectFieldLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Inline composite field editing a nested object scope. Child fields write directly into the parent field's object value."
      notes="The object-field name binds to the parent form and injects its value as a form scope for child fields."
    />
  );
}
