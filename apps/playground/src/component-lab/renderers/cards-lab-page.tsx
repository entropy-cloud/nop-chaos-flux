import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { CARDS_ROWS, c6c2CardsActionSchema, c6c2CardsSelectSchema, registerC6c2Probe } from './data-c6c2-host';

const basicCards = {
  type: 'page',
  body: [
    {
      type: 'cards',
      testid: 'demo-cards-lab',
      items: '${cardsRows}',
      card: { type: 'text', text: '${$slot.item.label}' },
    },
  ],
};

export function CardsLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Card collection: single items field rendered through the per-row card region; selection is LOCAL CONTROLLED state (selectionMode none/single/multiple + onSelectionChange) — no value/valueOwnership."
      scenarios={[
        {
          title: 'Basic cards from items',
          description: 'Three records render through the card region with per-row scope.',
          schema: basicCards,
          data: { cardsRows: CARDS_ROWS },
        },
        {
          title: 'Host cards selection modes + item action (C6.2 bug 73 pattern)',
          description:
            'C6.2 Phase 3 host-cards-select + host-cards-action: single/multiple/none selection with onSelectionChange reports; per-row onItemClick report; embedded Pick button action submits the CLICKED row\'s item scope value (row pollution re-verification).',
          schema: c6c2CardsSelectSchema,
          data: { cardsRows: CARDS_ROWS },
          onActionScopeChange: registerC6c2Probe,
        },
        {
          title: 'Host cards embedded item action (C6.2 bug 73 pattern)',
          description:
            'C6.2 Phase 3 host-cards-action: the embedded Pick button inside each card submits probe:record with the row-scoped $slot.item.label; onItemClick reports the clicked row.',
          schema: c6c2CardsActionSchema,
          data: { cardsRows: CARDS_ROWS },
          onActionScopeChange: registerC6c2Probe,
        },
      ]}
    />
  );
}
