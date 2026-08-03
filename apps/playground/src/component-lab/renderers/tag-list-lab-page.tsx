import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const techTags = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'tagListForm',
      data: { tags: ['react', 'typescript', 'vite'] },
      body: [
        {
          type: 'tag-list',
          name: 'tags',
          label: 'Technologies',
          tags: ['react', 'typescript', 'vite', 'vitest', 'zustand'],
        },
        { type: 'text', text: 'Current tags: ${(tags ?? []).join(", ") || "(none)"}' },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const emptyStart = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'labelForm',
      data: { labels: [] },
      body: [
        {
          type: 'tag-list',
          name: 'labels',
          label: 'Issue Labels',
          tags: ['bug', 'feature', 'docs', 'help wanted'],
        },
        { type: 'text', text: '${(labels ?? []).length} label(s) added' },
      ],
      actions: [{ type: 'button', label: 'Apply Labels', onClick: { action: 'submitForm' } }],
    },
  ],
};

const hostTagEcho = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.hostTags',
      data: { tags: ['react'] },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'tag-list',
          name: 'tags',
          label: 'Technologies',
          tags: ['react', 'typescript', 'vite', 'vitest', 'zustand'],
        },
        {
          type: 'text',
          testid: 'le-tag-echo',
          text: '${submitted ? "LE-TAG:" + $JSON.stringify(ui.hostTags.tags) : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const hostReadOnly = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.hostRo',
      data: {
        tags: ['react'],
        reviewers: [{ id: 'item-1', value: 'alice' }],
        headers: [{ id: 'pair-1', key: 'env', value: 'prod' }],
        icon: 'accessibility',
      },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'tag-list',
          name: 'tags',
          label: 'Technologies',
          readOnly: true,
          tags: ['react', 'typescript', 'vite'],
        },
        {
          type: 'array-editor',
          name: 'reviewers',
          label: 'Reviewers',
          itemLabel: 'Reviewer',
          readOnly: true,
        },
        {
          type: 'key-value',
          name: 'headers',
          label: 'Headers',
          readOnly: true,
        },
        {
          type: 'icon-picker',
          name: 'icon',
          label: 'Icon',
          readOnly: true,
        },
        {
          type: 'text',
          testid: 'le-ro-echo',
          text: '${submitted ? "LE-RO:" + $JSON.stringify(ui.hostRo) : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function TagListLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Toggleable predefined tags backed by a string-array form field. Click a tag to add or remove it; the current selection is verified through the attached scope-debug state."
      scenarios={[
        {
          title: 'Pre-populated technology tags',
          description:
            'Three tags start selected. Click any technology tag to toggle it on or off. The current selection is reflected in the attached scope-debug state.',
          schema: techTags,
        },
        {
          title: 'Starting from empty — add issue labels',
          description:
            'The field starts empty. Click one or more issue labels to build the selection. The current selection is reflected in the attached scope-debug state.',
          schema: emptyStart,
        },
        {
          title: 'Host form tag toggle + submit (bug 73 pattern)',
          description:
            'Toggle a tag on and off, then submit; the echo publishes the committed tag array (controlled echo stability in a real browser).',
          schema: hostTagEcho,
        },
        {
          title: 'Read-only tag list + editors submit (unchanged values)',
          description:
            'readOnly: true freezes tag-list, array-editor, key-value and icon-picker; submit echoes the untouched values (CX-8 same-type re-verification).',
          schema: hostReadOnly,
        },
      ]}
    />
  );
}
