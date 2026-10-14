// Plan 594 (CX-15): thin wrapper over the shared contract-honesty harness (@nop-chaos/flux-react/test-support); discovery baseline pinned from the pre-594 file (plan Phase 1). capabilityProbe: false reproduces form's pre-594 shape — its guard-mechanism case asserts only the event half of the injected probe (see plan Phase 1 measurement note).
import { runContractHonestyGuardSuite } from '@nop-chaos/flux-react/test-support';
import { formRendererDefinitions } from '../index.js';

runContractHonestyGuardSuite({
  packageName: 'flux-renderers-form',
  definitions: formRendererDefinitions,
  srcDir: `${import.meta.dirname}/..`,
  capabilityProbe: false,
  discoveryBaseline: { renderers: 31, eventKeys: 6, capabilityHandles: 73 },
});
