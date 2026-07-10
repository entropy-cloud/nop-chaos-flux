import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicRadioGroup = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'radioGroupForm',
      data: { plan: 'pro' },
      body: [
        {
          type: 'radio-group',
          name: 'plan',
          label: 'Choose Plan',
          required: true,
          options: [
            { label: 'Free', value: 'free' },
            { label: 'Pro ($9/mo)', value: 'pro' },
            { label: 'Enterprise', value: 'enterprise' },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Select Plan', onClick: { action: 'submitForm' } }],
    },
  ],
};

const inlineRadioGroup = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'radio-group',
          name: 'priority',
          label: 'Priority',
          required: true,
          direction: 'horizontal',
          options: [
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'medium' },
            { label: 'High', value: 'high' },
            { label: 'Critical', value: 'critical' },
          ],
        },
        { type: 'text', text: 'Selected priority: ${priority ?? "(none)"}' },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function RadioGroupLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Single-choice radio group. Options can be displayed vertically (default) or horizontally. Required validation supported."
      scenarios={[
        {
          title: 'Vertical radio group with initial value',
          description:
            'A required plan selector with the Pro option pre-selected. Submitting without a selection shows a validation error.',
          schema: basicRadioGroup,
        },
        {
          title: 'Horizontal inline layout with in-form live summary',
          description:
            'With layout: horizontal, options are shown in a row. The selected value is rendered by a text node inside the same form scope.',
          schema: inlineRadioGroup,
        },
      ]}
    />
  );
}
