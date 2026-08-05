import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c7SwipeSchema, registerC7Probe } from './data-c7-host';

export function SwipeCellLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Swipe Cell renderer: horizontal swipe reveals left/right action regions (data-state closed/open-left/open-right), inert gating for AT/focus, closeOnOutside, and onAction/onOpen/onClose events carrying {type, side} with evaluationBindings ctx."
      scenarios={[
        {
          title: 'Host swipe-cell row action (C7)',
          description:
            'C7 Phase 3 host-sw-action: repeated list rows with swipe-cell; swiping a row right reveals the left action region, clicking the action button dispatches onAction and the args resolve ${side}|${index} from the event payload + row scope.',
          schema: c7SwipeSchema,
          data: {},
          onActionScopeChange: registerC7Probe,
        },
      ]}
    />
  );
}
