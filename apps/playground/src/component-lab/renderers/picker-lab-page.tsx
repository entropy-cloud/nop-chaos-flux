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
      ]}
    />
  );
}
