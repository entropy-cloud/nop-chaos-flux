import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicDateInput = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'dateForm',
      data: { when: '2024-06-09' },
      body: [
        {
          type: 'input-date',
          name: 'when',
          label: 'When',
          displayFormat: 'DD/MM/YYYY',
          clearable: true,
        },
        {
          type: 'input-date',
          name: 'birthday',
          label: 'Birthday',
          minDate: '2000-01-01',
          maxDate: '2010-12-31',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const utcDateInput = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'utcDateForm',
      data: { when: '2024-06-09' },
      body: [
        {
          type: 'input-date',
          name: 'when',
          label: 'When (UTC storage)',
          utc: true,
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const dateFamilyComposite = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.dates',
      data: {
        when: '2024-06-09',
        at: '2024-06-09 14:30',
        open: '08:30',
        range: '2024-06-01,2024-06-10',
        month: '2024-06',
        quarter: '2024-Q3',
        year: '2024',
      },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        { type: 'input-date', name: 'when', label: 'When' },
        { type: 'input-datetime', name: 'at', label: 'Appointment' },
        { type: 'input-time', name: 'open', label: 'Open at' },
        {
          type: 'date-range',
          name: 'range',
          label: 'Date range',
          shortcuts: [{ label: 'Last 7 days', start: '2024-06-03', end: '2024-06-10' }],
        },
        { type: 'input-month', name: 'month', label: 'Month' },
        { type: 'input-quarter', name: 'quarter', label: 'Quarter' },
        { type: 'input-year', name: 'year', label: 'Year' },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
    {
      type: 'text',
      text:
        '${submitted && ui.dates ? "Date: " + ui.dates.when + " | " + ui.dates.at + " | " + ui.dates.open + " | " + ui.dates.range + " | " + ui.dates.month + " | " + ui.dates.quarter + " | " + ui.dates.year : ""}',
    },
  ],
};

export function InputDateLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Single-value date field built on the shared date底层 (react-day-picker + ui Calendar). Supports valueFormat/displayFormat, min/max bounds, UTC storage, and clearable."
      scenarios={[
        {
          title: 'Display format, clearable, and min/max bounds',
          description:
            'The When field shows DD/MM/YYYY and is clearable; Birthday is constrained to 2000–2010.',
          schema: basicDateInput,
        },
        {
          title: 'UTC storage round-trip',
          description:
            'utc:true stores UTC components so the value round-trips without timezone drift.',
          schema: utcDateInput,
        },
        {
          title: 'Date family composite submit (bug 73 pattern)',
          description:
            'All seven date-family controls in one form: real picker/input into each control, then submit. valuesPath publishes the committed values into the page scope where an outer text echoes all seven values.',
          schema: dateFamilyComposite,
        },
      ]}
    />
  );
}
