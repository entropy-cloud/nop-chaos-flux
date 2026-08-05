import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c9KanbanDialogSchema, registerC9Probe } from './data-c9-host';

export function KanbanLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Kanban renderer: column/card board with DnD + keyboard drag; schema events dispatch the { event, evaluationBindings, scope } ctx so action args read payload keys."
      scenarios={[
        {
          title: 'Host kanban in dialog + onCardClick/onCardMove payload (C9 bug 73 pattern)',
          description:
            'C9 Phase 3 host-kanban-drag: kanban inside an openDialog surface — clicking a card dispatches onCardClick with ${cardId}|${index}, a cross-column drag dispatches onCardMove.',
          schema: c9KanbanDialogSchema,
          onActionScopeChange: registerC9Probe,
        },
      ]}
    />
  );
}
