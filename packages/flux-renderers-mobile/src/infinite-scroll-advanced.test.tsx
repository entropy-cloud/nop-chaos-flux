import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
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

describe('InfiniteScrollRenderer advanced behaviour', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    MockIntersectionObserver.lastInstance = undefined;
    (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = MockIntersectionObserver;
  });

  afterEach(() => {
    delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
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

  it('error row exposes exactly one focusable control (inner <Button>); outer status div is not operable (NEW-MM-02)', () => {
    const { view } = renderInfiniteScroll({
      immediateCheck: false,
      hasMore: true,
      error: true,
      errorText: '加载失败',
    });
    const statusRow = view.container.querySelector(
      '[data-slot="infinite-scroll-status"]',
    ) as HTMLElement;
    expect(statusRow).toBeTruthy();
    // Outer status div carries announcement semantics only.
    expect(statusRow.getAttribute('role')).toBe('status');
    expect(statusRow.getAttribute('aria-live')).toBe('polite');
    // NOT operable / NOT focusable.
    expect(statusRow.hasAttribute('tabindex')).toBe(false);
    expect(statusRow.hasAttribute('onclick')).toBe(false);
    expect(statusRow.hasAttribute('onkeydown')).toBe(false);
    // Exactly one focusable control: the retry <Button>.
    const buttons = statusRow.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    const allFocusable = statusRow.querySelectorAll(
      'button, a, input, select, textarea, [tabindex]',
    );
    expect(allFocusable).toHaveLength(1);
  });

  it('releases the in-flight guard when host clears `error` without touching `loading` (OA-16)', async () => {
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

    // 1) first intersection triggers onLoadMore; in-flight guard set
    MockIntersectionObserver.triggerLast(true);
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));

    // 2) host surfaces failure via `error: true` WITHOUT flipping `loading`.
    //    With the OA-16 fix, the `error` dep transition releases the guard.
    view.rerender(
      <InfiniteScrollRenderer {...props} props={{ ...props.props, error: true }} />,
    );

    // 3) host clears `error` (documented recovery lever) — `loading` is never
    //    touched. Without OA-16 this path deadlocks the list.
    view.rerender(
      <InfiniteScrollRenderer {...props} props={{ ...props.props, error: undefined }} />,
    );

    // 4) a subsequent intersection must fire onLoadMore a second time.
    MockIntersectionObserver.triggerLast(true);
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(2));
  });

  it('renders the host-supplied error string when error is a non-empty string (OA-17 / Decision a)', () => {
    const { view } = renderInfiniteScroll({
      immediateCheck: false,
      hasMore: true,
      error: '网络超时',
      errorText: '加载失败，点击重试',
    });
    const statusRow = view.container.querySelector(
      '[data-slot="infinite-scroll-status"]',
    ) as HTMLElement;
    // Host string overrides default errorText in both data-status-text and the
    // retry button label.
    expect(statusRow.getAttribute('data-status-text')).toBe('网络超时');
    expect(statusRow.querySelector('button')?.textContent).toBe('网络超时');
  });

  it('falls back to errorText when error is boolean true or an empty string (OA-17)', () => {
    const { view: viewBool } = renderInfiniteScroll({
      immediateCheck: false,
      hasMore: true,
      error: true,
      errorText: '加载失败，点击重试',
    });
    expect(
      viewBool
        .container!.querySelector('[data-slot="infinite-scroll-status"]')
        ?.getAttribute('data-status-text'),
    ).toBe('加载失败，点击重试');

    cleanup();

    const { view: viewEmpty } = renderInfiniteScroll({
      immediateCheck: false,
      hasMore: true,
      error: '',
      errorText: '加载失败，点击重试',
    });
    expect(
      viewEmpty
        .container!.querySelector('[data-slot="infinite-scroll-status"]')
        ?.getAttribute('data-status-text'),
    ).toBe('加载失败，点击重试');
  });

  it('emits a DEV-only console.error when onLoadMore rejects (NEW-MM-01)', async () => {
    const onLoadMore = vi.fn(async () => {
      throw new Error('network');
    });
    const props = createMockRendererProps<InfiniteScrollSchema>({
      schema: { type: 'infinite-scroll' },
      props: { immediateCheck: false, hasMore: true },
      regions: { body: <div data-testid="body-content">Body</div> },
      events: { onLoadMore: onLoadMore as never },
    });
    render(<InfiniteScrollRenderer {...props} />);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      // vitest sets import.meta.env.DEV = true by default.
      MockIntersectionObserver.triggerLast(true);
      await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));
      await Promise.resolve();
      await Promise.resolve();
      const diagnostic = errorSpy.mock.calls.filter((c) =>
        /\[flux\.infinite-scroll\]/.test(String(c[0])),
      );
      expect(diagnostic).toHaveLength(1);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('stays silent in non-DEV builds when onLoadMore rejects (NEW-MM-01)', async () => {
    const onLoadMore = vi.fn(async () => {
      throw new Error('network');
    });
    const props = createMockRendererProps<InfiniteScrollSchema>({
      schema: { type: 'infinite-scroll' },
      props: { immediateCheck: false, hasMore: true },
      regions: { body: <div data-testid="body-content">Body</div> },
      events: { onLoadMore: onLoadMore as never },
    });
    render(<InfiniteScrollRenderer {...props} />);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      vi.stubEnv('DEV', false);
      MockIntersectionObserver.triggerLast(true);
      await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));
      await Promise.resolve();
      await Promise.resolve();
      const diagnostic = errorSpy.mock.calls.filter((c) =>
        /\[flux\.infinite-scroll\]/.test(String(c[0])),
      );
      expect(diagnostic).toHaveLength(0);
    } finally {
      vi.unstubAllEnvs();
      errorSpy.mockRestore();
    }
  });

  it('emits a DEV-only console.error when onLoadMore throws synchronously (NEW-MM-01)', () => {
    const onLoadMoreSync = vi.fn(() => {
      throw new Error('sync boom');
    });
    const props = createMockRendererProps<InfiniteScrollSchema>({
      schema: { type: 'infinite-scroll' },
      props: { immediateCheck: false, hasMore: true },
      regions: { body: <div data-testid="body-content">Body</div> },
      events: { onLoadMore: onLoadMoreSync as never },
    });
    render(<InfiniteScrollRenderer {...props} />);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      MockIntersectionObserver.triggerLast(true);
      const diagnostic = errorSpy.mock.calls.filter((c) =>
        /\[flux\.infinite-scroll\]/.test(String(c[0])),
      );
      expect(diagnostic).toHaveLength(1);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('emits a { type: "loadmore", source } payload on every trigger path (MM-12)', async () => {
    // MM-12: onLoadMore was the only semantic event emitting no `{ type, ... }`
    // payload. It now aligns with the package's other 5 semantic events and
    // carries a `source` discriminator across its three trigger paths. The
    // payload is captured via a closure (not .mock.calls indexing) so the
    // assertion is independent of vi.fn call-tuple typing.
    const makeCapture = () => {
      const captured: unknown[] = [];
      const onLoadMore = vi.fn(async (event?: unknown) => {
        captured.push(event);
      });
      return { captured, onLoadMore };
    };

    // immediate check path
    {
      const { captured, onLoadMore } = makeCapture();
      renderInfiniteScroll({ immediateCheck: true, hasMore: true, onLoadMore });
      await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));
      expect(captured[0]).toEqual({ type: 'loadmore', source: 'immediate' });
      cleanup();
    }
    // intersection path
    {
      const { captured, onLoadMore } = makeCapture();
      renderInfiniteScroll({ immediateCheck: false, hasMore: true, onLoadMore });
      MockIntersectionObserver.triggerLast(true);
      await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));
      expect(captured[0]).toEqual({ type: 'loadmore', source: 'intersection' });
      cleanup();
    }
    // retry button path
    {
      const { captured, onLoadMore } = makeCapture();
      const { view } = renderInfiniteScroll({
        immediateCheck: false,
        hasMore: true,
        error: true,
        errorText: '重试',
        onLoadMore,
      });
      fireEvent.click(view.container.querySelector('button') as HTMLButtonElement);
      await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));
      expect(captured[0]).toEqual({ type: 'loadmore', source: 'retry' });
    }
  });

  it('fires onLoadMore exactly once on mount under React StrictMode (MM-16)', async () => {
    // MM-16: effects run in declaration order with no cleanup-aware guard reset.
    // Under React 19 StrictMode (setup → cleanup → setup) the [loading,error]
    // reset effect re-ran on the second setup and cleared isLoadingRef.current
    // BEFORE the immediateCheck effect re-ran, which then saw the guard clear and
    // dispatched onLoadMore a second time. The fix only releases the guard when
    // loading/error actually change, so the second setup keeps the guard set.
    const onLoadMore = vi.fn(async () => {
      /* no-op */
    });
    const props = createMockRendererProps<InfiniteScrollSchema>({
      schema: { type: 'infinite-scroll' },
      props: { immediateCheck: true, hasMore: true },
      regions: { body: <div data-testid="body-content">Body</div> },
      events: { onLoadMore: onLoadMore as never },
    });
    render(
      <React.StrictMode>
        <InfiniteScrollRenderer {...props} />
      </React.StrictMode>,
    );
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));
    // Settle any queued microtasks; a second StrictMode setup must NOT bump it.
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('disables the retry button when disabled && error (MM-25)', () => {
    // MM-25: with disabled:true && error:true the retry <Button> rendered fully
    // enabled, but clicking it called triggerLoadMore() which silently returned
    // on the disabled guard — a dead-button UX that violates WCAG 4.1.2
    // operability. The fix forwards `disabled` so the control is honestly
    // disabled (and a native disabled button does not dispatch click).
    const { view, onLoadMore } = renderInfiniteScroll({
      immediateCheck: false,
      hasMore: true,
      disabled: true,
      error: true,
      errorText: '加载失败',
    });
    const btn = view.container.querySelector('button') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBe(true);
    // Clicking a genuinely disabled button must not dispatch onLoadMore.
    fireEvent.click(btn);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('roots the IntersectionObserver at the nearest scrollable ancestor (MM-20)', async () => {
    // MM-20: the dominant mobile list pattern nests a list inside an inner
    // scrollable <div> (page header + scrollable list + footer). Previously the
    // observer never passed `root`, so it always observed viewport intersection
    // — a nested list whose own scroller bottomed out never fired onLoadMore.
    // The fix walks up from the sentinel to the first `overflow-y: auto/scroll`
    // ancestor and roots the observer there. This assertion FAILS against
    // pre-fix main (root was always undefined).
    const onLoadMore = vi.fn(async () => {
      /* no-op */
    });
    const props = createMockRendererProps<InfiniteScrollSchema>({
      schema: { type: 'infinite-scroll' },
      props: { immediateCheck: false, hasMore: true },
      regions: { body: <div data-testid="body-content">Body</div> },
      events: { onLoadMore: onLoadMore as never },
    });
    const scrollRef = React.createRef<HTMLDivElement>();
    render(
      <div
        ref={scrollRef}
        data-testid="scroll-ancestor"
        style={{ height: 100, overflowY: 'auto' }}
      >
        <InfiniteScrollRenderer {...props} />
      </div>,
    );

    expect(MockIntersectionObserver.lastInstance).toBeTruthy();
    // The observer MUST be rooted at the scrollable ancestor, not the viewport.
    expect(MockIntersectionObserver.lastInstance!.options?.root).toBe(scrollRef.current);

    // The rooted observer still fires onLoadMore when intersection triggers.
    MockIntersectionObserver.triggerLast(true);
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));
  });

  it('falls back to the viewport (no root) when no scrollable ancestor exists (MM-20)', () => {
    // MM-20: without a `overflow-y: auto/scroll` ancestor, `root` is omitted so
    // the observer keeps the original viewport-observing behavior.
    renderInfiniteScroll({ immediateCheck: false, hasMore: true });
    expect(MockIntersectionObserver.lastInstance).toBeTruthy();
    expect(MockIntersectionObserver.lastInstance!.options?.root).toBeUndefined();
  });
});

