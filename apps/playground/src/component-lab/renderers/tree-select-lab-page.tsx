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

const singleSelect = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'tree-select',
          name: 'team',
          label: 'Select Team',
          searchable: true,
          options: orgTreeOptions
        },
        { type: 'text', text: 'Selected: ${team ?? "(none)"}' }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

const checkboxTreeSelect = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'tree-select',
          name: 'departments',
          label: 'Departments (checkbox mode)',
          treeMode: 'checkbox',
          searchable: true,
          options: orgTreeOptions
        },
        { type: 'text', text: 'Selected: ${(departments ?? []).join(", ") || "(none)"}' }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function TreeSelectLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Popover-based tree selector. Click the trigger to open an expandable tree. Supports single-value and checkbox tree modes with search."
      scenarios={[
        {
          title: 'Single-value tree select with search',
          description: 'Click the trigger to open the popover tree. Use the search box to filter nodes. The selected value is reflected in the trigger and scope-debug state.',
          schema: singleSelect
        },
        {
          title: 'Checkbox tree-select with search',
          description: 'With treeMode: checkbox, several nodes can be selected. All selected IDs are shown as a comma-separated list.',
          schema: checkboxTreeSelect
        }
      ]}
    />
  );
}
