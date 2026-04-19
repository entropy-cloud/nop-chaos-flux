import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const orgTreeOptions = [
  {
    label: 'Engineering',
    value: 'engineering',
    children: [
      { label: 'Frontend', value: 'frontend', children: [] },
      { label: 'Backend', value: 'backend', children: [] },
      { label: 'Platform', value: 'platform', children: [] }
    ]
  },
  {
    label: 'Design',
    value: 'design',
    children: [
      { label: 'UX Research', value: 'ux', children: [] },
      { label: 'Brand', value: 'brand', children: [] }
    ]
  },
  {
    label: 'Operations',
    value: 'ops',
    children: [
      { label: 'DevOps', value: 'devops', children: [] },
      { label: 'Support', value: 'support', children: [] }
    ]
  }
];

const radioMode = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'inputTreeForm',
      body: [
        {
          type: 'input-tree',
          name: 'department',
          label: 'Department (single select)',
          treeMode: 'radio',
          options: orgTreeOptions
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    },
    { type: 'text', text: 'Selected: ${inputTreeForm.department ?? "(none)"}' }
  ]
};

const checkboxMode = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'inputTreeCheckForm',
      body: [
        {
          type: 'input-tree',
          name: 'teams',
          label: 'Teams (multi-select)',
          treeMode: 'checkbox',
          options: orgTreeOptions
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    },
    { type: 'text', text: 'Selected IDs: ${(inputTreeCheckForm.teams ?? []).join(", ") || "(none)"}' }
  ]
};

export function InputTreeLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Inline tree selector with radio (single) and checkbox (multi) modes. The tree nodes expand and collapse; selected values are stored in the form field."
      scenarios={[
        {
          title: 'Radio mode — single department selection',
          description: 'Only one node can be selected at a time. The selected department ID is shown below.',
          schema: radioMode
        },
        {
          title: 'Checkbox mode — multi-team selection',
          description: 'Multiple nodes can be checked simultaneously. Selected IDs are displayed as a comma-separated list.',
          schema: checkboxMode
        }
      ]}
    />
  );
}
