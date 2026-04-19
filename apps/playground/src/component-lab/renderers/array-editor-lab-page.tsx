import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const contactsEditor = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'arrayEditorForm',
      data: {
        contacts: [
          { name: 'Alice Johnson', email: 'alice@example.com' },
          { name: 'Bob Smith', email: 'bob@example.com' }
        ]
      },
      body: [
        {
          type: 'array-editor',
          name: 'contacts',
          label: 'Contacts',
          columns: [
            { name: 'name', label: 'Name', type: 'input-text', placeholder: 'Full name' },
            { name: 'email', label: 'Email', type: 'input-text', placeholder: 'email@example.com' }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

const tasksWithStatus = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'tasksForm',
      data: {
        tasks: [
          { title: 'Design review', status: 'in-progress' },
          { title: 'Write tests', status: 'todo' }
        ]
      },
      body: [
        {
          type: 'array-editor',
          name: 'tasks',
          label: 'Tasks',
          columns: [
            { name: 'title', label: 'Title', type: 'input-text', placeholder: 'Task title' },
            { name: 'status', label: 'Status', type: 'select', options: [
              { label: 'To Do', value: 'todo' },
              { label: 'In Progress', value: 'in-progress' },
              { label: 'Done', value: 'done' }
            ]}
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function ArrayEditorLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Structured array editor with per-item column fields and add/remove row controls. Each row has named columns rendered as inline field editors."
      scenarios={[
        {
          title: 'Contact list with text columns',
          description: 'Two text columns for name and email. Add rows with the + button and remove with the trash icon.',
          schema: contactsEditor
        },
        {
          title: 'Task list with a select column',
          description: 'One text column for title and one select column for status. Demonstrates mixing column types.',
          schema: tasksWithStatus
        }
      ]}
    />
  );
}
