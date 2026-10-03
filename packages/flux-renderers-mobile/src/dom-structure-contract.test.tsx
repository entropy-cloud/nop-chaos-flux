import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createMockRendererProps } from './test-support.js';
import { PullRefreshRenderer } from './pull-refresh.js';
import { CountdownRenderer } from './countdown.js';
import { NoticeBarRenderer } from './notice-bar.js';
import type { BaseSchema } from '@nop-chaos/flux-core';

afterEach(cleanup);

function mount(component: React.ComponentType<never>, schema: BaseSchema, props: Record<string, unknown> = {}) {
  const mockProps = createMockRendererProps({
    schema: schema as BaseSchema,
    props,
    meta: { testid: 'demo-node', cid: 1, visible: true, disabled: false },
  });
  return render(React.createElement(component, mockProps as never));
}

describe('mobile dom-structure contract (root anchors, plan 534)', () => {
  it('pull-refresh root carries anchors; indicator/body slots declared', () => {
    const { container } = mount(PullRefreshRenderer, { type: 'pull-refresh' } as BaseSchema, {
      body: [],
    });
    const root = container.querySelector('.nop-pull-refresh')!;
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-testid')).toBe('demo-node');
    expect(root.getAttribute('data-cid')).toBe('1');
    expect(container.querySelector('[data-slot="pull-refresh-indicator"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="pull-refresh-body"]')).toBeTruthy();
  });

  it('countdown root carries anchors (span root, prefix/value/suffix slots)', () => {
    const { container } = mount(CountdownRenderer, { type: 'countdown' } as BaseSchema, {
      time: 5000,
      format: 'ss',
    });
    const root = container.querySelector('.nop-countdown')!;
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-testid')).toBe('demo-node');
    expect(container.querySelector('[data-slot="countdown-value"]')).toBeTruthy();
  });

  it('notice-bar root carries anchors; animation layers all declare slots (W7 裁定合规)', () => {
    const { container } = mount(NoticeBarRenderer, { type: 'notice-bar' } as BaseSchema, {
      text: 'Hello world',
    });
    const root = container.querySelector('.nop-notice-bar')!;
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-testid')).toBe('demo-node');
    // 根(:241) → action(:254) → relative 裁剪层(=notice-bar-content :265) → marquee span(:270)
    // 全部层带 slot（动画/裁剪职责归因成立，豁免登记的依据即"已带 slot"）
    expect(container.querySelector('[data-slot="notice-bar-content"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="notice-bar-text"]')).toBeTruthy();
  });
});
