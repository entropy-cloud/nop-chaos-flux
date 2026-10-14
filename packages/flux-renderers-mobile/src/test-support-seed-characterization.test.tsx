// Plan 594 (CX-15) G1 honest-seed pin. Phase 1 captured the OLD local helper's
// shape (meta empty spread, node without scope, meta.visible branch falsy) and
// this file ran GREEN against it; after the swap to the shared subpath helper
// the assertions below were RED under the old helper (discriminating pin —
// documented in docs/plans/594-cx15-test-support-plan.md Phase 1) and are the
// permanent honest-seed contract.
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { createMockRendererProps } from './test-support.js';

afterEach(() => {
  cleanup();
});

describe('createMockRendererProps honest seed (plan 594 G1)', () => {
  it('seeds meta with exactly the four required ResolvedNodeMeta booleans', () => {
    const props = createMockRendererProps<BaseSchema>();

    expect(props.meta).toEqual({ visible: true, hidden: false, disabled: false, changed: false });
  });

  it('seeds node.scope as the map-form mock scope', () => {
    const props = createMockRendererProps<BaseSchema>();

    expect(props.node.scope).toEqual({ id: 'mock-scope', path: 'mock.path', value: {} });
  });

  it('behavior flip: a consumer branching on meta.visible now takes the primary branch (old seed was falsy)', () => {
    const props = createMockRendererProps<BaseSchema>();

    function VisibleBranchConsumer() {
      const branch = props.meta.visible ? 'primary' : 'fallback';
      return <span data-testid="visible-branch">{branch}</span>;
    }

    render(<VisibleBranchConsumer />);

    expect(screen.getByTestId('visible-branch').textContent).toBe('primary');
  });
});
