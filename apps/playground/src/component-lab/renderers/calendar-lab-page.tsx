import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { c9CalendarDialogSchema, registerC9Probe } from './data-c9-host';

const gridCalendarSchema = {
  type: 'page',
  body: [
    {
      type: 'calendar',
      testid: 'calendar-grid-shape',
      view: 'month',
      monthShape: 'grid',
      firstDayOfWeek: 1,
    },
  ],
};

const gridCalendarEnv = {
  fetcher: async <T,>() => ({ status: 0, data: null as T }),
} as unknown as Partial<RendererEnv>;

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
        {
          title: 'Grid month shape (L4.2 monthShape)',
          description:
            'monthShape grid: Booker-style six-week date-selection grid with zero events/resources (empty-state gate bypassed). Clicking a date cell dispatches onDateSelect; selection never navigates.',
          schema: gridCalendarSchema,
          env: gridCalendarEnv,
        },
      ]}
    />
  );
}
