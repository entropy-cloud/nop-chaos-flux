import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c82FeedbackSchema, registerC82Probe } from './data-c8-2-host';

export function AiFeedbackLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="AI Feedback renderer: message footer action bar with local like/dislike echo and schema-driven onAction payload resolution."
      scenarios={[
        {
          title: 'Host feedback echo + onAction payload (C8.2)',
          description:
            'C8.2 Phase 3 host-feedback: like/dislike toggle the data-active presence attribute locally (mutually exclusive), and onAction dispatches ${action}|${message.id} through the dispatch ctx.',
          schema: c82FeedbackSchema,
          onActionScopeChange: registerC82Probe,
        },
      ]}
    />
  );
}
