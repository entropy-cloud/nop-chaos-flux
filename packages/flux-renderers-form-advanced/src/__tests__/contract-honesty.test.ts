// Plan 594 (CX-15): thin wrapper over the shared contract-honesty harness (@nop-chaos/flux-react/test-support); discovery baseline pinned from the pre-594 file (plan Phase 1). h7Mode: 'sibling-wired' reproduces form-advanced's pre-594 H7 case (hardcoded 'addItem' probe).
import { runContractHonestyGuardSuite } from '@nop-chaos/flux-react/test-support';
import { formAdvancedRendererDefinitions } from '../index.js';

// capabilityHandles 22 -> 24: plan 595 declared picker componentCapabilityContracts
// open/clear (runtime registers both via useInputComponentHandle methods list;
// fixtures bind them with componentId + `component:open` / `component:clear`).
runContractHonestyGuardSuite({
  packageName: 'flux-renderers-form-advanced',
  definitions: formAdvancedRendererDefinitions,
  srcDir: `${import.meta.dirname}/..`,
  h7Mode: 'sibling-wired',
  discoveryBaseline: { renderers: 19, eventKeys: 0, capabilityHandles: 24 },
});
