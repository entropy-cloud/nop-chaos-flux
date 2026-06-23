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

  it('does not double-fire onLoadMore when host loading prop is delayed (MA-13)', async () => {
    const { onLoadMore } = renderInfiniteScroll({
      immediateCheck: false,
      hasMore: true,
    });
    MockIntersectionObserver.triggerLast(true);
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));
    // Host never flips `loading` to true (delayed/untracked). Repeated
    // intersections must be deduped by the local in-flight guard.
    MockIntersectionObserver.triggerLast(true);
    MockIntersectionObserver.triggerLast(true);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('releases the in-flight guard when host loading prop transitions (MA-13)', async () => {
    const onLoadMore = vi.fn(async () => {
      /* no-op */
    });
    const props = createMockRendererProps<InfiniteScrollSchema>({
      schema: { type: 'infinite-scroll' },
      props: { immediateCheck: false, hasMore: true, loading: false },
      regions: { body: <div data-testid="body-content">Body</div> },
      events: { onLoadMore: onLoadMore as never },
    });
    const view = render(<InfiniteScrollRenderer {...props} />);

    MockIntersectionObserver.triggerLast(true);
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));

    // Host acknowledges the request (loading:true) then concludes (loading:false).
    view.rerender(
      <InfiniteScrollRenderer {...props} props={{ ...props.props, loading: true }} />,
    );
    view.rerender(
      <InfiniteScrollRenderer {...props} props={{ ...props.props, loading: false }} />,
    );

    // Guard is released; a new intersection must fire a second time.
    MockIntersectionObserver.triggerLast(true);
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(2));
  });

  it('does not auto-fire onLoadMore while error=true; retry button resumes (OA-10)', () => {
    const { view, onLoadMore } = renderInfiniteScroll({
      immediateCheck: false,
      hasMore: true,
      error: true,
      errorText: '加载失败',
    });
    MockIntersectionObserver.triggerLast(true);
    expect(onLoadMore).not.toHaveBeenCalled();

    // The retry <Button> is the only path that may resume loading in error state.
    fireEvent.click(view.container.querySelector('button') as HTMLButtonElement);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not auto-fire onLoadMore when error is a string (OA-10)', () => {
    const { onLoadMore } = renderInfiniteScroll({
      immediateCheck: false,
      hasMore: true,
      error: 'boom',
    });
    MockIntersectionObserver.triggerLast(true);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not fire immediate check when error is set at mount (OA-10)', async () => {
    const { onLoadMore } = renderInfiniteScroll({
      immediateCheck: true,
      hasMore: true,
      error: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('treats hasMore as implicit-truthy: undefined still allows loading (hasMore semantic)', () => {
    const { onLoadMore } = renderInfiniteScroll({
      immediateCheck: false,
      hasMore: undefined,
    });
    MockIntersectionObserver.triggerLast(true);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not crash when onLoadMore rejects (MA-14)', async () => {
    const onLoadMore = vi.fn(async () => {
      throw new Error('network');
    });
    const props = createMockRendererProps<InfiniteScrollSchema>({
      schema: { type: 'infinite-scroll' },
      props: { immediateCheck: false, hasMore: true },
      regions: { body: <div data-testid="body-content">Body</div> },
      events: { onLoadMore: onLoadMore as never },
    });
    const view = render(<InfiniteScrollRenderer {...props} />);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      MockIntersectionObserver.triggerLast(true);
      await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));
      // flush microtasks so the rejection is settled
      await Promise.resolve();
      await Promise.resolve();
      expect(view.container.querySelector('[data-slot="infinite-scroll"]')).toBeTruthy();
      const unhandled = errorSpy.mock.calls.filter((c) =>
        /unhandled|uncaught/i.test(String(c[0])),
      );
      expect(unhandled).toHaveLength(0);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('rebuilds IntersectionObserver when distance/disabled/hasMore/loading/error change (MA-20)', () => {
    const { view, props } = renderInfiniteScroll({
      immediateCheck: false,
      hasMore: true,
      distance: 100,
    });
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    const first = MockIntersectionObserver.instances[0];
    expect(first.disconnected).toBe(false);
    expect(first.options?.rootMargin).toBe('0px 0px 100px 0px');

    const rerenderWith = (patch: Record<string, unknown>) =>
      view.rerender(<InfiniteScrollRenderer {...props} props={{ ...props.props, ...patch }} />);

    // distance change → rebuild + disconnect old
    rerenderWith({ distance: 250 });
    expect(MockIntersectionObserver.instances).toHaveLength(2);
    expect(first.disconnected).toBe(true);
    expect(MockIntersectionObserver.instances[1]?.options?.rootMargin).toBe(
      '0px 0px 250px 0px',
    );

    // disabled change → rebuild
    const second = MockIntersectionObserver.instances[1];
    rerenderWith({ disabled: true });
    expect(MockIntersectionObserver.instances).toHaveLength(3);
    expect(second.disconnected).toBe(true);

    // hasMore → false (finished) → rebuild
    const third = MockIntersectionObserver.instances[2];
    rerenderWith({ disabled: false, hasMore: false });
    expect(MockIntersectionObserver.instances).toHaveLength(4);
    expect(third.disconnected).toBe(true);

    // loading → true → rebuild
    const fourth = MockIntersectionObserver.instances[3];
    rerenderWith({ hasMore: true, loading: true });
    expect(MockIntersectionObserver.instances).toHaveLength(5);
    expect(fourth.disconnected).toBe(true);

    // error → true → rebuild (OA-10: observer must re-arm with error guard)
    const fifth = MockIntersectionObserver.instances[4];
    rerenderWith({ loading: false, error: true });
    expect(MockIntersectionObserver.instances).toHaveLength(6);
    expect(fifth.disconnected).toBe(true);
  });
});
