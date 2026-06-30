import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InfiniteScrollSchema } from './schemas.js';
import { InfiniteScrollRenderer } from './infinite-scroll.js';
import { createMockRendererProps } from './test-support.js';
import { MockIntersectionObserver, renderInfiniteScroll } from './infinite-scroll-test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
});
