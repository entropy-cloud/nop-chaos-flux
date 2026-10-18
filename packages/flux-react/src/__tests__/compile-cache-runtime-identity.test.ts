import { describe, expect, it } from 'vitest';
import type { RegisteredRendererDefinition, RendererRuntime } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import { normalizeNodeInput } from '../render-nodes.js';
import { env } from '../test-support-core.js';

// FM-2 plan 643 P1-1 — the REAL discriminator for the module-level compile
// cache. Components are embedded at compile time (`templateNode.component`
// carries the resolved component definition's component), so when two runtimes
// with different renderer definitions compile the SAME raw schema object, the
// old single-level cache (input identity + options fingerprint only) handed
// the first runtime's compiled nodes to the second — silently applying the
// first runtime's components and provider plans. The cache is now keyed per
// runtime (input → runtime → entry). This test calls `normalizeNodeInput`
// directly so it exercises the module cache (a render-path per-instance
// useMemo would bypass it and mask the regression — closure audit R1
// Major-1).

function makeRuntimeWithMarker(mark: string): {
  runtime: RendererRuntime;
  definition: RegisteredRendererDefinition;
} {
  const definition: RegisteredRendererDefinition = {
    type: 'text',
    component: function markerComponent() {
      return null;
    },
  };
  Object.defineProperty(definition.component, 'name', { value: `${mark}MarkerComponent` });
  const runtime = createRendererRuntime({
    registry: createRendererRegistry([definition]),
    env,
  });
  return { runtime, definition };
}

function firstEmbeddedComponent(
  nodes: ReturnType<typeof normalizeNodeInput>,
): unknown {
  const node = Array.isArray(nodes) ? nodes[0] : nodes;
  return (node as { component?: { component?: unknown } } | null)?.component?.component;
}

describe('normalizeNodeInput compile cache runtime-identity contract (FM-2 plan 643 P1-1)', () => {
  it('returns per-runtime compiled nodes for the same schema object', () => {
    const sharedSchema = { type: 'text', text: 'shared' };
    const a = makeRuntimeWithMarker('A');
    const b = makeRuntimeWithMarker('B');

    const nodesA = normalizeNodeInput(a.runtime, sharedSchema);
    const nodesB = normalizeNodeInput(b.runtime, sharedSchema);

    expect(nodesA).toBeTruthy();
    expect(nodesB).toBeTruthy();
    const componentA = firstEmbeddedComponent(nodesA);
    const componentB = firstEmbeddedComponent(nodesB);
    expect(componentA).toBe(a.definition.component);
    // Old single-level cache: componentB === componentA (B compiled later but
    // hit A's cache entry — B's definition never reached the compiled tree).
    expect(componentB).toBe(b.definition.component);
    expect(componentB).not.toBe(componentA);
  });
});
