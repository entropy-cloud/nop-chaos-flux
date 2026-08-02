import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicSingle = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'siteForm',
      body: [
        {
          type: 'button-group-select',
          name: 'site',
          label: 'Site',
          options: [
            { label: 'Main', value: 'main' },
            { label: 'Secondary', value: 'secondary' },
            { label: 'Staging', value: 'staging' },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const basicMultiple = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'roleForm',
      body: [
        {
          type: 'button-group-select',
          name: 'roles',
          label: 'Roles',
          multiple: true,
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Editor', value: 'editor' },
            { label: 'Viewer', value: 'viewer' },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function ButtonGroupSelectLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Button-styled single/multiple select field (AMIS button-group-select). Options render as toggleable buttons; single mode selects one, multiple mode toggles independently."
      scenarios={[
        {
          title: 'Single-select button group',
          description: 'Click a button to select its value; the selection is bound to the form field.',
          schema: basicSingle,
        },
        {
          title: 'Multiple-select button group',
          description: 'Toggle any combination of roles; the array value is submitted to the form.',
          schema: basicMultiple,
        },
      ]}
    />
  );
}
