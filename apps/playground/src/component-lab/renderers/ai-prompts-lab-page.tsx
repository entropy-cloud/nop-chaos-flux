import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c83PromptsDialogSchema, registerC83Probe } from './data-c8-3-host';

export function AiPromptsLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="AI Prompts renderer: static recommendation prompt cards with layout/size variants; onSelect dispatches { item, index } with the dispatch ctx so action args read payload keys."
      scenarios={[
        {
          title: 'Host prompts in dialog + onSelect payload (C8.3 bug 73 pattern)',
          description:
            'C8.3 Phase 3 host-prompts-dlg: ai-prompts inside an openDialog surface — clicking a prompt item dispatches onSelect and ${item.label}|${index} resolves through the dispatch ctx.',
          schema: c83PromptsDialogSchema,
          onActionScopeChange: registerC83Probe,
        },
      ]}
    />
  );
}
