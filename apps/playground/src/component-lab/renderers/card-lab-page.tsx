import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c6c2CardClickSchema } from './data-c6c2-host';

const basicCard = {
  type: 'page',
  body: [
    {
      type: 'card',
      testid: 'demo-card-lab',
      title: 'Card title',
      header: [{ type: 'text', text: 'Header region' }],
      body: [{ type: 'text', text: 'Body region' }],
      footer: [{ type: 'text', text: 'Footer region' }],
      actions: [{ type: 'button', label: 'Action' }],
    },
  ],
};

export function CardLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Structured card container: title (value-or-region), header/body/footer/actions regions, optional image, variant, and a whole-card onClick event."
      scenarios={[
        {
          title: 'Basic card with all regions',
          description: 'title + header/body/footer regions + an actions CTA row.',
          schema: basicCard,
          data: {},
        },
        {
          title: 'Host card onClick + inner button action (C6.2)',
          description:
            'C6.2 Phase 3: the card fires its onClick on whole-card clicks; the inner actions button dispatches its own action (DOM bubbling: an inner click also reaches the card onClick — native semantics, no stopPropagation).',
          schema: c6c2CardClickSchema,
          data: {},
        },
      ]}
    />
  );
}
