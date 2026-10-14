// Plan 594 (CX-15) G1 honest-seed pin (ai adapter shape). Phase 1 captured the
// OLD flat helper's shape (meta visible/disabled + className/testid/cid, no
// hidden/changed, node without scope) and ran GREEN against it; the assertions
// below were RED under the old helper (discriminating pin, documented in
// docs/plans/594-cx15-test-support-plan.md) and are the permanent contract:
// the flat signature is preserved by the adapter shim, the honest four-required
// meta + node.scope seed come from the shared subpath core, and the ai-specific
// meta extras (className/testid/cid) stay layered in the shim (R1 裁定 B/m3).
import { describe, expect, it } from 'vitest';
import type { AiConversationsSchema } from './schemas.js';
import { createMockRendererProps } from './test-support.js';

describe('createMockRendererProps honest seed (plan 594 G1, ai adapter shape)', () => {
  it('keeps the flat signature (schema required) and seeds id/path defaults', () => {
    const props = createMockRendererProps<AiConversationsSchema>({
      schema: { type: 'ai-conversations' },
    });

    expect(props.id).toBe('test-node');
    expect(props.path).toBe('test');
    expect(props.props).toEqual({ type: 'ai-conversations' });
  });

  it('seeds meta with the honest four-required booleans plus the ai extras', () => {
    const props = createMockRendererProps<AiConversationsSchema>({
      schema: { type: 'ai-conversations' },
    });

    expect(props.meta).toEqual({
      visible: true,
      hidden: false,
      disabled: false,
      changed: false,
      className: '',
      testid: undefined,
      cid: undefined,
    });
  });

  it('seeds node.scope as the map-form mock scope and keeps the helpers stub', () => {
    const props = createMockRendererProps<AiConversationsSchema>({
      schema: { type: 'ai-conversations' },
    });

    expect(props.node.scope).toEqual({ id: 'mock-scope', path: 'mock.path', value: {} });
    expect(typeof props.helpers.render).toBe('function');
    expect(typeof props.helpers.evaluate).toBe('function');
    expect(typeof props.helpers.dispatch).toBe('function');
  });
});
