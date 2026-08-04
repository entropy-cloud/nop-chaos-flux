import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c6c3AlertHostSchema, registerC6c3Probe } from './data-c6c3-host';

const basicAlert = {
  type: 'page',
  body: [
    {
      type: 'alert',
      testid: 'demo-alert-lab',
      level: 'info',
      title: 'Heads up',
      body: 'Inline feedback block with title/body and the level default icon.',
    },
  ],
};

export function AlertLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Inline feedback renderer: level (info/success/warning/error), title/body value-or-region, optional actions region, custom icon override and closable close button that reports onClose."
      scenarios={[
        {
          title: 'Basic alert with title and body',
          description: 'info alert with the default level icon.',
          schema: basicAlert,
          data: {},
        },
        {
          title: 'Host alert close + embedded actions (C6.3)',
          description:
            'C6.3 Phase 3 host-alert-close + host-alert-action: closable close hides the node and the onClose action args read ${level} from the event payload (evaluationBindings contract); the actions-region button dispatches its own action.',
          schema: c6c3AlertHostSchema,
          data: {},
          onActionScopeChange: registerC6c3Probe,
        },
      ]}
    />
  );
}
