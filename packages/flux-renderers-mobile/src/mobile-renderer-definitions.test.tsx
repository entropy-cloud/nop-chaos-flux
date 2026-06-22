// @vitest-environment happy-dom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { mobileRendererDefinitions } from './mobile-renderer-definitions.js';
import { createMockRendererProps } from './test-support.js';
import type { CountdownSchema, NoticeBarSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

describe('mobileRendererDefinitions', () => {
  it('declares 5 renderer definitions for mobile types', () => {
    const types = mobileRendererDefinitions.map((def) => def.type).sort();
    expect(types).toEqual(['countdown', 'infinite-scroll', 'notice-bar', 'pull-refresh', 'swipe-cell']);
  });

  it('every definition points at @nop-chaos/flux-renderers-mobile sourcePackage', () => {
    for (const def of mobileRendererDefinitions) {
      expect(def.sourcePackage).toBe('@nop-chaos/flux-renderers-mobile');
    }
  });

  it('every definition has a component', () => {
    for (const def of mobileRendererDefinitions) {
      expect(typeof def.component).toBe('function');
    }
  });

  it('pull-refresh definition declares body region + onRefresh event', () => {
    const pullRefresh = mobileRendererDefinitions.find((d) => d.type === 'pull-refresh');
    expect(pullRefresh?.fields?.find((f) => f.key === 'body')?.kind).toBe('region');
    expect(pullRefresh?.fields?.find((f) => f.key === 'onRefresh')?.kind).toBe('event');
  });

  it('infinite-scroll definition declares body region + onLoadMore event', () => {
    const infiniteScroll = mobileRendererDefinitions.find((d) => d.type === 'infinite-scroll');
    expect(infiniteScroll?.fields?.find((f) => f.key === 'body')?.kind).toBe('region');
    expect(infiniteScroll?.fields?.find((f) => f.key === 'onLoadMore')?.kind).toBe('event');
  });

  it('swipe-cell definition declares body/left/right regions', () => {
    const swipeCell = mobileRendererDefinitions.find((d) => d.type === 'swipe-cell');
    const regionKeys = swipeCell?.fields?.filter((f) => f.kind === 'region').map((f) => f.key);
    expect(regionKeys).toEqual(['body', 'left', 'right']);
  });

  it('countdown definition wires CountdownRenderer component', () => {
    const countdown = mobileRendererDefinitions.find((d) => d.type === 'countdown');
    expect(countdown?.category).toBe('content');
    const props = createMockRendererProps<CountdownSchema>({
      schema: { type: 'countdown' },
      props: { time: 5_000, format: 'ss' },
    });
    const Comp = countdown?.component as React.ComponentType<typeof props>;
    const view = render(<Comp {...props} />);
    expect(view.container.querySelector('[data-slot="countdown"]')).toBeTruthy();
  });

  it('notice-bar definition wires NoticeBarRenderer component', () => {
    const noticeBar = mobileRendererDefinitions.find((d) => d.type === 'notice-bar');
    expect(noticeBar?.category).toBe('content');
    const props = createMockRendererProps<NoticeBarSchema>({
      schema: { type: 'notice-bar' },
      props: { text: 'Hello' },
    });
    const Comp = noticeBar?.component as React.ComponentType<typeof props>;
    const view = render(<Comp {...props} />);
    expect(view.container.querySelector('[data-slot="notice-bar"]')?.getAttribute('data-variant')).toBe(
      'info',
    );
  });
});
