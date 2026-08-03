import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const inlineAddress = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'objectFieldForm',
      data: {
        address: { street: '123 Main St', city: 'Springfield', zip: '62701' },
      },
      body: [
        {
          type: 'object-field',
          name: 'address',
          label: 'Address',
          body: [
            { type: 'input-text', name: 'street', label: 'Street', required: true },
            { type: 'input-text', name: 'city', label: 'City', required: true },
            { type: 'input-text', name: 'zip', label: 'ZIP Code' },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
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
          { name: 'Bob', address: { city: 'Chicago', zip: '60601' } },
        ],
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
                { type: 'input-text', name: 'zip', label: 'ZIP' },
              ],
            },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const compositeNestedSubmit = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'objArrForm',
      valuesPath: 'ui.objArrValues',
      data: {
        address: { street: '1 Main St', city: 'Springfield', zip: '62701' },
        contacts: [
          { name: 'Alice', phone: 'P-100' },
          { name: 'Bob', phone: 'P-200' },
        ],
      },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'object-field',
          name: 'address',
          label: 'Address',
          body: [
            { type: 'input-text', name: 'street', placeholder: 'OStreet' },
            { type: 'input-text', name: 'city', placeholder: 'OCity' },
          ],
        },
        {
          type: 'array-field',
          name: 'contacts',
          label: 'Contacts',
          itemKind: 'object',
          item: [
            { type: 'input-text', name: 'name', placeholder: 'CName' },
            { type: 'input-text', name: 'phone', placeholder: 'CPhone' },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
    {
      type: 'text',
      testid: 'objarr-echo',
      text: '${submitted ? "ObjArr: " + $JSON.stringify(ui.objArrValues) : ""}',
    },
  ],
};

export function ObjectFieldLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Inline composite field editing a nested object scope. Child fields write directly into the parent field's object value. Can be nested inside array-field items."
      scenarios={[
        {
          title: 'Inline address editing',
          description:
            'The object-field binds to the address key of the form and exposes street, city, and zip as sub-fields.',
          schema: inlineAddress,
        },
        {
          title: 'Object-field nested inside array-field items',
          description:
            'Each array item contains a name field and a nested address object-field. Demonstrates composite nesting.',
          schema: nestedInsideArray,
        },
        {
          title: 'Object + array fields nested submit (bug 73 pattern)',
          description:
            'Form hosts an object-field and an array-field together. Edit the object sub-fields and the array rows, add a row, submit; the echo asserts the committed shapes and row-scope isolation.',
          schema: compositeNestedSubmit,
        },
      ]}
    />
  );
}
