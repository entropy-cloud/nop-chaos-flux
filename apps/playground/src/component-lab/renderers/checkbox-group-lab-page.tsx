import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicCheckboxGroup = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'checkboxGroupForm',
      body: [
        {
          type: 'checkbox-group',
          name: 'interests',
          label: 'Interests',
          options: [
            { label: 'TypeScript', value: 'ts' },
            { label: 'React', value: 'react' },
            { label: 'Rust', value: 'rust' },
            { label: 'Go', value: 'go' }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

const withMinMaxValidation = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'skillsForm',
      body: [
        {
          type: 'checkbox-group',
          name: 'skills',
          label: 'Top Skills (choose 2 to 4)',
          minSelect: 2,
          maxSelect: 4,
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
        { type: 'button', label: 'Submit', onClick: { action: 'submit' } }
      ]
    },
    { type: 'text', text: 'Selected: ${(skillsForm.skills ?? []).join(", ") || "(none)"}' }
  ]
};

export function CheckboxGroupLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Multi-choice checkbox group. Supports min/max selection validation and dynamic option lists. Selected values are available as an array in the form scope."
      scenarios={[
        {
          title: 'Basic multi-select checkbox group',
          description: 'Check any combination of interests. The array value is submitted to the form.',
          schema: basicCheckboxGroup
        },
        {
          title: 'Checkbox group with min/max selection validation',
          description: 'Select between 2 and 4 skills. The checkbox states update correctly and the group still exercises min/max validation authoring; the text line below currently remains a static summary prefix in the live lab surface.',
          schema: withMinMaxValidation
        }
      ]}
    />
  );
}
