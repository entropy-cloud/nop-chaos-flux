import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c83SuggestionsPopoverSchema, registerC83Probe } from './data-c8-3-host';

export function AiSuggestionsLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="AI Suggestions renderer: in-conversation suggestion pills with overflow modes; popover collapses excess pills into a +N trigger, onSelect dispatches { item, index } via ctx."
      scenarios={[
        {
          title: 'Host suggestions popover overflow + onSelect payload (C8.3)',
          description:
            'C8.3 Phase 3 host-suggest-pop: popover overflow collapse (+N trigger) — clicking an overflow item dispatches onSelect with the global index and ${item.text}|${index} resolves through the dispatch ctx.',
          schema: c83SuggestionsPopoverSchema,
          onActionScopeChange: registerC83Probe,
        },
      ]}
    />
  );
}
