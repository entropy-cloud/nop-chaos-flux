import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicIconPicker = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'iconPickerForm',
      data: { menuIcon: undefined },
      body: [
        {
          type: 'icon-picker',
          name: 'menuIcon',
          label: 'Menu Icon',
          placeholder: 'Select an icon',
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const withDefault = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'iconDefaultForm',
      data: { buttonIcon: 'settings' },
      body: [
        {
          type: 'icon-picker',
          name: 'buttonIcon',
          label: 'Button Icon',
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const disabledIconPicker = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'iconDisabledForm',
      data: { lockedIcon: 'home' },
      body: [
        {
          type: 'icon-picker',
          name: 'lockedIcon',
          label: 'Locked Icon',
          disabled: true,
        },
      ],
    },
  ],
};

export function IconPickerLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Popover-based Lucide icon picker with search, grid layout, and Ant Design name compatibility."
      scenarios={[
        {
          title: 'Basic icon picker',
          description: 'Open the popover, search and select an icon. Value writes to the form field.',
          schema: basicIconPicker,
        },
        {
          title: 'With default value',
          description: 'Pre-populated with "settings". Trigger shows the selected icon preview.',
          schema: withDefault,
        },
        {
          title: 'Disabled state',
          description: 'disabled: true prevents opening the popover and clearing the value.',
          schema: disabledIconPicker,
        },
      ]}
    />
  );
}
