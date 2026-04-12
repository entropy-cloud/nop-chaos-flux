import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
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

export function ConditionBuilderLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Visual AND/OR condition tree builder. Add rules, switch combinators (AND/OR), and create nested groups."
      notes="This is the inline embedded mode. The condition-builder page in the main nav shows the full standalone mode."
    />
  );
}
