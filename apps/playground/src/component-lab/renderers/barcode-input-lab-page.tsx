import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c9BarcodeFormSchema, registerC9Probe } from './data-c9-host';

export function BarcodeInputLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Barcode Input renderer: form field with scan button + camera overlay; values write back to the host form and participate in form validation/submit."
      scenarios={[
        {
          title: 'Host barcode-input in form + validation + submit echo (C9)',
          description:
            'C9 Phase 3 host-barcode-form: barcode-input inside a form — manual input writes back to the form value, required validation blocks an empty submit, and the submit action echoes the committed value.',
          schema: c9BarcodeFormSchema,
          onActionScopeChange: registerC9Probe,
        },
      ]}
    />
  );
}
