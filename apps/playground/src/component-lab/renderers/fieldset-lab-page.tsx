import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicFieldset = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'fieldsetDemo',
      body: [
        {
          type: 'fieldset',
          title: 'Profile',
          body: [
            { type: 'input-text', name: 'username', label: 'Username' },
            { type: 'input-email', name: 'email', label: 'Email' },
          ],
        },
      ],
    },
  ],
};

const collapsibleFieldset = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'advancedSettings',
      body: [
        {
          type: 'fieldset',
          title: 'Advanced Settings',
          collapsible: true,
          collapsed: true,
          body: [
            { type: 'input-password', name: 'token', label: 'Access Token' },
            { type: 'textarea', name: 'notes', label: 'Notes' },
          ],
        },
      ],
    },
  ],
};

const collapsibleFieldsetWithSubmit = {
  type: 'page',
  body: [
    {
      type: 'form',
      data: { username: '', token: '' },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'fieldset',
          title: 'Profile',
          body: [{ type: 'input-text', name: 'username', label: 'Username' }],
        },
        {
          type: 'fieldset',
          title: 'Advanced Settings',
          collapsible: true,
          collapsed: true,
          body: [
            { type: 'input-text', name: 'token', label: 'Access Token' },
            { type: 'textarea', name: 'notes', label: 'Notes' },
          ],
        },
        {
          type: 'text',
          text: '${submitted ? "Submitted: " + username + " / " + token : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function FieldsetLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Semantic field grouping container with optional legend and collapsible body. Commonly used to organize related form fields into readable sections."
      scenarios={[
        {
          title: 'Basic field grouping',
          description:
            'A fieldset can wrap related form inputs under a shared legend without introducing a new form owner.',
          schema: basicFieldset,
        },
        {
          title: 'Collapsible fieldset',
          description:
            'Fieldsets can also start collapsed and toggle their body visibility through the legend.',
          schema: collapsibleFieldset,
        },
        {
          title: 'Collapsible fieldset inside submitting form',
          description:
            'Nested fieldsets group isolated fields; expanding the collapsible legend with Enter must NOT submit the form, and the submitted values echo back.',
          schema: collapsibleFieldsetWithSubmit,
        },
      ]}
    />
  );
}
