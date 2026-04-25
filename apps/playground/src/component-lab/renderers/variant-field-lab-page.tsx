import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const stringOrListVariant = {
  type: 'page',
  body: [
    {
      type: 'form',
      id: 'variant-field-string-or-list',
      name: 'variantFieldForm',
      onSubmitSuccess: [
        { action: 'setValue', args: { path: 'submittedVariantValue', value: '${variantFieldForm.filterValue}' } },
        { action: 'setValue', args: { path: 'submittedVariantText', value: '${Array.isArray(variantFieldForm.filterValue) ? "LIST => " + ((variantFieldForm.filterValue ?? []).join(", ") || "(empty)") : "TEXT => " + (variantFieldForm.filterValue ?? "")}' } }
      ],
      data: {
        filterValue: 'status = active'
      },
      body: [
        {
          type: 'text',
          text: 'Current runtime value: ${Array.isArray(variantFieldForm.filterValue) ? "List editor active" : "String editor active"}'
        },
        {
          type: 'variant-field',
          name: 'filterValue',
          label: 'Filter Value',
          defaultVariant: 'text',
          selector: { mode: 'tabs' },
          variants: [
            {
              key: 'text',
              label: 'Single String',
              match: { kind: 'typeof', value: 'string' },
              initialValue: 'status = active',
              content: [
                { type: 'input-text', name: '', label: 'Expression', required: true, placeholder: 'status = active' },
                { type: 'text', text: 'Editing one string value. Submit result should be plain text.' }
              ]
            },
            {
              key: 'list',
              label: 'String List',
              match: { kind: 'array' },
              initialValue: ['status = active', 'role = admin'],
              content: [
                {
                  type: 'array-field',
                  name: '',
                  label: 'Expressions',
                  itemKind: 'scalar',
                  item: [{ type: 'input-text', name: 'value', label: 'Expression', required: true }]
                },
                { type: 'text', text: 'Editing a string array. Add/remove rows to verify list output.' }
              ]
            }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Submit Filter Value', onClick: { action: 'component:submit', componentId: 'variant-field-string-or-list' } }
      ]
    },
    {
      type: 'text',
      text: '${submittedVariantText ?? "Switch type, edit, and submit to verify output shape."}'
    }
  ]
};

export function VariantFieldLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Variant field edits one value with multiple shapes. This demo uses a very obvious string-vs-list switch so you can see both the active editor and the submitted output change together."
      scenarios={[
        {
          title: 'String vs list editor with visible submit result',
          description: 'The selected tab should be visibly active. Switch between a single string input and a list editor, edit both forms, and verify the active editor plus bound scope state change with the selected variant.',
          schema: stringOrListVariant
        }
      ]}
    />
  );
}
