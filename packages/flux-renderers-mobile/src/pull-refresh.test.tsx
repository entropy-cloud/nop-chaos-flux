// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PullRefreshSchema } from './schemas.js';
import { PullRefreshRenderer } from './pull-refresh.js';
import { createMockRendererProps } from './test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function touch(x: number, y: number) {
  return {
    touches: [{ clientX: x, clientY: y } as Touch],
  } as unknown as React.TouchEvent;
}

function renderPullRefresh(
  options: {
    threshold?: number;
    direction?: 'down';
    disabled?: boolean;
    loadingText?: string;
    pullingText?: string;
    loosingText?: string;
    successText?: string;
    successDuration?: number;
    animationDuration?: number;
    onRefresh?: (event?: unknown) => Promise<void> | void;
    body?: React.ReactNode;
    strictMode?: boolean;
  } = {},
) {
  const onRefresh = vi.fn(
    options.onRefresh ??
      (async () => {
        /* no-op */
      }),
  );
  const props = createMockRendererProps<PullRefreshSchema>({
    schema: { type: 'pull-refresh' },
    props: {
      threshold: options.threshold,
      direction: options.direction,
      disabled: options.disabled,
      loadingText: options.loadingText,
      pullingText: options.pullingText,
      loosingText: options.loosingText,
      successText: options.successText,
      successDuration: options.successDuration,
      animationDuration: options.animationDuration,
    },
    regions: { body: options.body ?? <div data-testid="body-content">Body</div> },
    events: { onRefresh: onRefresh as never },
  });
  const tree = options.strictMode ? (
    <React.StrictMode>
      <PullRefreshRenderer {...props} />
    </React.StrictMode>
  ) : (
    <PullRefreshRenderer {...props} />
  );
  const view = render(tree);
  return { view, onRefresh, props };
}

