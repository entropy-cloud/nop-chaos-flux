import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const split = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'mdForm',
      data: { md: '# Hello\n\nThis is **markdown** with a `code` span.' },
      body: [
        { type: 'markdown-editor', name: 'md', label: 'Markdown', viewMode: 'split' },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const editOnly = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'mdForm',
      data: { md: '# Edit only' },
      body: [
        { type: 'markdown-editor', name: 'md', label: 'Markdown (edit)', viewMode: 'edit' },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const compositeSubmit = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'mdSubmitForm',
      valuesPath: 'ui.md',
      data: { md: '# Host markdown\n\nInitial **value**.' },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        { type: 'markdown-editor', name: 'md', label: 'Markdown', viewMode: 'split' },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
    {
      type: 'text',
      testid: 'md-submit-report',
      text: '${submitted && ui.md ? "MD-SUBMIT:" + ui.md.md : ""}',
    },
  ],
};

const xssPayload = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'mdXssForm',
      data: {
        md: '<script>window.__mdXssExecuted = 1</script>\n\n[click](javascript:alert(2))\n\n<img src=x onerror="window.__mdXssExecuted = 2">',
      },
      body: [{ type: 'markdown-editor', name: 'md', label: 'Markdown', viewMode: 'split' }],
    },
  ],
};

const controlledEcho = {
  type: 'page',
  data: { md: '# Initial value' },
  body: [
    { type: 'markdown-editor', name: 'md', label: 'Markdown', viewMode: 'split' },
    { type: 'text', testid: 'md-echo', text: '${md ?? ""}' },
    {
      type: 'button',
      label: 'Set value from outside',
      onClick: { action: 'setValue', args: { path: 'md', value: '# Echoed externally' } },
    },
  ],
};

const disabledReadOnly = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'mdStateForm',
      data: { md: '# Disabled and read-only' },
      body: [
        {
          type: 'markdown-editor',
          name: 'mdDisabled',
          label: 'Disabled',
          testid: 'md-disabled',
          disabled: true,
        },
        {
          type: 'markdown-editor',
          name: 'mdReadonly',
          label: 'Read only',
          testid: 'md-readonly',
          readOnly: true,
        },
      ],
    },
  ],
};

export function MarkdownEditorLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Markdown source editor + live preview. The preview composes the registered `markdown` renderer at runtime (helpers.render + fragment binding), so flux-renderers-form never imports react-markdown."
      scenarios={[
        {
          title: 'split (edit + preview)',
          description: 'Side-by-side editing and live preview; toolbar inserts markdown syntax at the caret.',
          schema: split,
        },
        {
          title: 'edit only',
          description: 'viewMode=edit hides the preview area.',
          schema: editOnly,
        },
        {
          title: 'Markdown editor composite submit (bug 73 pattern)',
          description:
            'markdown-editor inside a form: real typing into the editor, live preview follows, then submit. valuesPath publishes the committed markdown source into the page scope where an outer text echoes it.',
          schema: compositeSubmit,
        },
        {
          title: 'XSS payload preview sanitize',
          description:
            'The editor source contains a script tag, a javascript: markdown link and an img onerror payload. The preview must escape the raw HTML (no script/img elements, no link href) and must not execute any of it.',
          schema: xssPayload,
        },
        {
          title: 'Controlled markdown value echo',
          description:
            'markdown-editor bound to page scope: an external setValue action updates the scope value and both the textarea and the preview must echo the new value (no stale value, no loop).',
          schema: controlledEcho,
        },
        {
          title: 'Disabled and read-only markdown editor',
          description:
            'disabled:true and readOnly:true editors: the textarea is blocked, the toolbar is hidden, the preview still renders and nothing crashes.',
          schema: disabledReadOnly,
        },
      ]}
    />
  );
}
