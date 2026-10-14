// Plan 594 (CX-15) G1 honest-seed pin. Phase 1 captured the pre-swap shape
// (byte-identical twin of the content helper: meta four-required honest, node
// WITHOUT scope) and ran green against it; node.scope below was RED under the
// old local helper (discriminating pin, documented in
// docs/plans/594-cx15-test-support-plan.md) and is permanent.
import { describe, expect, it } from 'vitest';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { createMockRendererProps } from './test-support.js';

describe('createMockRendererProps honest seed (plan 594 G1)', () => {
  it('seeds meta with exactly the four required ResolvedNodeMeta booleans', () => {
    const props = createMockRendererProps<BaseSchema>();

    expect(props.meta).toEqual({ visible: true, hidden: false, disabled: false, changed: false });
  });

  it('seeds node.scope as the map-form mock scope', () => {
    const props = createMockRendererProps<BaseSchema>();

    expect(props.node.scope).toEqual({ id: 'mock-scope', path: 'mock.path', value: {} });
  });
});
