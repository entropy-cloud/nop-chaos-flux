import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c7CountdownSchema, registerC7Probe } from './data-c7-host';

export function CountdownLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Countdown renderer: wall-clock derived countdown from time/targetTime, custom format templates, paused/autoStart, tabular-nums display, and the onFinish event carrying {type} with evaluationBindings ctx (fired exactly once)."
      scenarios={[
        {
          title: 'Host countdown finish (C7)',
          description:
            'C7 Phase 3 host-cd-finish: a 1.5s countdown reaches zero, data-finished flips to true and onFinish dispatches with the args resolving ${type} = finish.',
          schema: c7CountdownSchema,
          data: {},
          onActionScopeChange: registerC7Probe,
        },
      ]}
    />
  );
}
