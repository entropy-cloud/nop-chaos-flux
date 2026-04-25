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
          tags: ['react', 'typescript', 'vite', 'vitest', 'zustand']
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    },
    { type: 'text', text: 'Current tags: ${(tagListForm.tags ?? []).join(", ") || "(none)"}' }
  ]
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
          tags: ['bug', 'feature', 'docs', 'help wanted']
        }
      ],
      actions: [
        { type: 'button', label: 'Apply Labels', onClick: { action: 'submit' } }
      ]
    },
    { type: 'text', text: '${(labelForm.labels ?? []).length} label(s) added' }
  ]
};

export function TagListLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Toggleable predefined tags backed by a string-array form field. Click a tag to add or remove it; the current selection is verified through the attached scope-debug state."
      scenarios={[
        {
          title: 'Pre-populated technology tags',
          description: 'Three tags start selected. Click any technology tag to toggle it on or off. The current selection is reflected in the attached scope-debug state.',
          schema: techTags
        },
        {
          title: 'Starting from empty — add issue labels',
          description: 'The field starts empty. Click one or more issue labels to build the selection. The current selection is reflected in the attached scope-debug state.',
          schema: emptyStart
        }
      ]}
    />
  );
}
