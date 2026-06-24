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
      ]}
    />
  );
}
