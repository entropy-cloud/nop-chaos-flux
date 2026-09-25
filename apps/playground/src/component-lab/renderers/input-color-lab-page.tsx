import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicColor = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'input-color',
          name: 'accent',
          label: 'Accent color',
          value: '#2563eb',
          description: 'Pick a preset swatch or type a hex/rgba value; commits normalized #rrggbb.',
        },
        { type: 'text', text: 'Current accent: ${accent}' },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const colorVariants = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'colorVariantsForm',
      body: [
        {
          type: 'input-color',
          name: 'rgbaColor',
          label: 'RGBA format (alpha preserved)',
          valueFormat: 'rgba',
          value: 'rgba(12, 34, 56, 0.8)',
        },
        {
          type: 'input-color',
          name: 'brandColors',
          label: 'Custom preset swatches',
          presetColors: ['#0f172a', '#f97316', '#22c55e', '#eab308', '#a855f7'],
        },
        {
          type: 'input-color',
          name: 'lockedColor',
          label: 'Read-only color (bound to #dc2626)',
          value: '#dc2626',
          readOnly: true,
        },
      ],
      actions: [{ type: 'button', label: 'Apply', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function InputColorLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Color picker bound to a string form field (missing-components L1). Preset swatches + free-form hex/rgba input, valueFormat normalization (#rrggbb default, rgba preserves alpha), and read-only presentation."
      scenarios={[
        {
          title: 'Color picker with in-form live summary',
          description: 'Pick or type a color; the summary re-renders from the bound value.',
          schema: basicColor,
        },
        {
          title: 'RGBA format, custom swatches, and read-only',
          description: 'valueFormat rgba keeps alpha; custom presetColors; read-only bound color.',
          schema: colorVariants,
        },
      ]}
    />
  );
}
