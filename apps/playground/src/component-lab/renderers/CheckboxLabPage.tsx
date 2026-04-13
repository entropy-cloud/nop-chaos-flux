import { MultiScenarioLabPage } from '../MultiScenarioLabPage';

const acceptTerms = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'checkboxForm',
      body: [
        { type: 'checkbox', name: 'acceptTerms', label: 'I accept the terms and conditions', required: true }
      ],
      actions: [
        { type: 'button', label: 'Continue', onClick: { action: 'submit' } }
      ]
    }
  ]
};

const checkboxWithReaction = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'notifyForm',
      body: [
        { type: 'checkbox', name: 'emailNotify', label: 'Receive email notifications' },
        { type: 'checkbox', name: 'smsNotify', label: 'Receive SMS notifications' }
      ],
      actions: [
        { type: 'button', label: 'Save Preferences', onClick: { action: 'submit' } }
      ]
    },
    { type: 'text', text: 'Email: ${notifyForm.emailNotify ? "ON" : "OFF"} | SMS: ${notifyForm.smsNotify ? "ON" : "OFF"}' }
  ]
};

export function CheckboxLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Boolean toggle bound to a form field. Supports required validation and optional description text."
      scenarios={[
        {
          title: 'Required checkbox for terms acceptance',
          description: 'The checkbox is required. Submitting without checking it shows a validation error.',
          schema: acceptTerms
        },
        {
          title: 'Multiple checkboxes with live scope display',
          description: 'Toggle the checkboxes to see the current ON/OFF status reflected in the text renderer below the form.',
          schema: checkboxWithReaction
        }
      ]}
    />
  );
}
