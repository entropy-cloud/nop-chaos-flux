// Plan 594 (CX-15): thin wrapper over the shared contract-honesty harness (@nop-chaos/flux-react/test-support); discovery baseline pinned from the pre-594 file (plan Phase 1).
import { runContractHonestyGuardSuite } from '@nop-chaos/flux-react/test-support';
import { dataRendererDefinitions } from '../index.js';

runContractHonestyGuardSuite({
  packageName: 'flux-renderers-data',
  definitions: dataRendererDefinitions,
  srcDir: `${import.meta.dirname}/..`,
  discoveryBaseline: { renderers: 13, eventKeys: 23, capabilityHandles: 15 },
});
