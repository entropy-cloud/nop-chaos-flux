import { MultiScenarioLabPage } from '../MultiScenarioLabPage';

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

const singleSelect = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'treeSelectForm',
      body: [
        {
          type: 'tree-select',
          name: 'team',
          label: 'Select Team',
          searchable: true,
          options: orgTreeOptions
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    },
    { type: 'text', text: 'Selected: ${treeSelectForm.team ?? "(none)"}' }
  ]
};

const multiSelect = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'treeMultiSelectForm',
      body: [
        {
          type: 'tree-select',
          name: 'departments',
          label: 'Departments (multi-select)',
          multiple: true,
          searchable: true,
          options: orgTreeOptions
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    },
    { type: 'text', text: 'Selected: ${(treeMultiSelectForm.departments ?? []).join(", ") || "(none)"}' }
  ]
};

export function TreeSelectLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Popover-based tree selector. Click the trigger to open an expandable tree. Supports single and multi-select modes with search."
      scenarios={[
        {
          title: 'Single-value tree select with search',
          description: 'Click the trigger to open the popover tree. Use the search box to filter nodes. The selected value is shown below.',
          schema: singleSelect
        },
        {
          title: 'Multi-select tree with search',
          description: 'With multiple: true, several nodes can be selected. All selected IDs are shown as a comma-separated list.',
          schema: multiSelect
        }
      ]}
    />
  );
}
