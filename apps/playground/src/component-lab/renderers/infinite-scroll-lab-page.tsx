import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c7DialogSchema, c7RetrySchema, registerC7Probe } from './data-c7-host';

export function InfiniteScrollLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Infinite Scroll renderer: IntersectionObserver sentinel + host-controlled hasMore/loading/error runtime props, four states (normal/loading/finished/error), in-flight dedupe, and the onLoadMore event carrying {type, source} with evaluationBindings ctx."
      scenarios={[
        {
          title: 'Host infinite-scroll in dialog + immediateCheck (C7 bug 73 pattern)',
          description:
            'C7 Phase 3 host-is-dialog: infinite-scroll inside an openDialog surface; immediateCheck fires onLoadMore on mount and the action args resolve ${source} = immediate from the event payload.',
          schema: c7DialogSchema,
          data: {},
          onActionScopeChange: registerC7Probe,
        },
        {
          title: 'Host infinite-scroll failure + retry (C7)',
          description:
            'C7 Phase 3 host-is-retry: error:true renders the error state text and a retry button; clicking retry resumes loading and the action args resolve ${source} = retry.',
          schema: c7RetrySchema,
          data: {},
          onActionScopeChange: registerC7Probe,
        },
      ]}
    />
  );
}
