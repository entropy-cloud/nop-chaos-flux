import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c82TokenUsageSchema, registerC82Probe } from './data-c8-2-host';

export function AiTokenUsageLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="AI Token Usage renderer: pure-display token/cost widget reading message.metadata.usage, with the data-empty placeholder and schema-driven onClick payload resolution."
      scenarios={[
        {
          title: 'Host token usage render + onClick payload (C8.2)',
          description:
            'C8.2 Phase 3 host-token-usage: metadata.usage renders total/prompt/completion counts, the missing-usage placeholder carries data-empty, and onClick dispatches ${usage.total_tokens} through the dispatch ctx.',
          schema: c82TokenUsageSchema,
          onActionScopeChange: registerC82Probe,
        },
      ]}
    />
  );
}
