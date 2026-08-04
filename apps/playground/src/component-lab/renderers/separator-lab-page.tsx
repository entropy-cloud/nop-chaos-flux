import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c6c2SeparatorSchema } from './data-c6c2-host';

const basicSeparator = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'column',
      gap: 12,
      body: [{ type: 'text', text: 'A' }, { type: 'separator' }, { type: 'text', text: 'B' }],
    },
  ],
};

export function SeparatorLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Lightweight divider: orientation (horizontal/vertical), decorative (aria-hidden + role none), and a label (value-or-region) that forces a horizontal labelled layout."
      scenarios={[
        {
          title: 'Basic horizontal separator',
          description: 'A plain horizontal divider between two texts.',
          schema: basicSeparator,
          data: {},
        },
        {
          title: 'Host separator orientations + decorative (C6.2)',
          description:
            'C6.2 Phase 3 host-separator: horizontal/vertical aria-orientation, labelled variant (data-orientation horizontal + label slot), decorative maps to aria-hidden + role none.',
          schema: c6c2SeparatorSchema,
          data: {},
        },
      ]}
    />
  );
}
