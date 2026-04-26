import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const inlineAddress = {
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

const nestedInsideArray = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'employeesForm',
      data: {
        employees: [
          { name: 'Alice', address: { city: 'New York', zip: '10001' } },
          { name: 'Bob', address: { city: 'Chicago', zip: '60601' } }
        ]
      },
      body: [
        {
          type: 'array-field',
          name: 'employees',
          label: 'Employees',
          itemKind: 'object',
          item: [
            { type: 'input-text', name: 'name', label: 'Name', required: true },
            {
              type: 'object-field',
              name: 'address',
              label: 'Address',
              body: [
                { type: 'input-text', name: 'city', label: 'City' },
                { type: 'input-text', name: 'zip', label: 'ZIP' }
              ]
            }
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
    <MultiScenarioLabPage
      introDescription="Inline composite field editing a nested object scope. Child fields write directly into the parent field's object value. Can be nested inside array-field items."
      scenarios={[
        {
          title: 'Inline address editing',
          description: 'The object-field binds to the address key of the form and exposes street, city, and zip as sub-fields.',
          schema: inlineAddress
        },
        {
          title: 'Object-field nested inside array-field items',
          description: 'Each array item contains a name field and a nested address object-field. Demonstrates composite nesting.',
          schema: nestedInsideArray
        }
      ]}
    />
  );
}
