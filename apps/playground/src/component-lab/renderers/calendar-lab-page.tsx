import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c9CalendarDialogSchema, registerC9Probe } from './data-c9-host';

export function CalendarLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Calendar renderer: month/week/day scheduling grid with drag-create and ownership; loadAction + schema events dispatch the { event, evaluationBindings, scope } ctx."
      scenarios={[
        {
          title: 'Host calendar in dialog + loadAction + onEventClick payload (C9 bug 73 pattern)',
          description:
            'C9 Phase 3 host-cal-load: calendar inside an openDialog surface — loadAction fires on mount, clicking an event block dispatches onEventClick with ${event.id}|${event.title} resolved via ctx.',
          schema: c9CalendarDialogSchema,
          onActionScopeChange: registerC9Probe,
        },
      ]}
    />
  );
}
