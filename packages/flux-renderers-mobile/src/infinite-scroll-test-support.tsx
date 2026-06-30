import { render } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import type { InfiniteScrollSchema } from './schemas.js';
import { InfiniteScrollRenderer } from './infinite-scroll.js';
import { createMockRendererProps } from './test-support.js';

export class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  static lastInstance: MockIntersectionObserver | undefined;
  static triggerLast(isIntersecting: boolean) {
    const instance = MockIntersectionObserver.lastInstance;
    if (!instance) return;
    instance.callback([{ isIntersecting } as IntersectionObserverEntry], instance);
  }
  static triggerAll(isIntersecting: boolean) {
    for (const instance of MockIntersectionObserver.instances) {
      instance.callback([{ isIntersecting } as IntersectionObserverEntry], instance);
    }
  }
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
  observed: Element[] = [];
  disconnected = false;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
    MockIntersectionObserver.lastInstance = this;
  }
  observe(target: Element) {
    this.observed.push(target);
  }
  unobserve() {
    /* no-op */
  }
  disconnect() {
    this.disconnected = true;
  }
  takeRecords() {
    return [];
  }
  get root() {
    return null;
  }
  get rootMargin() {
    return this.options?.rootMargin ?? '';
  }
  get thresholds() {
    return [];
  }
  get scrollMargin() {
    return '';
  }
}

export function renderInfiniteScroll(
  options: {
    distance?: number;
    disabled?: boolean;
    loadingText?: string;
    finishedText?: string;
    errorText?: string;
    immediateCheck?: boolean;
    hasMore?: boolean;
    loading?: boolean;
    error?: boolean | string;
    onLoadMore?: (event?: unknown) => Promise<void> | void;
    body?: React.ReactNode;
  } = {},
) {
  const onLoadMore = vi.fn(
    options.onLoadMore ??
      (async (_event?: unknown) => {
        /* no-op */
      }),
  );
  const props = createMockRendererProps<InfiniteScrollSchema>({
    schema: { type: 'infinite-scroll' },
    props: {
      distance: options.distance,
      disabled: options.disabled,
      loadingText: options.loadingText,
      finishedText: options.finishedText,
      errorText: options.errorText,
      immediateCheck: options.immediateCheck,
      hasMore: options.hasMore,
      loading: options.loading,
      error: options.error,
    },
    regions: { body: options.body ?? <div data-testid="body-content">{'Body'}</div> },
    events: { onLoadMore: onLoadMore as never },
  });
  const view = render(<InfiniteScrollRenderer {...props} />);
  return { view, onLoadMore, props };
}
