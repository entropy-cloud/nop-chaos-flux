import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { C8_MOCK_CONNECTOR, c8AiChatDialogSchema, c8AiStreamSchema, c8HitlSchema, registerC8Probe } from './data-c8-1-host';

export function AiChatLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="AI Chat renderer: conversation panel root with engine lifecycle, host scope projection, streaming send/abort and dialog hosting (bug 73 pattern)."
      scenarios={[
        {
          title: 'Host AI chat in dialog + streaming (C8.1 bug 73 pattern)',
          description:
            'C8.1 Phase 3 host-ai-dialog: an ai-chat inside an openDialog surface sends a message through the mock connector and streams the assistant reply (real-browser dialog hosting).',
          schema: c8AiChatDialogSchema,
          data: { connector: C8_MOCK_CONNECTOR },
          onActionScopeChange: registerC8Probe,
        },
        {
          title: 'Host streaming DOM contract (C8.1)',
          description:
            'C8.1 Phase 3 host-ai-stream: during an in-flight turn the message list keeps stable data-role/data-slot markers, the assistant bubble carries data-streaming, and cancel returns the sender to the enabled state.',
          schema: c8AiStreamSchema,
          data: { connector: C8_MOCK_CONNECTOR },
          onActionScopeChange: registerC8Probe,
        },
        {
          title: 'Host HITL dead-click (C8.1)',
          description:
            'C8.1 Phase 3 host-ai-hitl: pending approval with a wired handler dispatches exactly once with the toolCallId and flips the host-owned state to decided (badge replaces buttons, so a rapid second click cannot double-submit); a no-handler card keeps its buttons disabled.',
          schema: c8HitlSchema,
          data: { connector: C8_MOCK_CONNECTOR },
          onActionScopeChange: registerC8Probe,
        },
      ]}
    />
  );
}
