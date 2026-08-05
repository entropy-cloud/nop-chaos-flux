import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c9GanttDialogSchema, registerC9Probe } from './data-c9-host';

export function GanttLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Gantt renderer: task grid + timeline bars with drag/zoom; schema events dispatch the { event, evaluationBindings, scope } ctx so action args read payload keys."
      scenarios={[
        {
          title: 'Host gantt in dialog + onTaskClick payload (C9 bug 73 pattern)',
          description:
            'C9 Phase 3 host-gantt-dialog: gantt inside an openDialog surface — clicking a task bar dispatches onTaskClick and ${_taskId} resolves through the dispatch ctx.',
          schema: c9GanttDialogSchema,
          onActionScopeChange: registerC9Probe,
        },
      ]}
    />
  );
}
