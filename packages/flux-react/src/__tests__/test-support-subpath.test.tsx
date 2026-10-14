import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import {
  MOCK_NODE_ID,
  MOCK_NODE_PATH,
  MOCK_SCOPE_ID,
  computeContractHonestyDiscoveryCounts,
  createMockRendererProps,
  createTestRuntime,
  createTestScope,
  runContractHonestyGuardSuite,
  stubRendererHelpers,
  TestRuntimeProvider,
} from '../test-support.js';
import { useRendererRuntime, useRenderScope } from '../hooks.js';

// Plan 594 (CX-15): home-side pins for the shared `./test-support` subpath.
// The honest seed is the G1 adjudication: meta exactly the four required
// ResolvedNodeMeta booleans, node.scope seeded map-form.
describe('createMockRendererProps honest seed (plan 594 G1)', () => {
  it('seeds meta with exactly the four required fields', () => {
    const props = createMockRendererProps();

    expect(props.meta).toEqual({ visible: true, hidden: false, disabled: false, changed: false });
  });

  it('seeds node.scope as the map-form mock scope and honours option overrides', () => {
    const props = createMockRendererProps();
    const overridden = createMockRendererProps({
      id: 'custom-id',
      path: 'custom.path',
      node: { cid: 7 },
      meta: { visible: false },
    });

    expect(props.id).toBe(MOCK_NODE_ID);
    expect(props.path).toBe(MOCK_NODE_PATH);
    expect(props.node.scope).toEqual({ id: MOCK_SCOPE_ID, path: MOCK_NODE_PATH, value: {} });
    expect(overridden.id).toBe('custom-id');
    expect(overridden.path).toBe('custom.path');
    expect(overridden.node.cid).toBe(7);
    expect(overridden.meta.visible).toBe(false);
  });

  it('stubRendererHelpers evaluates transparently', () => {
    expect(stubRendererHelpers.evaluate('x')).toBe('x');
  });
});

describe('createTestScope / TestRuntimeProvider', () => {
  it('createTestScope resolves dotted paths', () => {
    const scope = createTestScope({ user: { name: 'ming' } });

    expect(scope.id).toBe('root');
    expect(scope.get('user.name')).toBe('ming');
    expect(scope.has('user.name')).toBe(true);
    expect(scope.has('user.age')).toBe(false);
  });

  function RuntimeProbe() {
    const runtime = useRendererRuntime();
    const scope = useRenderScope();
    return (
      <span data-testid="probe">{`${runtime.runtimeId}:${scope.id}`}</span>
    );
  }

  it('TestRuntimeProvider provides runtime and a root scope', () => {
    render(
      <TestRuntimeProvider runtime={createTestRuntime()}>
        <RuntimeProbe />
      </TestRuntimeProvider>,
    );

    expect(screen.getByTestId('probe').textContent).toBe('test-runtime:root');
  });

  it('createTestRuntime honours env overrides via createDefaultEnv', async () => {
    const runtime = createTestRuntime();
    const result = await runtime.env.fetcher({} as never, {} as never);

    expect(result.status).toBe(0);
    expect(result.data).toBeNull();
  });
});

// Harness coverage + behavior pin: drive runContractHonestyGuardSuite against
// a real on-disk fixture (co-located definition that references its declared
// event), then against the form (-capabilityProbe) and form-advanced
// (sibling-wired H7) shapes. The fixture lives outside src/ so it stays out of
// the package typecheck program and knip project globs (see fixture header).
const fixtureDir = join(
  import.meta.dirname,
  '..',
  '..',
  'fixtures',
  'contract-honesty',
);
const fixtureDefinitions: RendererDefinition[] = [
  {
    type: 'fixture-dummy',
    component: () => null,
    eventContracts: { onFake: { displayName: 'Fake' } },
  },
];

runContractHonestyGuardSuite({
  packageName: 'test-support-subpath fixture (default shape)',
  definitions: fixtureDefinitions,
  srcDir: fixtureDir,
  discoveryBaseline: { renderers: 1, eventKeys: 1, capabilityHandles: 0 },
});

runContractHonestyGuardSuite({
  packageName: 'test-support-subpath fixture (form shape)',
  definitions: fixtureDefinitions,
  srcDir: fixtureDir,
  capabilityProbe: false,
});

runContractHonestyGuardSuite({
  packageName: 'test-support-subpath fixture (form-advanced H7 shape)',
  definitions: fixtureDefinitions,
  srcDir: fixtureDir,
  h7Mode: 'sibling-wired',
});

describe('computeContractHonestyDiscoveryCounts', () => {
  it('counts declared event keys and capability handles', () => {
    expect(computeContractHonestyDiscoveryCounts(fixtureDefinitions)).toEqual({
      renderers: 1,
      eventKeys: 1,
      capabilityHandles: 0,
    });
  });
});
