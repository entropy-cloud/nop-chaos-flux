// Test-support subpath (plan 594 / CX-15): shared renderer test scaffolding —
// mock props with the type-contract-honest meta/node seed, the contract-honesty
// guard harness, and the TestRuntimeProvider family. Built to dist like
// `./unstable`; the internal probe barrels (`src/test-support*.tsx`) remain
// source-only (build-excluded) and are NOT part of this subpath surface.
export {
  MOCK_NODE_ID,
  MOCK_NODE_PATH,
  MOCK_SCOPE_ID,
  createMockRendererProps,
  stubRendererHelpers,
  type MockRendererPropsOptions,
} from './test-support/mock-props.js';
export {
  computeContractHonestyDiscoveryCounts,
  runContractHonestyGuardSuite,
  type ContractHonestyDiscoveryBaseline,
  type ContractHonestyHarnessOptions,
} from './test-support/contract-honesty-harness.js';
export {
  TestRuntimeProvider,
  createTestRuntime,
  createTestScope,
} from './test-support/runtime.js';
