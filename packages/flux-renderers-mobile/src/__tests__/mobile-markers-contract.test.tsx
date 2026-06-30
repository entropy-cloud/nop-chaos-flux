import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import React from 'react';
import * as MobileEntry from '../index.js';
import type {
  CountdownSchema,
  InfiniteScrollSchema,
  NoticeBarSchema,
  PullRefreshSchema,
  SwipeCellSchema,
} from '../schemas.js';
import { CountdownRenderer } from '../countdown.js';
import { InfiniteScrollRenderer } from '../infinite-scroll.js';
import { NoticeBarRenderer } from '../notice-bar.js';
import { PullRefreshRenderer } from '../pull-refresh.js';
import { SwipeCellRenderer } from '../swipe-cell.js';
import { createMockRendererProps } from '../test-support.js';

afterEach(() => {
  cleanup();
});

const RENDERER_TYPES = ['notice-bar', 'pull-refresh', 'infinite-scroll', 'swipe-cell', 'countdown'] as const;

// Block renderer-internal BEM region/modifier classes (nop-X__region,
// nop-X--modifier) while still allowing the root marker (nop-X) and the
// @nop-chaos/ui mobile utility classes (nop-haptic/nop-safe-*/nop-hairline*).
const BEM_PATTERN = /\bnop-(?:notice-bar|pull-refresh|infinite-scroll|swipe-cell|countdown)(?:__|--)\w+/;

function findBemViolations(container: HTMLElement): string[] {
  const violations: string[] = [];
  for (const el of container.querySelectorAll('*')) {
    const className = el.getAttribute('class');
    if (!className) continue;
    const match = className.match(BEM_PATTERN);
    if (match) violations.push(`${match[0]} on <${el.tagName.toLowerCase()}>`);
  }
  return violations;
}

