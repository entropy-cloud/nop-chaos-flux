import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicSlider = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'slider',
          name: 'volume',
          label: 'Volume',
          min: 0,
          max: 100,
          step: 1,
          value: 40,
          description: 'Drag the thumb or focus it and use arrow keys; the live summary reads the bound value.',
        },
        { type: 'text', text: 'Current volume: ${volume}' },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const rangeSlider = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'rangeForm',
      body: [
        {
          type: 'slider',
          name: 'brightness',
          label: 'Brightness',
          min: 10,
          max: 90,
          step: 10,
        },
        {
          type: 'slider',
          name: 'disabledSlider',
          label: 'Disabled slider (bound to 60)',
          min: 0,
          max: 100,
          value: 60,
          disabled: true,
        },
        {
          type: 'slider',
          name: 'coarseStep',
          label: 'Coarse step (25, max 200)',
          min: 0,
          max: 200,
          step: 25,
        },
        {
          type: 'slider',
          name: 'zeroStep',
          label: 'Non-positive step falls back to 1 (bound to 10)',
          min: 0,
          max: 20,
          step: 0,
          value: 10,
        },
      ],
      actions: [{ type: 'button', label: 'Apply', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function SliderLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Slider bound to a numeric form field (missing-components L1). min/max/step contracts, keyboard stepping, disabled presentation, and a live bound-value readout."
      scenarios={[
        {
          title: 'Slider with in-form live summary',
          description:
            'Arrow-key or drag the thumb; the summary text re-renders from the bound form value live.',
          schema: basicSlider,
        },
        {
          title: 'Bounded ranges, coarse steps, and disabled state',
          description:
            'Non-default min/max, a step of 25, and a disabled slider bound to a fixed value.',
          schema: rangeSlider,
        },
      ]}
    />
  );
}
