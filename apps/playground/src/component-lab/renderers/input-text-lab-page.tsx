import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicInputs = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'inputForm',
      body: [
        {
          type: 'input-text',
          name: 'name',
          label: 'Full Name',
          placeholder: 'Enter your name',
          required: true,
        },
        { type: 'input-text', name: 'city', label: 'City', placeholder: 'Optional city' },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submit' } }],
    },
  ],
};

const constrainedInputs = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'constrainedInputForm',
      body: [
        {
          type: 'input-text',
          name: 'search',
          label: 'Search',
          placeholder: 'Search users...',
        },
        {
          type: 'input-text',
          name: 'bio',
          label: 'Bio (max 100 chars)',
          placeholder: 'Short bio',
          maxLength: 100,
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submit' } }],
    },
  ],
};

export function InputTextLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Single-line text input bound to a named form field. Supports placeholder and standard input validation such as maxLength."
      scenarios={[
        {
          title: 'Basic required and optional fields',
          description:
            'The Full Name field is required — submitting empty shows a validation error.',
          schema: basicInputs,
        },
        {
          title: 'Placeholder and maxLength constraints',
          description:
            'The Search field demonstrates placeholder usage. The Bio field applies a 100 character limit.',
          schema: constrainedInputs,
        },
      ]}
    />
  );
}
