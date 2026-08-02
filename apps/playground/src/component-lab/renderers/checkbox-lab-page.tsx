import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const acceptTerms = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'checkboxForm',
      body: [
        {
          type: 'checkbox',
          name: 'acceptTerms',
          label: 'I accept the terms and conditions',
          required: true,
        },
      ],
      actions: [{ type: 'button', label: 'Continue', onClick: { action: 'submitForm' } }],
    },
  ],
};

const checkboxWithReaction = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        { type: 'checkbox', name: 'emailNotify', label: 'Receive email notifications' },
        { type: 'checkbox', name: 'smsNotify', label: 'Receive SMS notifications' },
        {
          type: 'text',
          text: 'Email: ${emailNotify ? "ON" : "OFF"} | SMS: ${smsNotify ? "ON" : "OFF"}',
        },
      ],
      actions: [{ type: 'button', label: 'Save Preferences', onClick: { action: 'submitForm' } }],
    },
  ],
};

const choiceEnterNoSubmitForm = {
  type: 'page',
  body: [
    {
      type: 'form',
      data: { agree: false, active: false },
      submitAction: { action: 'ajax', args: { url: '/api/enter-no-submit', method: 'post' } },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        { type: 'checkbox', name: 'agree', label: 'Agree', option: { label: 'I agree' } },
        { type: 'switch', name: 'active', label: 'Active' },
        {
          type: 'text',
          testid: 'enter-echo',
          text:
            '${submitted ? "Submitted: " + (agree ? "checked" : "unchecked") + " / " + (active ? "on" : "off") : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function CheckboxLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Boolean toggle bound to a form field. Supports required validation and optional description text."
      scenarios={[
        {
          title: 'Required checkbox for terms acceptance',
          description:
            'The checkbox is required. Submitting without checking it shows a validation error.',
          schema: acceptTerms,
        },
        {
          title: 'Multiple checkboxes with in-form live summary',
          description:
            'Toggle the checkboxes to exercise the current bound boolean state. The summary text is rendered inside the form scope and updates live.',
          schema: checkboxWithReaction,
        },
        {
          title: 'Checkbox and switch Enter no-submit (P1-C fix proof)',
          description:
            'Enter pressed while a checkbox (role="checkbox") or switch (role="switch") is focused must NOT submit the form (C2.1 follow-up). Submit only fires from the explicit Submit button.',
          schema: choiceEnterNoSubmitForm,
        },
      ]}
    />
  );
}
