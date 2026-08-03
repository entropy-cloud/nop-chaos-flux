import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const simpleFilter = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'cbForm',
      data: {
        filter: {
          combinator: 'and',
          rules: [{ field: 'status', operator: 'eq', value: 'active' }],
        },
      },
      body: [
        {
          type: 'condition-builder',
          name: 'filter',
          label: 'Filter Rules',
          fields: [
            { name: 'status', label: 'Status', operators: ['eq', 'neq'] },
            { name: 'role', label: 'Role', operators: ['eq', 'neq', 'in'] },
            { name: 'email', label: 'Email', operators: ['contains', 'startsWith'] },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Apply Filter', onClick: { action: 'submitForm' } }],
    },
  ],
};

const complexFilter = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'complexCbForm',
      data: {
        query: {
          combinator: 'and',
          rules: [
            { field: 'age', operator: 'gt', value: 18 },
            { field: 'status', operator: 'eq', value: 'active' },
            {
              combinator: 'or',
              rules: [
                { field: 'role', operator: 'eq', value: 'admin' },
                { field: 'role', operator: 'eq', value: 'editor' },
              ],
            },
          ],
        },
      },
      body: [
        {
          type: 'condition-builder',
          name: 'query',
          label: 'Query Filter',
          fields: [
            {
              name: 'age',
              label: 'Age',
              type: 'number',
              operators: ['eq', 'gt', 'lt', 'gte', 'lte'],
            },
            {
              name: 'status',
              label: 'Status',
              operators: ['eq', 'neq'],
              options: [
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ],
            },
            {
              name: 'role',
              label: 'Role',
              operators: ['eq', 'neq', 'in'],
              options: [
                { label: 'Admin', value: 'admin' },
                { label: 'Editor', value: 'editor' },
                { label: 'Viewer', value: 'viewer' },
              ],
            },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Run Query', onClick: { action: 'submitForm' } }],
    },
  ],
};

const hostSubmit = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.hostFilter',
      data: {
        filter: {
          id: 'root',
          conjunction: 'and',
          children: [{ id: 'i1', left: { type: 'field', field: 'status' }, op: 'equal', right: 'active' }],
        },
      },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'condition-builder',
          name: 'filter',
          label: 'Filter Rules',
          fields: [
            { name: 'status', label: 'Status', type: 'select', options: [
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ] },
            { name: 'age', label: 'Age', type: 'number' },
          ],
        },
        {
          type: 'text',
          testid: 'cb-host-echo',
          text: '${submitted ? "CB-HOST:" + $JSON.stringify(ui.hostFilter.filter) : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const hostDisabled = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.disabledFilter',
      data: {
        filter: {
          id: 'root',
          conjunction: 'and',
          children: [{ id: 'i1', left: { type: 'field', field: 'status' }, op: 'equal', right: 'locked' }],
        },
      },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'condition-builder',
          name: 'filter',
          label: 'Filter Rules',
          disabled: true,
          fields: [{ name: 'status', label: 'Status', type: 'text' }],
        },
        {
          type: 'text',
          testid: 'cb-disabled-echo',
          text: '${submitted ? "CB-DISABLED:" + $JSON.stringify(ui.disabledFilter.filter) : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const hostReadOnly = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.readonlyFilter',
      data: {
        filter: {
          id: 'root',
          conjunction: 'and',
          children: [{ id: 'i1', left: { type: 'field', field: 'status' }, op: 'equal', right: 'frozen' }],
        },
      },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'condition-builder',
          name: 'filter',
          label: 'Filter Rules',
          readOnly: true,
          fields: [{ name: 'status', label: 'Status', type: 'text' }],
        },
        {
          type: 'text',
          testid: 'cb-readonly-echo',
          text: '${submitted ? "CB-READONLY:" + $JSON.stringify(ui.readonlyFilter.filter) : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const hostCustomEditor = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.customFilter',
      data: {
        filter: {
          id: 'root',
          conjunction: 'and',
          children: [{ id: 'i1', left: { type: 'field', field: 'role' }, op: 'equal', right: 'editor' }],
        },
        frozenFilter: {
          id: 'root',
          conjunction: 'and',
          children: [{ id: 'i2', left: { type: 'field', field: 'role' }, op: 'equal', right: 'editor' }],
        },
      },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'condition-builder',
          name: 'filter',
          label: 'Custom editor',
          fields: [
            {
              name: 'role',
              label: 'Role',
              type: 'custom',
              operators: ['equal'],
              value: {
                type: 'select',
                name: 'value',
                placeholder: 'Pick role',
                options: [
                  { label: 'Editor', value: 'editor' },
                  { label: 'Viewer', value: 'viewer' },
                ],
              },
            },
          ],
        },
        {
          type: 'condition-builder',
          name: 'frozenFilter',
          label: 'Custom editor (disabled)',
          disabled: true,
          fields: [
            {
              name: 'role',
              label: 'Role',
              type: 'custom',
              operators: ['equal'],
              value: {
                type: 'select',
                name: 'value',
                placeholder: 'Frozen role',
                options: [
                  { label: 'Editor', value: 'editor' },
                  { label: 'Viewer', value: 'viewer' },
                ],
              },
            },
          ],
        },
        {
          type: 'text',
          testid: 'cb-custom-echo',
          text: '${submitted ? "CB-CUSTOM:" + $JSON.stringify(ui.customFilter.filter) + "|" + $JSON.stringify(ui.customFilter.frozenFilter) : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function ConditionBuilderLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Visual AND/OR condition tree builder. Add rules, switch combinators, and create nested rule groups. The value is a structured condition object."
      scenarios={[
        {
          title: 'Simple single-rule AND group',
          description:
            'Pre-populated with one rule: status equals active. Add more rules or change the combinator to OR.',
          schema: simpleFilter,
        },
        {
          title: 'Complex filter with nested OR group',
          description:
            'An AND group containing two simple rules and a nested OR sub-group that matches either admin or editor roles.',
          schema: complexFilter,
        },
        {
          title: 'Host form build conditions + submit (bug 73 pattern)',
          description:
            'Edit the pre-seeded rule value, add a rule and a nested group, then submit. valuesPath publishes the committed condition tree; the echo asserts the exact committed shape (single-test-green-but-real-browser-failure class).',
          schema: hostSubmit,
        },
        {
          title: 'Disabled condition builder submit (unchanged values)',
          description:
            'disabled: true freezes every affordance; submit echoes the untouched condition tree.',
          schema: hostDisabled,
        },
        {
          title: 'Read-only condition builder submit (unchanged values)',
          description:
            'readOnly: true folds into the same umbrella as disabled (C3.3 P1-1); submit echoes the untouched condition tree.',
          schema: hostReadOnly,
        },
        {
          title: 'Custom value editor write-back + disabled freeze',
          description:
            'A select-based custom value editor writes back into the condition value; the disabled copy renders the editor readonly (C3.3 P1-2).',
          schema: hostCustomEditor,
        },
      ]}
    />
  );
}
