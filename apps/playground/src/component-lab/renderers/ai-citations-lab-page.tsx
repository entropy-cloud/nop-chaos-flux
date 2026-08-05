import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c82CitationsSchema, registerC82Probe } from './data-c8-2-host';

export function AiCitationsLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="AI Citations renderer: inline [N] markers with hoverable source cards and schema-driven onSourceClick payload resolution."
      scenarios={[
        {
          title: 'Host citation popover + onSourceClick payload (C8.2)',
          description:
            'C8.2 Phase 3 host-citation-clk: inline [1]/[2] markers render, clicking a trigger opens the popover source card with the title, and onSourceClick dispatches ${index}|${source.title} through the dispatch ctx.',
          schema: c82CitationsSchema,
          onActionScopeChange: registerC82Probe,
        },
      ]}
    />
  );
}
