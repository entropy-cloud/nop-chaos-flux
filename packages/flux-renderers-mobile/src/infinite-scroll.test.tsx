// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InfiniteScrollSchema } from './schemas.js';
import { InfiniteScrollRenderer } from './infinite-scroll.js';
import { createMockRendererProps } from './test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

class MockIntersectionObserver {
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
    /* no-op */
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

function renderInfiniteScroll(
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
    onLoadMore?: () => Promise<void> | void;
    body?: React.ReactNode;
  } = {},
) {
  const onLoadMore = vi.fn(
    options.onLoadMore ??
      (async () => {
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
    regions: { body: options.body ?? <div data-testid="body-content">Body</div> },
    events: { onLoadMore: onLoadMore as never },
  });
  const view = render(<InfiniteScrollRenderer {...props} />);
  return { view, onLoadMore, props };
}

describe('InfiniteScrollRenderer', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    MockIntersectionObserver.lastInstance = undefined;
    (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = MockIntersectionObserver;
  });

  afterEach(() => {
    delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
  });

  it('renders body and sentinel in normal state', () => {
    const { view } = renderInfiniteScroll({ immediateCheck: false, hasMore: true });
    expect(screen.getByTestId('body-content')).toBeTruthy();
    expect(view.container.querySelector('[data-slot="infinite-scroll-sentinel"]')).toBeTruthy();
    expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
      'normal',
    );
  });

  it('triggers onLoadMore when sentinel intersects and hasMore is true', async () => {
    const { onLoadMore } = renderInfiniteScroll({ immediateCheck: false, hasMore: true });
    MockIntersectionObserver.triggerLast(true);
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));
  });

  it('does NOT trigger onLoadMore when hasMore is false (finished)', () => {
    const { onLoadMore, view } = renderInfiniteScroll({
      immediateCheck: false,
      hasMore: false,
      finishedText: '没有更多了',
    });
    MockIntersectionObserver.triggerLast(true);
    expect(onLoadMore).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
      'finished',
    );
    expect(view.container.querySelector('[data-status-text]')?.getAttribute('data-status-text')).toBe(
      '没有更多了',
    );
  });

  it('shows finished text when hasMore becomes false', () => {
    const { view } = renderInfiniteScroll({ immediateCheck: false, hasMore: false });
    expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
      'finished',
    );
  });

  it('shows loading indicator while runtime.loading is true', () => {
    const { view } = renderInfiniteScroll({
      immediateCheck: false,
      hasMore: true,
      loading: true,
      loadingText: '加载中',
    });
    expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
      'loading',
    );
    expect(view.container.querySelector('[data-status-text]')?.getAttribute('data-status-text')).toBe(
      '加载中',
    );
  });

  it('shows error text and retry button when error=true', () => {
    const { view, onLoadMore } = renderInfiniteScroll({
      immediateCheck: false,
      hasMore: true,
      error: true,
      errorText: '加载失败',
    });
    expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
      'error',
    );
    expect(view.container.querySelector('[data-status-text]')?.getAttribute('data-status-text')).toBe(
      '加载失败',
    );
    fireEvent.click(view.container.querySelector('button') as HTMLButtonElement);
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('does not trigger onLoadMore while loading', () => {
    const { onLoadMore } = renderInfiniteScroll({
      immediateCheck: false,
      hasMore: true,
      loading: true,
    });
    MockIntersectionObserver.triggerLast(true);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not trigger onLoadMore when disabled', () => {
    const { onLoadMore } = renderInfiniteScroll({
      immediateCheck: false,
      hasMore: true,
      disabled: true,
    });
    MockIntersectionObserver.triggerLast(true);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('fires immediate check on mount when immediateCheck is true', async () => {
    const { onLoadMore } = renderInfiniteScroll({ immediateCheck: true, hasMore: true });
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));
  });

  it('does not fire immediate check when immediateCheck is false', async () => {
    const { onLoadMore } = renderInfiniteScroll({ immediateCheck: false, hasMore: true });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
