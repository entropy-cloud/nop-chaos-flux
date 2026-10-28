import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InfiniteScroll } from './infinite-scroll';

type IOCallback = (entries: { isIntersecting: boolean }[]) => void;

class MockIntersectionObserver {
  static lastInstance: MockIntersectionObserver | null = null;
  static callback: IOCallback | null = null;
  private target: Element | null = null;
  constructor(cb: IOCallback) {
    MockIntersectionObserver.callback = cb;
    MockIntersectionObserver.lastInstance = this;
  }
  observe(target: Element) {
    this.target = target;
  }
  disconnect() {
    this.target = null;
    MockIntersectionObserver.callback = null;
  }
  unobserve() {}
  fire(isIntersecting: boolean) {
    MockIntersectionObserver.callback?.([{ isIntersecting }]);
  }
}

describe('InfiniteScroll', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    MockIntersectionObserver.lastInstance = null;
    MockIntersectionObserver.callback = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders loading status when loading', () => {
    render(
      <InfiniteScroll hasMore loading={true} onLoadMore={() => {}}>
        <div>content</div>
      </InfiniteScroll>,
    );
    expect(screen.getByText('加载中...')).toBeTruthy();
  });

  it('renders finished text when hasMore=false and not loading', () => {
    render(
      <InfiniteScroll hasMore={false} loading={false} onLoadMore={() => {}}>
        <div>content</div>
      </InfiniteScroll>,
    );
    expect(screen.getByText('没有更多了')).toBeTruthy();
  });

  it('renders error retry button with provided error message', () => {
    const onLoadMore = vi.fn();
    render(
      <InfiniteScroll hasMore loading={false} error="网络异常" onLoadMore={onLoadMore}>
        <div>content</div>
      </InfiniteScroll>,
    );
    const btn = screen.getByText('网络异常');
    btn.click();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('fires onLoadMore when sentinel intersects and hasMore', () => {
    const onLoadMore = vi.fn();
    render(
      <InfiniteScroll hasMore loading={false} onLoadMore={onLoadMore}>
        <div>content</div>
      </InfiniteScroll>,
    );
    MockIntersectionObserver.lastInstance?.fire(true);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not fire onLoadMore when not hasMore', () => {
    const onLoadMore = vi.fn();
    render(
      <InfiniteScroll hasMore={false} loading={false} onLoadMore={onLoadMore}>
        <div>content</div>
      </InfiniteScroll>,
    );
    MockIntersectionObserver.lastInstance?.fire(true);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not fire onLoadMore when loading', () => {
    const onLoadMore = vi.fn();
    render(
      <InfiniteScroll hasMore loading={true} onLoadMore={onLoadMore}>
        <div>content</div>
      </InfiniteScroll>,
    );
    MockIntersectionObserver.lastInstance?.fire(true);
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
