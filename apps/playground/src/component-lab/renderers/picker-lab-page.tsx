import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const ownerPicker = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'pickerForm',
      data: { owner: undefined },
      body: [
        {
          type: 'picker',
          name: 'owner',
          label: 'Owner',
          pickerDialog: { title: 'Pick owner' },
          valueKey: 'id',
          labelKey: 'title',
          options: [
            { id: 'u1', title: 'Alice' },
            { id: 'u2', title: 'Bob' },
            { id: 'u3', title: 'Carol' },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const reviewersPicker = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'pickerMultiForm',
      data: { reviewers: [] },
      body: [
        {
          type: 'picker',
          name: 'reviewers',
          label: 'Reviewers',
          multiple: true,
          pickerDialog: { title: 'Pick reviewers' },
          options: [
            { label: 'Alice', value: 'alice' },
            { label: 'Bob', value: 'bob' },
            { label: 'Carol', value: 'carol' },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const crudPickerEnv = {
  fetcher: async function <T>() {
    return {
      ok: true,
      status: 200,
      data: {
        items: [
          { id: 'a0', title: 'Alpha' },
          { id: 'b1', title: 'Beta' },
        ],
        total: 2,
      } as T,
    };
  },
};

const crudRowIsolation = {
  type: 'page',
  body: [
    {
      type: 'form',
      data: {
        rows: [
          { name: 'R0', owner: undefined },
          { name: 'R1', owner: undefined },
        ],
      },
      body: [
        {
          type: 'combo',
          name: 'rows',
          label: 'Rows',
          items: [
            { type: 'input-text', name: 'name', placeholder: 'PRow' },
            {
              type: 'picker',
              name: 'owner',
              label: 'Owner',
              pickerDialog: { title: 'Pick owner', size: 'lg' },
              loadAction: { action: 'ajax', args: { url: '/api/owners' } },
              valueKey: 'id',
              labelKey: 'title',
            },
          ],
        },
        { type: 'text', testid: 'picker-row-echo', text: 'PR:${$JSON.stringify(rows)}' },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function PickerLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Dialog-layer selection field. Reuses dialog surface + valueKey/labelKey normalization; open/clear via the useInputComponentHandle slot."
      scenarios={[
        {
          title: 'Single owner pick',
          description: 'Open the dialog, pick one candidate, confirm. valueKey/labelKey map the option record.',
          schema: ownerPicker,
        },
        {
          title: 'Multiple reviewers pick',
          description: 'multiple: true writes an array. clear empties the field via the canonical clear handle.',
          schema: reviewersPicker,
        },
        {
          title: 'CRUD-mode picker per-row isolation (bug 73 pattern)',
          description:
            'Two combo rows each host a CRUD-mode picker (loadAction). Opening row 1 while row 0 selection is pending must not clobber row 0; each confirm writes back to its own row.',
          schema: crudRowIsolation,
          env: crudPickerEnv,
        },
      ]}
    />
  );
}
