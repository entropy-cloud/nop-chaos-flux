import { MultiScenarioLabPage } from '../MultiScenarioLabPage';

const techTags = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'tagListForm',
      data: { tags: ['react', 'typescript', 'vite'] },
      body: [
        { type: 'tag-list', name: 'tags', label: 'Technologies' }
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
          placeholder: 'Type a label and press Enter...'
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
      introDescription="Editable list of free-text tags. Type a value and press Enter to add a tag. Click a tag to remove it. The value is stored as a string array."
      scenarios={[
        {
          title: 'Pre-populated technology tags',
          description: 'Three tags are pre-loaded. Type a new value and press Enter to add; click an existing tag to remove it. The current list is shown live below.',
          schema: techTags
        },
        {
          title: 'Starting from empty — add issue labels',
          description: 'The field starts empty. Add any labels you need. The count is shown below.',
          schema: emptyStart
        }
      ]}
    />
  );
}
