import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c6c2EmptyCtaSchema } from './data-c6c2-host';

const basicEmpty = {
  type: 'page',
  body: [
    {
      type: 'empty',
      testid: 'demo-empty-lab',
      title: 'No data yet',
      description: 'Create your first record to get started.',
    },
  ],
};

export function EmptyLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Empty state shell: title/description (value-or-region), optional lucide icon image, and an actions region for CTAs."
      scenarios={[
        {
          title: 'Basic empty state',
          description: 'title + description with the default icon.',
          schema: basicEmpty,
          data: {},
        },
        {
          title: 'Host empty actions CTA (C6.2)',
          description:
            'C6.2 Phase 3 host-empty-cta: the actions-region CTA button dispatches its action; report flips pending → fired.',
          schema: c6c2EmptyCtaSchema,
          data: {},
        },
      ]}
    />
  );
}
