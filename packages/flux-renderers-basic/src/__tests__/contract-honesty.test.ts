// Plan 594 (CX-15): thin wrapper over the shared contract-honesty harness (@nop-chaos/flux-react/test-support); discovery baseline pinned from the pre-594 file (plan Phase 1).
import { runContractHonestyGuardSuite } from '@nop-chaos/flux-react/test-support';
import { basicRendererDefinitions } from '../index.js';

runContractHonestyGuardSuite({
  packageName: 'flux-renderers-basic',
  definitions: basicRendererDefinitions,
  srcDir: `${import.meta.dirname}/..`,
  discoveryBaseline: { renderers: 18, eventKeys: 13, capabilityHandles: 17 },
});
