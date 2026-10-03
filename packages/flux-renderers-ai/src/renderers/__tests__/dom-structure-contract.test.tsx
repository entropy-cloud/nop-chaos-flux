import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { AiTokenUsageRenderer } from '../ai-token-usage.js';
import { AiSuggestionsRenderer } from '../ai-suggestions.js';
import type { ResolvedNodeMeta } from '@nop-chaos/flux-core';

afterEach(() => cleanup());

function stubMeta(testid: string, cid: number): ResolvedNodeMeta {
  return {
    testid,
    cid,
    visible: true,
    hidden: false,
    disabled: false,
    changed: false,
  } as unknown as ResolvedNodeMeta;
}

describe('ai dom-structure contract (root anchors, plan 536)', () => {
  it('ai-token-usage span root carries its slot + anchors', () => {
    const props = {
      schema: { type: 'ai-token-usage' },
      props: {},
      meta: stubMeta('demo-usage', 7),
      events: {},
    };
    const { container } = render(
      React.createElement(
        AiTokenUsageRenderer as unknown as React.ComponentType<typeof props>,
        props,
      ),
    );
    const root = container.querySelector('[data-slot="ai-token-usage"]')!;
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-testid')).toBe('demo-usage');
    expect(root.getAttribute('data-cid')).toBe('7');
  });

  it('ai-suggestions root carries role=list + slot + anchors', () => {
    const props = {
      schema: { type: 'ai-suggestions' },
      props: { items: [{ text: 'A' }, { text: 'B' }] },
      meta: stubMeta('demo-suggestions', 8),
      events: { onSelect: () => undefined },
    };
    const { container } = render(
      React.createElement(
        AiSuggestionsRenderer as unknown as React.ComponentType<typeof props>,
        props,
      ),
    );
    const root = container.querySelector('[data-slot="ai-suggestions"]')!;
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-testid')).toBe('demo-suggestions');
    expect(root.getAttribute('data-cid')).toBe('8');
    expect(root.getAttribute('role')).toBe('list');
    // item slot 抽查
    expect(container.querySelectorAll('[data-slot="ai-suggestions-item"]').length).toBe(2);
  });
});
