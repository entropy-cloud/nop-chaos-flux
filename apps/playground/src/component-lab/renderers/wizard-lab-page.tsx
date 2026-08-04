import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import {
  c5c1WizardDialogSchema,
  c5c1WizardGateSchema,
  c5c1WizardStepSchema,
  registerC5c1DialogProbe,
  registerC5c1GateProbe,
} from './data-c5c1-host';

const basicWizard = {
  type: 'page',
  body: [
    {
      type: 'wizard',
      testid: 'demo-wizard-basic',
      steps: [
        { title: 'A', body: [{ type: 'text', text: 'basic-A' }] },
        { title: 'B', body: [{ type: 'text', text: 'basic-B' }] },
        { title: 'C', body: [{ type: 'text', text: 'basic-C' }] },
      ],
    },
  ],
};

export function WizardLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Layered wizard: interaction state (step switching) and semantic lifecycle state (commit/validation/complete) are kept in separate state objects; step forms validate through formId, and beforeEnter/beforeLeave act as async navigation gates."
      scenarios={[
        {
          title: 'Basic linear wizard',
          description: 'Three steps; Next commits (lifecycle) then advances (interaction).',
          schema: basicWizard,
          data: {},
        },
        {
          title: 'Host wizard step validation with embedded form (C5.1 Phase 3)',
          description:
            'C5.1 Phase 3: step 1 embeds a form with a required field; Next with an empty field blocks on validationError with an inline error, a filled field advances, and the final commit fires onComplete.',
          schema: c5c1WizardStepSchema,
          data: {},
        },
        {
          title: 'Host wizard async gate beforeEnter/beforeLeave (C5.1 Phase 3)',
          description:
            'C5.1 Phase 3: entering step B is gated by a probe namespace returning {ok:false} — navigation aborts and beforeLeave of A is still reported.',
          schema: c5c1WizardGateSchema,
          data: {},
          onActionScopeChange: registerC5c1GateProbe,
        },
        {
          title: 'Host wizard inside a dialog (C5.1 bug 73 pattern)',
          description:
            'C5.1 Phase 3: a wizard runs inside an openDialog surface — the step/commit/complete chain must hold in a real portal/focus environment (unit-green but real-browser failure risk). Completion is reported through a host window probe (dialog content writes are scope-local by design).',
          schema: c5c1WizardDialogSchema,
          data: {},
          onActionScopeChange: registerC5c1DialogProbe,
        },
      ]}
    />
  );
}
