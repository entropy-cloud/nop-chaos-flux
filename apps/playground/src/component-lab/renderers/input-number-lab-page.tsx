import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicNumberInputs = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'inputNumberForm',
      data: { stepper: 10 },
      body: [
        {
          type: 'input-number',
          name: 'count',
          label: 'Count',
          placeholder: 'Enter a quantity',
          required: true,
          min: 0,
        },
        {
          type: 'input-number',
          name: 'stepper',
          label: 'Step Size',
          step: 5,
          value: 10,
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const decoratedNumberInputs = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'decoratedInputNumberForm',
      body: [
        {
          type: 'input-number',
          name: 'price',
          label: 'Price',
          prefix: '$',
          precision: 2,
          value: 19.99,
        },
        {
          type: 'input-number',
          name: 'width',
          label: 'Width',
          suffix: 'px',
          min: 0,
          max: 1440,
          value: 320,
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function InputNumberLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Numeric form input with min/max, stepper controls, precision formatting, and optional prefix or suffix decorations."
      scenarios={[
        {
          title: 'Required numeric fields and stepper behavior',
          description:
            'The Count field requires a non-negative number, while Step Size shows the stepper increment flow using step=5.',
          schema: basicNumberInputs,
        },
        {
          title: 'Decorated numeric values',
          description:
            'Price uses currency prefix plus decimal precision. Width demonstrates suffix rendering with a bounded numeric range.',
          schema: decoratedNumberInputs,
        },
      ]}
    />
  );
}
