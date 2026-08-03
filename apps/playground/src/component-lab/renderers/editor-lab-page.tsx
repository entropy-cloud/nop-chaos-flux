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

const hostEditorEcho = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.hostEditor',
      data: { rich: '<p>Initial <strong>rich</strong> text.</p>' },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'editor',
          name: 'rich',
          label: 'Content',
          outputFormat: 'html',
          placeholder: 'Type here…',
        },
        {
          type: 'text',
          testid: 'mr-editor-echo',
          text: '${submitted ? "MR-EDITOR:" + $JSON.stringify(ui.hostEditor.rich) : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const hostEditorSanitize = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.hostEditorSan',
      data: {
        rich: '<p>ok</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>',
      },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'editor',
          name: 'rich',
          label: 'Content',
          outputFormat: 'html',
        },
        {
          type: 'text',
          testid: 'mr-sanitize-echo',
          text: '${submitted ? "MR-SANITIZE:" + $JSON.stringify(ui.hostEditorSan.rich) : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const hostEditorLink = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.hostEditorLink',
      data: { rich: '<p>link me</p>' },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'editor',
          name: 'rich',
          label: 'Content',
          outputFormat: 'html',
        },
        {
          type: 'text',
          testid: 'mr-link-echo',
          text: '${submitted ? "MR-LINK:" + $JSON.stringify(ui.hostEditorLink.rich) : ""}',
        },
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
        {
          title: 'Host form editor edit + submit (bug 73 pattern)',
          description:
            'Edit the WYSIWYG editor and submit; the echo publishes the committed HTML value (real-browser store writeback).',
          schema: hostEditorEcho,
        },
        {
          title: 'Host editor sanitize boundary',
          description:
            'Stored HTML contains <script> and a javascript: link; the rendered editor and the committed value stay sanitized (XSS red line).',
          schema: hostEditorSanitize,
        },
        {
          title: 'Host form editor link + submit (bug 73 pattern)',
          description:
            'Click the Link toolbar button, accept a URL dialog, submit; the echo contains the anchor. A javascript: URL is rejected and never lands in the value.',
          schema: hostEditorLink,
        },
      ]}
    />
  );
}
