import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const contactsEditor = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'arrayEditorForm',
      data: {
        contacts: [
          { id: 'contact-1', value: 'Alice Johnson <alice@example.com>' },
          { id: 'contact-2', value: 'Bob Smith <bob@example.com>' },
        ],
      },
      body: [
        {
          type: 'array-editor',
          name: 'contacts',
          label: 'Contacts',
          itemLabel: 'Contact',
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const tasksEditor = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'tasksForm',
      data: {
        tasks: [
          { id: 'task-1', value: 'Design review' },
          { id: 'task-2', value: 'Write tests' },
        ],
      },
      body: [
        {
          type: 'array-editor',
          name: 'tasks',
          label: 'Tasks',
          itemLabel: 'Task',
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const hostLeSubmit = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.hostLe',
      data: {
        reviewers: [{ id: 'item-1', value: 'alice' }],
        headers: [{ id: 'pair-1', key: 'env', value: 'prod' }],
      },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'array-editor',
          name: 'reviewers',
          label: 'Reviewers',
          itemLabel: 'Reviewer',
        },
        {
          type: 'key-value',
          name: 'headers',
          label: 'Headers',
        },
        {
          type: 'text',
          testid: 'le-submit-echo',
          text: '${submitted ? "LE-SUBMIT:" + $JSON.stringify(ui.hostLe) : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function ArrayEditorLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Simple scalar array editor with add/remove controls. Current live contract edits arrays of `{ id, value }` items rather than multi-column object rows."
      scenarios={[
        {
          title: 'Contact list with pre-populated scalar items',
          description:
            'Each row edits one scalar string value. The form starts with two contacts and supports add/remove item actions.',
          schema: contactsEditor,
        },
        {
          title: 'Task list with custom item label',
          description:
            'The same scalar array editor can be relabeled for different item types, such as tasks.',
          schema: tasksEditor,
        },
        {
          title: 'Host form array-editor + key-value edit + submit (bug 73 pattern)',
          description:
            'Edit the seeded array row and key-value row inline, add one row to each, then submit; the echo publishes both committed shapes (single-test-green-but-real-browser-failure class).',
          schema: hostLeSubmit,
        },
      ]}
    />
  );
}
