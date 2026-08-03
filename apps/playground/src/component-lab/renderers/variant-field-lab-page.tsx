import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const stringOrListVariant = {
  type: 'page',
  body: [
    {
      type: 'form',
      id: 'variant-field-string-or-list',
      onSubmitSuccess: [
        { action: 'setValue', args: { path: 'submittedVariantValue', value: '${filterValue}' } },
        {
          action: 'setValue',
          args: {
            path: 'submittedVariantText',
            value:
              '${ISARRAY(filterValue) ? "LIST => " + JOIN(filterValue ?? [], ", ") : "TEXT => " + (filterValue ?? "")}',
          },
        },
      ],
      data: {
        filterValue: 'status = active',
      },
      body: [
        {
          type: 'text',
          text: 'Current runtime value: ${ISARRAY(filterValue) ? "List editor active" : "String editor active"}',
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
                {
                  type: 'input-text',
                  name: '',
                  label: 'Expression',
                  required: true,
                  placeholder: 'status = active',
                },
                {
                  type: 'text',
                  text: 'Editing one string value. Submit result should be plain text.',
                },
              ],
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
                  item: [
                    { type: 'input-text', name: 'value', label: 'Expression', required: true },
                  ],
                },
                {
                  type: 'text',
                  text: 'Editing a string array. Add/remove rows to verify list output.',
                },
              ],
            },
          ],
        },
      ],
      actions: [
        {
          type: 'button',
          label: 'Submit Filter Value',
          onClick: { action: 'component:submit', componentId: 'variant-field-string-or-list' },
        },
      ],
    },
    {
      type: 'text',
      text: '${submittedVariantText ?? "Switch type, edit, and submit to verify output shape."}',
    },
  ],
};

const variantSwitchSubmit = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'variantSwitchForm',
      valuesPath: 'ui.variantValue',
      data: {
        contactMode: 'single',
      },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'variant-field',
          name: 'contactMode',
          label: 'Contact Mode',
          selector: { mode: 'select' },
          variants: [
            {
              key: 'single',
              label: 'Single Contact',
              match: { kind: 'typeof', value: 'string' },
              initialValue: 'a@example.com',
              content: [
                { type: 'input-text', name: 'value', label: 'Email', placeholder: 'VEmail' },
              ],
            },
            {
              key: 'multiple',
              label: 'Multiple Contacts',
              match: { kind: 'array' },
              initialValue: ['a@example.com', 'b@example.com'],
              content: [
                { type: 'array-field', name: '', label: 'Emails', itemKind: 'scalar', item: [{ type: 'input-text', name: 'value', placeholder: 'VEmailItem' }] },
              ],
            },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
    {
      type: 'text',
      testid: 'variant-echo',
      text: '${submitted ? "Variant: " + $JSON.stringify(ui.variantValue.contactMode) : ""}',
    },
  ],
};

export function VariantFieldLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Variant field edits one value with multiple shapes. This demo uses a very obvious string-vs-list switch so you can see the active editor and bound scope state change together."
      scenarios={[
        {
          title: 'String vs list editor with scope-state switching',
          description:
            'The selected tab should be visibly active. Switch between a single string input and a list editor, edit both forms, and verify the active editor plus bound scope state change with the selected variant.',
          schema: stringOrListVariant,
        },
        {
          title: 'Variant switch writes value + submit echo (bug 73 pattern)',
          description:
            'Switching the select writes the variant initialValue into the form value; editing the active branch and submitting echoes the exact committed shape.',
          schema: variantSwitchSubmit,
        },
      ]}
    />
  );
}
