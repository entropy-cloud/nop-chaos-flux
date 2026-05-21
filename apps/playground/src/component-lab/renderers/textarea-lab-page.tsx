import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicTextarea = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'textareaForm',
      body: [
        {
          type: 'textarea',
          name: 'bio',
          label: 'Biography',
          placeholder: 'Tell us about yourself...',
          required: true,
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const rowVariants = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'richTextareaForm',
      body: [
        {
          type: 'textarea',
          name: 'notes',
          label: 'Notes (5 rows)',
          placeholder: 'Enter your notes...',
          rows: 5,
        },
        {
          type: 'textarea',
          name: 'summary',
          label: 'Summary (3 rows)',
          placeholder: 'Compact textarea...',
          rows: 3,
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function TextareaLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Multi-line text input bound to a form field. Supports placeholder and row count configuration."
      scenarios={[
        {
          title: 'Basic required textarea',
          description:
            'A simple biography field that is required. Submitting empty shows a validation error.',
          schema: basicTextarea,
        },
        {
          title: 'Fixed row counts',
          description:
            'Different textarea fields can use different row counts to fit the surrounding form layout.',
          schema: rowVariants,
        },
      ]}
    />
  );
}
