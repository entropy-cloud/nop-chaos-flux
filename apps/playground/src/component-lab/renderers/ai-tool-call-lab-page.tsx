import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c82HitlSchema, c82ToolDialogSchema, registerC82Probe } from './data-c8-2-host';

export function AiToolCallLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="AI Tool Call renderer: tool invocation card with status transitions, args expand/collapse, dialog hosting (bug 73 pattern) and the HITL dead-click special."
      scenarios={[
        {
          title: 'Host tool-call in dialog + status transition (C8.2 bug 73 pattern)',
          description:
            'C8.2 Phase 3 host-tool-dialog: an ai-tool-call inside an openDialog surface with a host-driven running → success status transition and args expand/collapse (real-browser dialog hosting).',
          schema: c82ToolDialogSchema,
          onActionScopeChange: registerC82Probe,
        },
        {
          title: 'Host HITL dead-click (C8.2)',
          description:
            'C8.2 Phase 3 host-hitl-dead: pending approval with a wired handler — a rapid double click dispatches exactly once and the host-owned state flips to decided (badge replaces buttons); a no-handler card keeps its buttons disabled.',
          schema: c82HitlSchema,
          onActionScopeChange: registerC82Probe,
        },
      ]}
    />
  );
}
