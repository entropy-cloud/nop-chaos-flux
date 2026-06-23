import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const datetimeInput = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'datetimeForm',
      data: { at: '2024-06-09 14:30' },
      body: [
        {
          type: 'input-datetime',
          name: 'at',
          label: 'Appointment',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function InputDatetimeLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Single-value date+time field. Selects a date via the shared calendar and refines the hour/minute; preserves the existing time when re-picking the date."
      scenarios={[
        {
          title: 'Date + time precision',
          description:
            'The Appointment field combines a calendar date with hour/minute inputs in the popover.',
          schema: datetimeInput,
        },
      ]}
    />
  );
}
