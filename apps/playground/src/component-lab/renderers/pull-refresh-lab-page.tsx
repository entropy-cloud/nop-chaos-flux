import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c7DialogSchema, registerC7Probe } from './data-c7-host';

export function PullRefreshLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Pull Refresh renderer: touch-pull container with the normal → pulling → loosing → loading → success state machine, OA-14 down-only direction, i18n indicator texts, and the onRefresh event carrying {type, direction, threshold} with evaluationBindings ctx."
      scenarios={[
        {
          title: 'Host pull-refresh in dialog + onRefresh payload (C7 bug 73 pattern)',
          description:
            'C7 Phase 3 host-pr-dialog: pull-refresh inside an openDialog surface; a downward pull past the 50px threshold dispatches onRefresh and the action args resolve ${direction}|${threshold} from the event payload.',
          schema: c7DialogSchema,
          data: {},
          onActionScopeChange: registerC7Probe,
        },
      ]}
    />
  );
}
