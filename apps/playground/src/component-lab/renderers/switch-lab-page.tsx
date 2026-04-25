import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicSwitch = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'switch',
          name: 'enabled',
          label: 'Feature enabled',
          description: 'Toggle this to enable or disable the feature for your account.'
        },
        { type: 'text', text: 'Feature is: ${enabled ? "ON" : "OFF"}' }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

const multiSwitch = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'prefsForm',
      body: [
        { type: 'switch', name: 'notifications', label: 'Enable notifications', description: 'Receive alerts for new activity.' },
        { type: 'switch', name: 'darkMode', label: 'Dark mode', description: 'Use dark color scheme.' },
        { type: 'switch', name: 'analytics', label: 'Share analytics', description: 'Help improve the product by sharing usage data.' }
      ],
      actions: [
        { type: 'button', label: 'Save Preferences', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function SwitchLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Toggle switch bound to a boolean form field. Supports label and description text. The current state is immediately readable from the form scope."
      scenarios={[
        {
          title: 'Switch with in-form live summary',
          description: 'Toggle the switch to exercise the current boolean control state. The summary text is rendered inside the form scope and updates live.',
          schema: basicSwitch
        },
        {
          title: 'Multiple preference switches with descriptions',
          description: 'A typical preferences panel with three switches, each with a short description below the label.',
          schema: multiSwitch
        }
      ]}
    />
  );
}
