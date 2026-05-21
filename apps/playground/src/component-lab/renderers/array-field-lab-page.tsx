import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const membersArray = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'arrayFieldForm',
      data: {
        members: [
          { name: 'Alice', role: 'admin' },
          { name: 'Bob', role: 'editor' },
        ],
      },
      body: [
        {
          type: 'array-field',
          name: 'members',
          label: 'Team Members',
          itemKind: 'object',
          item: [
            { type: 'input-text', name: 'name', label: 'Name', required: true },
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [
                { label: 'Admin', value: 'admin' },
                { label: 'Editor', value: 'editor' },
                { label: 'Viewer', value: 'viewer' },
              ],
            },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Save Team', onClick: { action: 'submitForm' } }],
    },
  ],
};

const contactsWithSubmit = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'contactsForm',
      onSubmit: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      data: {
        contacts: [],
      },
      body: [
        {
          type: 'array-field',
          name: 'contacts',
          label: 'Contacts',
          itemKind: 'object',
          item: [
            { type: 'input-text', name: 'name', label: 'Name', required: true },
            { type: 'input-email', name: 'email', label: 'Email', required: true },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
    {
      type: 'text',
      text: '${submitted ? "Contacts saved! Count: " + (contactsForm.contacts ?? []).length : "Add contacts and submit."}',
    },
  ],
};

export function ArrayFieldLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Inline composite array editing. Each item has its own object scope exposed to item child renderers. Supports add, remove, and per-item validation."
      scenarios={[
        {
          title: 'Team members with name and role',
          description:
            'Pre-populated with two members. Add more with the + button or remove rows with the trash icon.',
          schema: membersArray,
        },
        {
          title: 'Contact list with submit result display',
          description:
            'Starts empty. Add contacts with name and email, then submit. The success message shows how many contacts were saved.',
          schema: contactsWithSubmit,
        },
      ]}
    />
  );
}
