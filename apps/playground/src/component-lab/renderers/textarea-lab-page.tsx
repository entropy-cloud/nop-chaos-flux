import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicTextarea = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'textareaForm',
      body: [
        { type: 'textarea', name: 'bio', label: 'Biography', placeholder: 'Tell us about yourself...', required: true }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

const richTextarea = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'richTextareaForm',
      body: [
        {
          type: 'textarea',
          name: 'notes',
          label: 'Notes (max 200 chars)',
          placeholder: 'Enter your notes...',
          rows: 5,
          maxLength: 200
        },
        {
          type: 'textarea',
          name: 'fixedDescription',
          label: 'Description (no resize)',
          placeholder: 'Fixed size textarea...',
          rows: 3,
          resize: false
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function TextareaLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Multi-line text input bound to a form field. Supports rows, maxLength with counter, and resize control."
      scenarios={[
        {
          title: 'Basic required textarea',
          description: 'A simple biography field that is required. Submitting empty shows a validation error.',
          schema: basicTextarea
        },
        {
          title: 'Fixed rows, maxLength counter, and no-resize',
          description: 'The Notes field has 5 rows and a 200 character limit. The Description field has resize disabled.',
          schema: richTextarea
        }
      ]}
    />
  );
}
