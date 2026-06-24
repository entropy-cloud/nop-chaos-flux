import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const html = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'editorForm',
      data: { rich: '<p>Initial <strong>rich</strong> text.</p>' },
      body: [
        {
          type: 'editor',
          name: 'rich',
          label: 'Content',
          outputFormat: 'html',
          placeholder: 'Type here…',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const readOnly = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'editorForm',
      data: { rich: '<p>Read-only <em>content</em>.</p>' },
      body: [
        { type: 'editor', name: 'rich', label: 'Content (readOnly)', outputFormat: 'html', readOnly: true },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function EditorLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="TipTap WYSIWYG rich-text field. outputFormat html (sanitized via the DOMPurify gate) or json (TipTap JSON); toolbar bridge reuses @nop-chaos/ui buttons (mousedown preventDefault keeps the selection)."
      scenarios={[
        {
          title: 'html output',
          description: 'Bold/italic/headings/lists/quote/code/link via the toolbar; stored value is sanitized HTML.',
          schema: html,
        },
        {
          title: 'readOnly',
          description: 'readOnly hides the toolbar and disables editing.',
          schema: readOnly,
        },
      ]}
    />
  );
}
