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
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
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
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
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
      actions: [{ type: 'button', label: 'Submit Access Settings', onClick: { action: 'submitForm' } }],
    },
  ],
};

const formWithAjaxSubmit = {
  type: 'page',
  body: [
    {
      type: 'form',
      submitAction: {
        action: 'ajax',
        args: { url: '/api/component-lab/save-form', method: 'post', includeScope: '*' },
      },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'input-text',
          name: 'fullName',
          label: 'Full Name',
          required: true,
        },
        {
          type: 'input-text',
          name: 'nickName',
          label: 'Nick Name',
        },
        { type: 'text', text: '${submitted ? "Saved! Name: " + fullName : ""}' },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const formWithValuesPath = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.formValues',
      data: { username: '' },
      submitAction: {
        action: 'ajax',
        args: { url: '/api/component-lab/save-form', method: 'post', includeScope: '*' },
      },
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
          type: 'text',
          text:
            '${submitted && ui.formValues ? "Echo: " + ui.formValues.username + " (valuesPath) " : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const formWithClearOnHidden = {
  type: 'page',
  body: [
    {
      type: 'form',
      data: { collectSecret: true },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        { type: 'checkbox', name: 'collectSecret', label: 'Collect secret code' },
        {
          type: 'input-text',
          name: 'secretCode',
          label: 'Secret Code',
          placeholder: 'Enter secret code',
          visible: '${collectSecret === true}',
          hiddenFieldPolicy: { clearValueWhenHidden: true },
        },
        {
          type: 'text',
          text: '${submitted ? "Done. secretCode=" + secretCode : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
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
        {
          title: 'Form with ajax submit and includeScope',
          description:
            'Typing into form fields and submitting sends the field values in the ajax request body via includeScope.',
          schema: formWithAjaxSubmit,
        },
        {
          title: 'Submit publishes form values to parent scope (valuesPath)',
          description:
            'Real input -> store update -> submit -> valuesPath publishes the committed values into the page scope where an outer text echoes them.',
          schema: formWithValuesPath,
        },
        {
          title: 'Hidden field with clearValueWhenHidden policy',
          description:
            'Typing a secret and unchecking the toggle hides the field; the hiddenFieldPolicy clears its value so the next submit carries no stale secret.',
          schema: formWithClearOnHidden,
        },
      ]}
    />
  );
}
