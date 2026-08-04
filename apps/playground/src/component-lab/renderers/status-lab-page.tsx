import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c6c3StatusDialogSchema, registerC6c3Probe } from './data-c6c3-host';

const basicStatus = {
  type: 'page',
  body: [
    {
      type: 'status',
      testid: 'demo-status-lab',
      value: 'done',
      labelMap: { done: 'Completed', doing: 'Running' },
      levelMap: { done: 'success' },
    },
  ],
};

export function StatusLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Business status display renderer (display-only): value/labelMap/levelMap/iconMap projection onto the Badge primitive with semantic colors; miss falls back to placeholder."
      scenarios={[
        {
          title: 'Basic status label + level',
          description: 'labelMap label with the success semantic color.',
          schema: basicStatus,
          data: {},
        },
        {
          title: 'Host status in dialog scope (C6.3)',
          description:
            'C6.3 Phase 3 host-status-dialog: status inside an openDialog surface evaluates the opened row\'s $slot.record.* scope values and projects the levelMap semantic color.',
          schema: c6c3StatusDialogSchema,
          data: {},
          onActionScopeChange: registerC6c3Probe,
        },
      ]}
    />
  );
}
