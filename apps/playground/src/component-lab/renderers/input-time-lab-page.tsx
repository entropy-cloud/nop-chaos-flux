import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const timeInput = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'timeForm',
      data: { at: '08:30' },
      body: [
        {
          type: 'input-time',
          name: 'at',
          label: 'Open at',
          minTime: '06:00',
          maxTime: '22:00',
          clearable: true,
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const customFormatTime = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'customTimeForm',
      data: { at: '0830' },
      body: [
        {
          type: 'input-time',
          name: 'at',
          label: 'Shift (HHmm)',
          valueFormat: 'HHmm',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function InputTimeLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Single-value time field. Routes the value through the shared date底层 for valueFormat/displayFormat conversion; clamps into the minTime/maxTime window."
      scenarios={[
        {
          title: 'Bounded, clearable time field',
          description: 'Open at is constrained to 06:00–22:00 and is clearable.',
          schema: timeInput,
        },
        {
          title: 'Custom valueFormat (HHmm)',
          description: 'Storage uses a compact HHmm token format while the control shows HH:mm.',
          schema: customFormatTime,
        },
      ]}
    />
  );
}
