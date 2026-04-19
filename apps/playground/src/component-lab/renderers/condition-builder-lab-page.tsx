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
          rules: [
            { field: 'status', operator: 'eq', value: 'active' }
          ]
        }
      },
      body: [
        {
          type: 'condition-builder',
          name: 'filter',
          label: 'Filter Rules',
          fields: [
            { name: 'status', label: 'Status', operators: ['eq', 'neq'] },
            { name: 'role', label: 'Role', operators: ['eq', 'neq', 'in'] },
            { name: 'email', label: 'Email', operators: ['contains', 'startsWith'] }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Apply Filter', onClick: { action: 'submit' } }
      ]
    }
  ]
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
                { field: 'role', operator: 'eq', value: 'editor' }
              ]
            }
          ]
        }
      },
      body: [
        {
          type: 'condition-builder',
          name: 'query',
          label: 'Query Filter',
          fields: [
            { name: 'age', label: 'Age', type: 'number', operators: ['eq', 'gt', 'lt', 'gte', 'lte'] },
            { name: 'status', label: 'Status', operators: ['eq', 'neq'], options: [
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' }
            ]},
            { name: 'role', label: 'Role', operators: ['eq', 'neq', 'in'], options: [
              { label: 'Admin', value: 'admin' },
              { label: 'Editor', value: 'editor' },
              { label: 'Viewer', value: 'viewer' }
            ]}
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Run Query', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function ConditionBuilderLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Visual AND/OR condition tree builder. Add rules, switch combinators, and create nested rule groups. The value is a structured condition object."
      scenarios={[
        {
          title: 'Simple single-rule AND group',
          description: 'Pre-populated with one rule: status equals active. Add more rules or change the combinator to OR.',
          schema: simpleFilter
        },
        {
          title: 'Complex filter with nested OR group',
          description: 'An AND group containing two simple rules and a nested OR sub-group that matches either admin or editor roles.',
          schema: complexFilter
        }
      ]}
    />
  );
}
