import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicForm = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'demoForm',
      data: { username: '', role: 'viewer' },
      body: [
        {
          type: 'input-text',
          name: 'username',
          label: 'Username',
          placeholder: 'Enter username',
          required: true,
        },
        { type: 'input-email', name: 'email', label: 'Email', placeholder: 'Enter email' },
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
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submit' } }],
    },
  ],
};

const formWithSubmitFeedback = {
  type: 'page',
  body: [
    {
      type: 'form',
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'input-text',
          name: 'username',
          label: 'Username',
          placeholder: 'Enter username',
          required: true,
        },
        {
          type: 'input-email',
          name: 'email',
          label: 'Email',
          placeholder: 'user@example.com',
          required: true,
        },
        { type: 'text', text: '${submitted ? "Success! Submitted username: " + username : ""}' },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submit' } }],
    },
  ],
};

const formWithHiddenRequiredField = {
  type: 'page',
  body: [
    {
      type: 'form',
      statusPath: 'ui.hiddenFieldStatus',
      data: { collectSecret: false },
      body: [
        {
          type: 'checkbox',
          name: 'collectSecret',
          label: 'Collect secret code',
        },
        {
          type: 'input-text',
          name: 'secretCode',
          label: 'Secret Code',
          placeholder: 'Enter secret code',
          required: true,
          visible: '${collectSecret === true}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit Access Settings', onClick: { action: 'submit' } }],
    },
  ],
};

export function FormLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Root form container that manages field values, validation, and the submit lifecycle. Child renderers bind to the form via the name prop."
      scenarios={[
        {
          title: 'Basic form with select field',
          description: 'Username (required), email, and role select. Validation runs on submit.',
          schema: basicForm,
        },
        {
          title: 'Form with visible submit success state',
          description:
            'Fill in username and email, then click Submit. The form lifecycle writes the local username into a parent success message.',
          schema: formWithSubmitFeedback,
        },
        {
          title: 'Hidden required field skips validation until shown',
          description:
            'Submit once with the secret field hidden to prove hidden fields do not block submission. Then reveal the required field and submit again to verify validation resumes when the field becomes visible.',
          schema: formWithHiddenRequiredField,
        },
      ]}
    />
  );
}
