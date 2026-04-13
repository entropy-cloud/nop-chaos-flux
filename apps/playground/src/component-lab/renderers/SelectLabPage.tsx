import { MultiScenarioLabPage } from '../MultiScenarioLabPage';

const singleSelect = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'selectForm',
      body: [
        {
          type: 'select',
          name: 'country',
          label: 'Country',
          required: true,
          clearable: true,
          options: [
            { label: 'United States', value: 'us' },
            { label: 'United Kingdom', value: 'uk' },
            { label: 'Canada', value: 'ca' },
            { label: 'Australia', value: 'au' },
            { label: 'Germany', value: 'de', disabled: true }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Submit', onClick: { action: 'submit' } }
      ]
    }
  ]
};

const multiSelect = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'multiSelectForm',
      body: [
        {
          type: 'select',
          name: 'skills',
          label: 'Skills',
          multiple: true,
          clearable: true,
          options: [
            { label: 'TypeScript', value: 'ts' },
            { label: 'React', value: 'react' },
            { label: 'Node.js', value: 'node' },
            { label: 'PostgreSQL', value: 'postgres' },
            { label: 'Docker', value: 'docker' }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function SelectLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Dropdown selector for single or multiple values. Options can be provided inline or from an async source. Supports clearable and disabled options."
      scenarios={[
        {
          title: 'Single-value select with clearable and disabled option',
          description: 'A required country selector. clearable: true adds an X button. Germany is disabled and cannot be selected.',
          schema: singleSelect
        },
        {
          title: 'Multi-select with clearable',
          description: 'With multiple: true, the user can pick multiple skills. clearable: true allows clearing all selections at once.',
          schema: multiSelect
        }
      ]}
    />
  );
}
