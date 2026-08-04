import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c6c2ProgressClampSchema } from './data-c6c2-host';

const basicProgress = {
  type: 'page',
  body: [
    {
      type: 'progress',
      testid: 'demo-progress-lab',
      value: 65,
      max: 100,
      showValue: true,
      label: 'Uploading',
    },
  ],
};

export function ProgressLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Linear progress: value/max normalized into [0, max] (never overflows), variant, optional numeric value display and a value-or-region label."
      scenarios={[
        {
          title: 'Basic progress with label + value',
          description: 'value=65/max=100 with showValue and a label.',
          schema: basicProgress,
          data: {},
        },
        {
          title: 'Host progress clamp on scope update (C6.2)',
          description:
            'C6.2 Phase 3 host-progress-clamp: value bound to scope; 250 clamps to 100 (aria-valuenow + value display), -10 clamps to 0, 42 passes through.',
          schema: c6c2ProgressClampSchema,
          data: { progressValue: 250 },
        },
      ]}
    />
  );
}
