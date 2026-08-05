import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c83WelcomeRegionSchema, registerC83Probe } from './data-c8-3-host';

export function AiWelcomeLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="AI Welcome renderer: empty-state welcome panel (icon/title/description/align) with a footer value-or-region slot for nested host components."
      scenarios={[
        {
          title: 'Host welcome footer region + nested component (C8.3)',
          description:
            'C8.3 Phase 3 host-welcome-reg: the footer region renders nested schema components and the embedded button dispatches its action (region evaluation + events work).',
          schema: c83WelcomeRegionSchema,
          onActionScopeChange: registerC83Probe,
        },
      ]}
    />
  );
}
