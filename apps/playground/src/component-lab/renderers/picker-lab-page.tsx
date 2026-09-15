import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const candidateEnv = {
  fetcher: async function <T>() {
    return {
      status: 0,
      data: {
        items: [
          { id: 'u1', title: 'Alice' },
          { id: 'u2', title: 'Bob' },
          { id: 'u3', title: 'Carol' },
        ],
        total: 3,
      } as T,
    };
  },
};

function candidatesPickerSchema(selectionType: 'radio' | 'checkbox') {
  return {
    type: 'crud',
    loadAction: { action: 'ajax', args: { url: '/api/candidates' } },
    columns: [{ name: 'title', label: 'Title' }],
    selection: { type: selectionType },
    selectionOwnership: 'scope',
    selectionStatePath: '$_picker.selection',
    dataStatePath: '$_picker.rows',
    autoClearSelectionOnRefresh: false,
  };
}

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
          pickerPopup: { title: 'Pick owner' },
          valueField: 'id',
          labelField: 'title',
          pickerSchema: candidatesPickerSchema('radio'),
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
          pickerPopup: { title: 'Pick reviewers' },
          valueField: 'id',
          labelField: 'title',
          pickerSchema: candidatesPickerSchema('checkbox'),
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const crudPickerEnv = {
  fetcher: async function <T>() {
    return {
            status: 0,
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
              pickerPopup: { title: 'Pick owner', size: 'lg' },
              valueField: 'id',
              labelField: 'title',
              pickerSchema: {
                type: 'crud',
                loadAction: { action: 'ajax', args: { url: '/api/owners' } },
                columns: [{ name: 'title', label: 'Title' }],
                selection: { type: 'radio' },
                selectionOwnership: 'scope',
                selectionStatePath: '$_picker.selection',
                dataStatePath: '$_picker.rows',
                autoClearSelectionOnRefresh: false,
              },
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
      introDescription="Dialog-layer selection field. Popup surface via pickerPopup, content via pickerSchema (the sole content definition); open/clear via the useInputComponentHandle slot."
      scenarios={[
        {
          title: 'Single owner pick',
          description:
            'Open the dialog, pick one candidate, confirm. valueField/labelField map the picked record onto the form value.',
          schema: ownerPicker,
          env: candidateEnv,
        },
        {
          title: 'Multiple reviewers pick',
          description:
            'multiple: true accumulates rows and Confirm commits the set as an array. clear empties the field via the canonical clear handle.',
          schema: reviewersPicker,
          env: candidateEnv,
        },
        {
          title: 'CRUD-mode picker per-row isolation (bug 73 pattern)',
          description:
            'Two combo rows each host a CRUD-mode picker (pickerSchema crud). Opening row 1 while row 0 selection is pending must not clobber row 0; each confirm writes back to its own row.',
          schema: crudRowIsolation,
          env: crudPickerEnv,
        },
      ]}
    />
  );
}
