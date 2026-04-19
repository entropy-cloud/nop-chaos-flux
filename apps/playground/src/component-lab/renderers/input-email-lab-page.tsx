import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicEmail = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'emailForm',
      body: [
        { type: 'input-email', name: 'email', label: 'Email Address', placeholder: 'user@example.com', required: true }
      ],
      actions: [
        { type: 'button', label: 'Verify', onClick: { action: 'submit' } }
      ]
    }
  ]
};

const prePopulatedInvalid = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'invalidEmailForm',
      data: { workEmail: 'not-a-valid-email' },
      body: [
        {
          type: 'input-email',
          name: 'workEmail',
          label: 'Work Email',
          placeholder: 'name@company.com',
          required: true
        }
      ],
      actions: [
        { type: 'button', label: 'Submit to see validation error', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function InputEmailLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Email input with built-in format validation. Triggers an email format error on blur or submit if the value is not a valid email address."
      scenarios={[
        {
          title: 'Standard email field',
          description: 'A required email field. Blur or submit with an invalid value to see the format error.',
          schema: basicEmail
        },
        {
          title: 'Pre-populated with invalid value — submit to see error',
          description: 'The field starts with an invalid email. Click Submit to trigger the validation error display.',
          schema: prePopulatedInvalid
        }
      ]}
    />
  );
}
