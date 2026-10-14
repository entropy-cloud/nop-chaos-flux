// Plan 594 (CX-15) G1 honest-seed pin. The map helper was the honest node
// faction pre-consolidation (meta four-required + node.scope map-form); this
// pin now asserts the same shape through the shared subpath shell, keeping the
// shared home equal to the map precedent (R1 裁定 B).
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
