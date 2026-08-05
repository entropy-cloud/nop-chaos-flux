import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c7NoticeSchema, registerC7Probe } from './data-c7-host';

export function NoticeBarLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Notice Bar renderer: text string|string[] with CSS marquee, variant semantic colors, closable + onClose, clickable role=button + onClick, and role=status advisory announcements."
      scenarios={[
        {
          title: 'Host notice-bar close + click (C7)',
          description:
            'C7 Phase 3 host-nb-close/host-nb-click: the closable bar hides after the close button dispatch (onClose), the clickable bar exposes role=button and dispatches onClick, and the static bar stays a non-focusable role=status region.',
          schema: c7NoticeSchema,
          data: {},
          onActionScopeChange: registerC7Probe,
        },
      ]}
    />
  );
}