// plan 839 N2: immediateCheck previously re-fired unconditionally on every
// loading true→false release, draining the whole dataset regardless of scroll
// position. The schemas.ts contract ("内容不足一屏时自动加载") requires the
// immediate path to honor the same viewport proximity as the intersection path.
describe('InfiniteScrollRenderer immediateCheck viewport gating (plan 839 N2)', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    MockIntersectionObserver.lastInstance = undefined;
    (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = MockIntersectionObserver;
  });

  afterEach(() => {
    delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
  });

  function makeProps(onLoadMore: ReturnType<typeof vi.fn>, overrides: Record<string, unknown>) {
    return createMockRendererProps<InfiniteScrollSchema>({
      schema: { type: 'infinite-scroll' },
      props: { immediateCheck: true, hasMore: true, ...overrides },
      regions: { body: <div data-testid="body-content">Body</div> },
      events: { onLoadMore: onLoadMore as never },
    });
  }

  it('does not auto-load when the sentinel sits below the viewport, even across loading cycles', async () => {
    const onLoadMore = vi.fn(async () => {
      /* no-op */
    });
    const farRect = {
      top: 5000,
      bottom: 5001,
      height: 1,
      width: 100,
      left: 0,
      right: 100,
      x: 0,
      y: 5000,
      toJSON: () => ({}),
    } as DOMRect;
    const spy = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: Element) {
        if (this.getAttribute?.('data-slot') === 'infinite-scroll-sentinel') {
          return farRect;
        }
        return {
          top: 0,
          bottom: 768,
          height: 768,
          width: 375,
          left: 0,
          right: 375,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        } as DOMRect;
      });

    try {
      const { rerender } = render(<InfiniteScrollRenderer {...makeProps(onLoadMore, {})} />);
      await waitFor(() =>
        expect(document.querySelector('[data-slot="infinite-scroll"]')).toBeTruthy(),
      );
      await Promise.resolve();
      expect(onLoadMore).not.toHaveBeenCalled();

      // A full host load cycle (loading true→false) must not re-arm the
      // immediate path while the sentinel stays out of range.
      rerender(<InfiniteScrollRenderer {...makeProps(onLoadMore, { loading: true })} />);
      rerender(<InfiniteScrollRenderer {...makeProps(onLoadMore, { loading: false })} />);
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(onLoadMore).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('keeps auto-filling while content stays shorter than the viewport (contract preserved)', async () => {
    const onLoadMore = vi.fn(async () => {
      /* no-op */
    });
    // jsdom rects are all zero → the sentinel counts as visible, which is the
    // documented "内容不足一屏时自动加载" situation: every finished page may
    // arm the next one until hasMore goes false.
    const { rerender } = render(<InfiniteScrollRenderer {...makeProps(onLoadMore, {})} />);
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));

    rerender(<InfiniteScrollRenderer {...makeProps(onLoadMore, { loading: true })} />);
    await Promise.resolve();
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    rerender(<InfiniteScrollRenderer {...makeProps(onLoadMore, { loading: false })} />);
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(2));

    rerender(<InfiniteScrollRenderer {...makeProps(onLoadMore, { loading: true })} />);
    rerender(
      <InfiniteScrollRenderer {...makeProps(onLoadMore, { loading: false, hasMore: false })} />,
    );
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onLoadMore).toHaveBeenCalledTimes(2);
    expect(
      document.querySelector('[data-slot="infinite-scroll"]')?.getAttribute('data-status'),
    ).toBe('finished');
  });
});
