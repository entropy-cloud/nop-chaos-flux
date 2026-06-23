import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const dateRange = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'dateRangeForm',
      data: { range: '2024-06-01,2024-06-10' },
      body: [
        {
          type: 'date-range',
          name: 'range',
          label: 'Date range',
          clearable: true,
          shortcuts: [
            { label: 'Last 7 days', start: '2024-06-03', end: '2024-06-10' },
            { label: 'Whole month', start: '2024-06-01', end: '2024-06-30' },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const timeRange = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'timeRangeForm',
      data: { range: '09:00,17:00' },
      body: [
        {
          type: 'date-range',
          name: 'range',
          label: 'Working hours',
          rangeKind: 'time',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const datetimeRange = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'datetimeRangeForm',
      data: { range: '2024-06-09 09:00,2024-06-09 17:00' },
      body: [
        {
          type: 'date-range',
          name: 'range',
          label: 'Event window',
          rangeKind: 'datetime',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function DateRangeLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Canonical range owner — one type unifies date/datetime/time via rangeKind. The same component normalizes start>end ordering and joins ends with a delimiter (no parallel input-*-range types)."
      scenarios={[
        {
          title: 'rangeKind=date + shortcuts',
          description: 'Calendar range picker with preset shortcuts and clearable.',
          schema: dateRange,
        },
        {
          title: 'rangeKind=time',
          description: 'Two native time inputs for a working-hours window.',
          schema: timeRange,
        },
        {
          title: 'rangeKind=datetime',
          description: 'Calendar range plus per-end time inputs.',
          schema: datetimeRange,
        },
      ]}
    />
  );
}
