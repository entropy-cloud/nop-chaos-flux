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
      ]}
    />
  );
}
