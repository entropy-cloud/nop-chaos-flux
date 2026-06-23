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
      ]}
    />
  );
}