describe('mobile renderer markers contract (MA-03/MA-25)', () => {
  it('notice-bar emits no BEM region/modifier classes; data-slot/data-variant present', () => {
    const props = createMockRendererProps<NoticeBarSchema>({
      schema: { type: 'notice-bar' },
      props: { text: 'hello', variant: 'warning' },
    });
    const { container } = render(<NoticeBarRenderer {...props} />);
    expect(findBemViolations(container)).toEqual([]);
    const root = container.querySelector('[data-slot="notice-bar"]');
    expect(root).toBeTruthy();
    expect(root?.getAttribute('data-variant')).toBe('warning');
  });

  it('pull-refresh emits no BEM region/modifier classes; data-slot/data-status present', () => {
    const props = createMockRendererProps<PullRefreshSchema>({
      schema: { type: 'pull-refresh' },
      props: { threshold: 60 },
      regions: { body: <div>body</div> },
    });
    const { container } = render(<PullRefreshRenderer {...props} />);
    expect(findBemViolations(container)).toEqual([]);
    expect(container.querySelector('[data-slot="pull-refresh"]')).toBeTruthy();
    expect(container.querySelector('[data-status]')?.getAttribute('data-status')).toBe('normal');
  });

  it('infinite-scroll emits no BEM region/modifier classes; data-slot/data-status present', () => {
    const props = createMockRendererProps<InfiniteScrollSchema>({
      schema: { type: 'infinite-scroll' },
      props: { hasMore: true },
      regions: { body: <div>body</div> },
    });
    const { container } = render(<InfiniteScrollRenderer {...props} />);
    expect(findBemViolations(container)).toEqual([]);
    expect(container.querySelector('[data-slot="infinite-scroll"]')).toBeTruthy();
    expect(container.querySelector('[data-status]')?.getAttribute('data-status')).toBe('normal');
  });

  it('swipe-cell emits no BEM region/modifier classes; data-slot/data-state present', () => {
    const props = createMockRendererProps<SwipeCellSchema>({
      schema: { type: 'swipe-cell' },
      props: {},
      regions: {
        body: <div>body</div>,
        left: <button type="button">archive</button>,
        right: <button type="button">delete</button>,
      },
    });
    const { container } = render(<SwipeCellRenderer {...props} />);
    expect(findBemViolations(container)).toEqual([]);
    expect(container.querySelector('[data-slot="swipe-cell"]')).toBeTruthy();
    expect(container.querySelector('[data-state]')?.getAttribute('data-state')).toBe('closed');
  });

  it('countdown emits no BEM region/modifier classes; data-slot present', () => {
    const props = createMockRendererProps<CountdownSchema>({
      schema: { type: 'countdown' },
      props: { time: 60_000 },
    });
    const { container } = render(<CountdownRenderer {...props} />);
    expect(findBemViolations(container)).toEqual([]);
    expect(container.querySelector('[data-slot="countdown"]')).toBeTruthy();
  });

  it('no mobile renderer BEM class leaks across all five renderers', () => {
    const cases: Array<{ name: string; node: React.ReactNode }> = [
      {
        name: 'notice-bar',
        node: (
          <NoticeBarRenderer
            {...createMockRendererProps<NoticeBarSchema>({
              schema: { type: 'notice-bar' },
              props: { text: ['a', 'b'], variant: 'error', closable: true, scrollable: true },
            })}
          />
        ),
      },
      {
        name: 'pull-refresh',
        node: (
          <PullRefreshRenderer
            {...createMockRendererProps<PullRefreshSchema>({
              schema: { type: 'pull-refresh' },
              props: { threshold: 60 },
              regions: { body: <div>body</div> },
            })}
          />
        ),
      },
      {
        name: 'infinite-scroll',
        node: (
          <InfiniteScrollRenderer
            {...createMockRendererProps<InfiniteScrollSchema>({
              schema: { type: 'infinite-scroll' },
              props: { hasMore: false, loading: false },
              regions: { body: <div>body</div> },
            })}
          />
        ),
      },
      {
        name: 'swipe-cell',
        node: (
          <SwipeCellRenderer
            {...createMockRendererProps<SwipeCellSchema>({
              schema: { type: 'swipe-cell' },
              props: {},
              regions: {
                body: <div>body</div>,
                left: <button type="button">a</button>,
                right: <button type="button">b</button>,
              },
            })}
          />
        ),
      },
      {
        name: 'countdown',
        node: (
          <CountdownRenderer
            {...createMockRendererProps<CountdownSchema>({
              schema: { type: 'countdown' },
              props: { time: 60_000 },
            })}
          />
        ),
      },
    ];

    for (const c of cases) {
      const { container } = render(c.node);
      const violations = findBemViolations(container);
      if (violations.length > 0) {
        throw new Error(`${c.name} leaked BEM classes: ${violations.join(', ')}`);
      }
      expect(violations).toEqual([]);
      cleanup();
    }
  });

  it('sanity: the five renderer type names are covered', () => {
    expect(RENDERER_TYPES.length).toBe(5);
    expect(RENDERER_TYPES).toContain('notice-bar');
    expect(RENDERER_TYPES).toContain('countdown');
  });
});

describe('mobile package public API surface (MM-11)', () => {
  it('exports exactly the five renderers + definitions + registerer, and NOT the zero-consumer helpers', () => {
    // MM-11: the public `.` entry is frozen to the renderer surface. The
    // helper hooks/types (useTouch, useCountdownTimer, formatCountdown,
    // TouchState, ...) were dropped after grep confirmed zero external
    // consumers; they remain in-package via their internal modules.
    const runtimeExports = Object.keys(MobileEntry).sort();
    expect(runtimeExports).toEqual(
      [
        'CountdownRenderer',
        'InfiniteScrollRenderer',
        'NoticeBarRenderer',
        'PullRefreshRenderer',
        'SwipeCellRenderer',
        'mobileRendererDefinitions',
        'registerMobileRenderers',
      ].sort(),
    );
    // Explicitly assert the dropped helpers are absent from the public surface.
    expect(MobileEntry).not.toHaveProperty('useTouch');
    expect(MobileEntry).not.toHaveProperty('useCountdownTimer');
    expect(MobileEntry).not.toHaveProperty('formatCountdown');
    // The renderers + registerer are callable values.
    expect(typeof MobileEntry.registerMobileRenderers).toBe('function');
    expect(typeof MobileEntry.mobileRendererDefinitions).toBe('object');
  });
});
