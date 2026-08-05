import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { C8_MOCK_CONNECTOR, c8ConversationsSchema, registerC8Probe } from './data-c8-1-host';

export function AiConversationsLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="AI Conversations renderer: conversation list sidebar with new/switch/rename/delete schema events and scope-owned list data."
      scenarios={[
        {
          title: 'Host conversation list + onConversationChange (C8.1)',
          description:
            'C8.1 Phase 3 host-ai-cc: the sidebar item click dispatches onItemClick with the conversation payload, and ai-chat fires onConversationChange when its activeConversationId prop changes (P1-1 real-browser proof).',
          schema: c8ConversationsSchema,
          data: { connector: C8_MOCK_CONNECTOR },
          onActionScopeChange: registerC8Probe,
        },
      ]}
    />
  );
}