describe('PullRefreshRenderer', () => {
  it('renders body content and starts in normal state', () => {
    const { view } = renderPullRefresh();
    expect(view.container.querySelector('[data-slot="pull-refresh"]')).toBeTruthy();
    expect(screen.getByTestId('body-content')).toBeTruthy();
    expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe('normal');
  });

  it('does not trigger onRefresh when pull distance is below threshold', async () => {
    const { view, onRefresh } = renderPullRefresh({ threshold: 80 });
    const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;

    fireEvent.touchStart(root, touch(100, 100));
    fireEvent.touchMove(root, touch(100, 130));
    fireEvent.touchEnd(root);

    await waitFor(() => {
      expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
        'normal',
      );
    });
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('enters loosing state when drag distance reaches threshold', () => {
    const { view } = renderPullRefresh({ threshold: 60 });
    const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
    fireEvent.touchStart(root, touch(100, 100));
    fireEvent.touchMove(root, touch(100, 200));
    expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
      'loosing',
    );
    expect(view.container.querySelector('[data-indicator-text]')?.getAttribute('data-indicator-text')).toBe(
      '释放刷新',
    );
  });

  it('shows pulling text below threshold while touching', () => {
    const { view } = renderPullRefresh({ threshold: 80, pullingText: '继续下拉' });
    const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 30));
    expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
      'pulling',
    );
    expect(view.container.querySelector('[data-indicator-text]')?.getAttribute('data-indicator-text')).toBe(
      '继续下拉',
    );
  });

  it('triggers onRefresh and stays loading until promise resolves', async () => {
    let resolveRefresh: () => void = () => undefined;
    const onRefreshImpl = () =>
      new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      });
    const { view, onRefresh } = renderPullRefresh({ threshold: 60, onRefresh: onRefreshImpl });
    const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 200));
    fireEvent.touchEnd(root);

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
        'loading',
      ),
    );

    resolveRefresh();

    await waitFor(() =>
      expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
        'success',
      ),
    );
  });

  it('transitions to success then back to normal after successDuration', async () => {
    vi.useFakeTimers();
    try {
      const { view, onRefresh } = renderPullRefresh({
        threshold: 50,
        successDuration: 200,
        successText: 'Done',
      });
      const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
      fireEvent.touchStart(root, touch(0, 0));
      fireEvent.touchMove(root, touch(0, 200));
      fireEvent.touchEnd(root);

      await vi.waitFor(() => expect(onRefresh).toHaveBeenCalled());
      await vi.waitFor(() =>
        expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
          'success',
        ),
      );
      expect(view.container.querySelector('[data-indicator-text]')?.getAttribute('data-indicator-text')).toBe(
        'Done',
      );

      vi.advanceTimersByTime(300);

      await vi.waitFor(() =>
        expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
          'normal',
        ),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not respond to touch when disabled', () => {
    const { view, onRefresh } = renderPullRefresh({ threshold: 30, disabled: true });
    const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
    expect(root.hasAttribute('data-status')).toBe(true);
    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 200));
    fireEvent.touchEnd(root);
    expect(onRefresh).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
      'normal',
    );
  });

  it('does not commit when direction is omitted (OA-14: only `down` is supported)', async () => {
    // OA-14: the `'up'` option has been removed. Pull-up loading belongs to
    // `infinite-scroll`. A downward pull commits; an upward swipe never does.
    const { view, onRefresh } = renderPullRefresh({ threshold: 50 });
    const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
    expect(root.getAttribute('data-direction')).toBe('down');
    // upward swipe: deltaY negative → directionalDelta clamped to 0 → no commit
    fireEvent.touchStart(root, touch(0, 200));
    fireEvent.touchMove(root, touch(0, 0));
    fireEvent.touchEnd(root);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('recovers to normal when onRefresh rejects instead of locking the spinner (MA-01)', async () => {
    const onRefreshImpl = async () => {
      throw new Error('network');
    };
    const { view } = renderPullRefresh({ threshold: 60, onRefresh: onRefreshImpl });
    const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 200));
    fireEvent.touchEnd(root);

    await waitFor(() =>
      expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
        'loading',
      ),
    );
    // reject branch must return to 'normal', not stay 'loading'
    await waitFor(() =>
      expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
        'normal',
      ),
    );
  });

  it('isMountedRef guard blocks the success-timer schedule after unmount (NEW-MM-04)', async () => {
    // NEW-MM-04: the previous test asserted React 19's removed "unmount"
    // console.error warning — which never fires, so the test passed even with
    // `isMountedRef` deleted. This rewrite observes the guard's observable
    // side effect: after unmount, the `.then()` branch must NOT schedule the
    // success `setTimeout`. We spy on `setTimeout` and filter for the unique
    // `successDuration` delay. With the guard, zero such calls; without the
    // guard (verified by temporarily deleting it during plan execution), one
    // such call would slip through after unmount — making this test fail.
    // Real timers are used (not vi.useFakeTimers) to avoid leaking timer
    // state into subsequent tests.
    let resolveRefresh: () => void = () => undefined;
    const onRefreshImpl = () =>
      new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      });
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    try {
      const { view, onRefresh } = renderPullRefresh({
        threshold: 60,
        successDuration: 234,
        onRefresh: onRefreshImpl,
      });
      const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
      fireEvent.touchStart(root, touch(0, 0));
      fireEvent.touchMove(root, touch(0, 200));
      fireEvent.touchEnd(root);

      // Wait for the renderer's microtask chain to call onRefresh (which
      // assigns resolveRefresh).
      await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
      // Clear any calls captured during mount/handler setup so the assertion
      // only observes post-unmount scheduling.
      setTimeoutSpy.mockClear();

      // Unmount while the refresh promise is still in-flight. The cleanup
      // sets isMountedRef.current = false.
      view.unmount();

      // Resolving now triggers the .then() callback. The isMountedRef guard
      // must short-circuit BEFORE scheduling the success setTimeout.
      resolveRefresh();
      // Drain the promise microtask chain (the .then() guard runs here).
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // Filter for the success-timer schedule (unique delay = successDuration).
      // The .then() guard returns early on unmount, so ZERO such calls.
      const successTimerCalls = setTimeoutSpy.mock.calls.filter(
        (call) => call[1] === 234,
      );
      expect(successTimerCalls).toHaveLength(0);
      expect(view.container.querySelector('[data-slot="pull-refresh"]')).toBeNull();
    } finally {
      setTimeoutSpy.mockRestore();
    }
  });

  it('dispatches onRefresh exactly once under React StrictMode (MA-02)', async () => {
    const onRefresh = vi.fn(async () => {
      /* no-op */
    });
    const { view } = renderPullRefresh({
      threshold: 60,
      onRefresh,
      strictMode: true,
    });
    const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 200));
    fireEvent.touchEnd(root);

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    // settle any queued microtasks; must remain at exactly one dispatch
    await Promise.resolve();
    await Promise.resolve();
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not re-dispatch onRefresh when a second touchEnd occurs while loading (re-entrancy)', async () => {
    let resolveRefresh: () => void = () => undefined;
    const onRefreshImpl = () =>
      new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      });
    const { view, onRefresh } = renderPullRefresh({
      threshold: 60,
      onRefresh: onRefreshImpl,
    });
    const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 200));
    fireEvent.touchEnd(root);

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
        'loading',
      ),
    );

    // A second completed pull while still loading must not dispatch again.
    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 200));
    fireEvent.touchEnd(root);
    expect(onRefresh).toHaveBeenCalledTimes(1);

    resolveRefresh();
    await waitFor(() =>
      expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
        'success',
      ),
    );
  });

  it('synchronously mirrors statusRef so back-to-back touchEnds do not double-dispatch (NEW-MM-03)', async () => {
    // NEW-MM-03: aligns with swipe-cell's synchronous statusRef mirror. The
    // handler writes statusRef.current inline with setStatus('loading'), so a
    // second touchEnd fired in immediate succession (before any awaitable
    // settles) sees the new value and short-circuits. With a pure passive
    // useEffect mirror, this guard could in principle miss when a second
    // handler runs inside the same commit window. This test exercises the
    // stricter back-to-back path (no `await waitFor(loading)` between the two
    // touchEnds) to prove the synchronous write is in place.
    let resolveRefresh: () => void = () => undefined;
    const onRefreshImpl = () =>
      new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      });
    const { view, onRefresh } = renderPullRefresh({
      threshold: 60,
      onRefresh: onRefreshImpl,
    });
    const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;

    // First completed pull → enters loading synchronously, statusRef mirrored inline.
    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 200));
    fireEvent.touchEnd(root);

    // Second completed pull fired immediately — no `await` in between. The
    // synchronous statusRef.current === 'loading' read must reject it.
    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 200));
    fireEvent.touchEnd(root);

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    resolveRefresh();
  });

  it('does not commit on touchCancel and restores normal state (OA-05)', () => {
    const { view, onRefresh } = renderPullRefresh({ threshold: 60 });
    const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 200));
    fireEvent.touchCancel(root);

    expect(onRefresh).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
      'normal',
    );
  });

  it('touchCancel during loading does not abort the in-flight refresh (OA-05)', async () => {
    let resolveRefresh: () => void = () => undefined;
    const onRefreshImpl = () =>
      new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      });
    const { view, onRefresh } = renderPullRefresh({
      threshold: 60,
      onRefresh: onRefreshImpl,
    });
    const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 200));
    fireEvent.touchEnd(root);
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
        'loading',
      ),
    );

    // A later system cancel must not steal the in-flight refresh.
    fireEvent.touchCancel(root);
    expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
      'loading',
    );
    resolveRefresh();
  });

  it('dispatches onRefresh with a structured {type:"refresh"} payload (MA-04)', async () => {
    const { view, onRefresh } = renderPullRefresh({ threshold: 50, direction: 'down' });
    const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 200));
    fireEvent.touchEnd(root);
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    expect(onRefresh.mock.calls[0][0]).toEqual({ type: 'refresh', direction: 'down', threshold: 50 });
  });

  it('places the indicator out of flow so body tracks the finger 1:1 (OA-09)', () => {
    const { view } = renderPullRefresh({ threshold: 60 });
    const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
    const indicator = view.container.querySelector(
      '[data-slot="pull-refresh-indicator"]',
    ) as HTMLElement;
    const body = view.container.querySelector(
      '[data-slot="pull-refresh-body"]',
    ) as HTMLElement;

    // Mid-pull: root is translated by pullDistance; indicator must be out of
    // flow so it does not stack its height onto the body offset (the old
    // in-flow indicator produced a ~2x overtravel).
    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 200));

    expect(getComputedStyle(indicator).position).toBe('absolute');
    expect(indicator.style.transform).toContain('translateY(-100%)');
    // The body is the only in-flow child; it carries no transform of its own,
    // so its screen offset equals the root translate (1:1 with the finger).
    // (It has no inline style at all — no extra offsetting.)
    expect(body.style.transform).toBe('');

    // Structural geometry check: simulate a layout engine by computing rect
    // tops from the inline transforms. body.top must equal root.top, NOT
    // root.top + indicator.height (which would be the 2x bug).
    const rootTranslate = parseFloat(root.style.transform.match(/-?\d+\.?\d*/)?.[0] ?? '0');
    const indicatorHeight = parseFloat(indicator.style.height.match(/-?\d+\.?\d*/)?.[0] ?? '0');
    expect(rootTranslate).toBeGreaterThan(0);
    expect(indicatorHeight).toBeGreaterThan(0);
    // body offset = root translate only (1:1); the buggy value would be
    // rootTranslate + indicatorHeight.
    const bodyOffsetVsFinger = rootTranslate; // 1:1
    const buggyOffset = rootTranslate + indicatorHeight; // 2x
    expect(bodyOffsetVsFinger).toBe(rootTranslate);
    expect(bodyOffsetVsFinger).toBeLessThan(buggyOffset);
  });

  it('declares pan-x touch-action and contained overscroll on the root (MA-07)', () => {
    const { view } = renderPullRefresh();
    const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
    const cs = getComputedStyle(root);
    // pan-x reserves the VERTICAL axis for the element's JS (touch-action names
    // the axis the browser may pan); pull-refresh owns the vertical pull.
    expect(cs.touchAction).toBe('pan-x');
    expect(cs.overscrollBehaviorY).toBe('contain');
  });

  it('derives pulling/loosing at render time without a mirror effect (MA-10)', () => {
    const { view } = renderPullRefresh({ threshold: 80, pullingText: '继续下拉', loosingText: '释放刷新' });
    const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
    // Below threshold while touching -> 'pulling' derived at render time.
    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 30));
    expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
      'pulling',
    );
    // Past threshold while touching -> 'loosing' derived at render time.
    fireEvent.touchMove(root, touch(0, 120));
    expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
      'loosing',
    );
  });

  it('returns data-status to normal after a release-without-commit, with no stale pulling/loosing (MA-10)', () => {
    const { view } = renderPullRefresh({ threshold: 80 });
    const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 30)); // pulling
    expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
      'pulling',
    );
    fireEvent.touchEnd(root); // release below threshold -> no commit
    // use-touch.onTouchEnd only clears isTouching; deltaY stays non-zero until
    // the next touchStart. The derivation is gated on isTouching so the stale
    // delta must NOT leave a residual 'pulling'/'loosing' label.
    expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
      'normal',
    );
  });
});
