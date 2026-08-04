import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c6c2SpinnerVisibleSchema } from './data-c6c2-host';

const basicSpinner = {
  type: 'page',
  body: [
    {
      type: 'spinner',
      testid: 'demo-spinner-lab',
      label: 'Loading…',
    },
  ],
};

export function SpinnerLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Lightweight loading indicator: size (sm/md/lg), optional value-or-region label, and meta.visible control (hidden entirely when false)."
      scenarios={[
        {
          title: 'Basic spinner with label',
          description: 'md spinner with a loading label.',
          schema: basicSpinner,
          data: {},
        },
        {
          title: 'Host spinner visible toggle (C6.2)',
          description:
            'C6.2 Phase 3 host-spinner-visible: the meta.visible scope toggle removes the spinner node entirely.',
          schema: c6c2SpinnerVisibleSchema,
          data: {},
        },
      ]}
    />
  );
}
