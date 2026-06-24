import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const singleQuarter = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'quarterForm',
      data: { quarter: '2024-Q3' },
      body: [
        { type: 'input-quarter', name: 'quarter', label: 'Quarter', clearable: true },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const rangeQuarter = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'quarterRangeForm',
      data: { quarterRange: '2024-Q1,2024-Q4' },
      body: [
        {
          type: 'input-quarter',
          name: 'quarterRange',
          label: 'Quarter range',
          selectionMode: 'range',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function InputQuarterLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Quarter field family owner — year input + quarter select storing YYYY-Qq. Quarter↔date normalization keeps range ordering consistent."
      scenarios={[
        {
          title: 'single value',
          description: 'Year number input plus a Q1–Q4 select; value stored as 2024-Q3.',
          schema: singleQuarter,
        },
        {
          title: 'range (selectionMode=range)',
          description: 'Two quarter pickers; reversed quarters swap so start ≤ end.',
          schema: rangeQuarter,
        },
      ]}
    />
  );
}
