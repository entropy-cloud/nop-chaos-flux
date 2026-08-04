import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c5c2TimelineSchema } from './data-c5c2-host';

const basicTimeline = {
  type: 'page',
  body: [
    {
      type: 'timeline',
      testid: 'demo-timeline-basic',
      items: [
        { time: '09:00', title: 'Created', detail: 'by Alice', level: 'default' },
        { time: '11:30', title: 'Approved', detail: 'by Bob', level: 'success' },
        { time: '14:00', title: 'Published', detail: 'live now', level: 'primary' },
      ],
    },
  ],
};

export function TimelineLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Event timeline display collection. Display-only: no owner state, no events. Items render time/title/detail/icon/level; mode (left/right/alternate) places content relative to the axis; orientation switches horizontal/vertical; reverse flips the DOM order."
      scenarios={[
        {
          title: 'Basic timeline',
          description: 'Vertical left-mode timeline with level mapping.',
          schema: basicTimeline,
          data: {},
        },
        {
          title: 'Host timeline display modes (C5.2 Phase 3)',
          description:
            'C5.2 Phase 3: left/alternate modes, reverse order, and horizontal orientation render with marker-only roots and no owner-state side effects.',
          schema: c5c2TimelineSchema,
          data: {},
        },
      ]}
    />
  );
}
