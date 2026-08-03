import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const singleMonth = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'monthForm',
      data: { month: '2024-06' },
      body: [
        {
          type: 'input-month',
          name: 'month',
          label: 'Month',
          clearable: true,
          minDate: '2024-01',
          maxDate: '2024-12',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const rangeMonth = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'monthRangeForm',
      data: { monthRange: '2024-01,2024-06' },
      body: [
        {
          type: 'input-month',
          name: 'monthRange',
          label: 'Month range',
          selectionMode: 'range',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const periodFamilyComposite = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.periods',
      data: { monthRange: '2024-01,2024-06', quarterRange: '2024-Q1,2024-Q4', year: '2024' },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'input-month',
          name: 'monthRange',
          label: 'Month range',
          selectionMode: 'range',
        },
        {
          type: 'input-quarter',
          name: 'quarterRange',
          label: 'Quarter range',
          selectionMode: 'range',
        },
        { type: 'input-year', name: 'year', label: 'Year' },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
    {
      type: 'text',
      text:
        '${submitted && ui.periods ? "Period: " + ui.periods.monthRange + " | " + ui.periods.quarterRange + " | " + ui.periods.year : ""}',
    },
  ],
};

export function InputMonthLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Month field family owner — native month input with YYYY-MM storage round-trip. selectionMode=range emits a delimiter-joined pair without a second canonical type."
      scenarios={[
        {
          title: 'single value (bounded + clearable)',
          description: 'minDate/maxDate clamp the selectable window; clearable resets to undefined.',
          schema: singleMonth,
        },
        {
          title: 'range (selectionMode=range)',
          description: 'Two month inputs joined by a delimiter; reversed ends normalize on write.',
          schema: rangeMonth,
        },
        {
          title: 'Period family composite submit (range mode)',
          description:
            'Month range + quarter range + year in one form: real input into every control, submit, valuesPath publishes the committed range shapes into the page scope where an outer text echoes them.',
          schema: periodFamilyComposite,
        },
      ]}
    />
  );
}
