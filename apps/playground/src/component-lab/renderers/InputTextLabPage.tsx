import { MultiScenarioLabPage } from '../MultiScenarioLabPage';

const basicInputs = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'inputForm',
      body: [
        { type: 'input-text', name: 'name', label: 'Full Name', placeholder: 'Enter your name', required: true },
        { type: 'input-text', name: 'city', label: 'City', placeholder: 'Optional city' }
      ],
      actions: [
        { type: 'button', label: 'Submit', onClick: { action: 'submit' } }
      ]
    }
  ]
};

const richInputs = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'richInputForm',
      body: [
        {
          type: 'input-text',
          name: 'search',
          label: 'Search',
          placeholder: 'Search users...',
          prefix: 'Search',
          clearable: true
        },
        {
          type: 'input-text',
          name: 'bio',
          label: 'Bio (max 100 chars)',
          placeholder: 'Short bio',
          maxLength: 100
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function InputTextLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Single-line text input bound to a named form field. Supports clearable, prefix, suffix, maxLength, and placeholder."
      scenarios={[
        {
          title: 'Basic required and optional fields',
          description: 'The Full Name field is required — submitting empty shows a validation error.',
          schema: basicInputs
        },
        {
          title: 'Clearable, prefix icon, and maxLength',
          description: 'The Search field has clearable: true and a prefix label. The Bio field has a 100 character limit.',
          schema: richInputs
        }
      ]}
    />
  );
}
