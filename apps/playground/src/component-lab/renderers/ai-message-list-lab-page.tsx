import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { C8_MOCK_CONNECTOR, c8AiStreamSchema, registerC8Probe } from './data-c8-1-host';

export function AiMessageListLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="AI Message List renderer: role=log aria-live message stream, auto-scroll pinning and 200-message virtual windowing."
      scenarios={[
        {
          title: 'Host streaming message list (C8.1)',
          description:
            'C8.1 Phase 3 host-ai-stream: the message list renders streaming increments with stable data-slot/data-role markers while aria-busy tracks the engine turn.',
          schema: c8AiStreamSchema,
          data: { connector: C8_MOCK_CONNECTOR },
          onActionScopeChange: registerC8Probe,
        },
      ]}
    />
  );
}
