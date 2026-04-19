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

const inlineRadioGroup = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'inlineRadioForm',
      body: [
        {
          type: 'radio-group',
          name: 'priority',
          label: 'Priority',
          required: true,
          layout: 'horizontal',
          options: [
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'medium' },
            { label: 'High', value: 'high' },
            { label: 'Critical', value: 'critical' }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    },
    { type: 'text', text: 'Selected priority: ${inlineRadioForm.priority ?? "(none)"}' }
  ]
};

export function RadioGroupLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Single-choice radio group. Options can be displayed vertically (default) or horizontally. Required validation supported."
      scenarios={[
        {
          title: 'Vertical radio group with initial value',
          description: 'A required plan selector with the Pro option pre-selected. Submitting without a selection shows a validation error.',
          schema: basicRadioGroup
        },
        {
          title: 'Horizontal inline layout with live selection display',
          description: 'With layout: horizontal, options are shown in a row. The selected value is shown live in the text renderer below.',
          schema: inlineRadioGroup
        }
      ]}
    />
  );
}
