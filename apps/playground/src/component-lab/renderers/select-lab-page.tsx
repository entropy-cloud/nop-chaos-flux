import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

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
          options: [
            { label: 'United States', value: 'us' },
            { label: 'United Kingdom', value: 'uk' },
            { label: 'Canada', value: 'ca' },
            { label: 'Australia', value: 'au' },
            { label: 'Germany', value: 'de' },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const inlineOptions = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'skillSelectForm',
      body: [
        {
          type: 'select',
          name: 'skill',
          label: 'Primary Skill',
          options: [
            { label: 'TypeScript', value: 'ts' },
            { label: 'React', value: 'react' },
            { label: 'Node.js', value: 'node' },
            { label: 'PostgreSQL', value: 'postgres' },
            { label: 'Docker', value: 'docker' },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function SelectLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Single-value dropdown selector. Options can be provided inline or from an async source."
      scenarios={[
        {
          title: 'Single-value select with inline options',
          description:
            'A required country selector backed by inline options. After selection, the trigger shows the option label while the bound scope value remains the option value.',
          schema: singleSelect,
        },
        {
          title: 'Single-value skill select',
          description:
            'A second single-value select showing another inline option set for form usage.',
          schema: inlineOptions,
        },
      ]}
    />
  );
}
