import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import {
  c5c2StepsChangeSchema,
  c5c2StepsOwnerSchema,
} from './data-c5c2-host';

const basicSteps = {
  type: 'page',
  body: [
    {
      type: 'steps',
      testid: 'demo-steps-basic',
      value: 'review',
      items: [
        { value: 'draft', title: 'Draft', description: 'Compose content' },
        { value: 'review', title: 'Review', description: 'Awaiting approval' },
        { value: 'done', title: 'Done', description: 'Published' },
      ],
    },
  ],
};

export function StepsLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Step progress display (lightweight, not a multi-step submit owner — that is wizard's domain). The current step is a valueOwnership three-state value: local (renderer state), controlled (parent value drives), scope (valueStatePath writeback; degrades to local with a dev warning when no path is set)."
      scenarios={[
        {
          title: 'Basic steps display',
          description: 'Horizontal steps with derived finish/process/wait status.',
          schema: basicSteps,
          data: {},
        },
        {
          title: 'Host steps three-way ownership switching (C5.2 Phase 3)',
          description:
            'C5.2 Phase 3: local toggles; a controlled steps instance driven by host scope buttons (clicks dispatch but do not move); a scope instance writing valueStatePath.',
          schema: c5c2StepsOwnerSchema,
          data: {},
        },
        {
          title: 'Host steps click + onChange payload (C5.2 Phase 3)',
          description:
            'C5.2 Phase 3: clicking a step switches data-current-index and reports the onChange payload {value, stepIndex, stepKey} through the host report text.',
          schema: c5c2StepsChangeSchema,
          data: {},
        },
      ]}
    />
  );
}
