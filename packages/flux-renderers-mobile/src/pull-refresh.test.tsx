// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    direction?: 'down' | 'up';
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

  it('respects up direction (delta sign reversed)', async () => {
    const { view, onRefresh } = renderPullRefresh({ threshold: 50, direction: 'up' });
    const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
    // direction 'up' means swipe upward (deltaY negative) triggers
    fireEvent.touchStart(root, touch(0, 200));
    fireEvent.touchMove(root, touch(0, 0));
    fireEvent.touchEnd(root);
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    expect(view.container.querySelector('[data-direction]')?.getAttribute('data-direction')).toBe(
      'up',
    );
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

  it('does not setState after unmount during in-flight refresh (MA-12)', () => {
    vi.useFakeTimers();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      let resolveRefresh: () => void = () => undefined;
      const onRefreshImpl = () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        });
      const { view } = renderPullRefresh({
        threshold: 60,
        successDuration: 200,
        onRefresh: onRefreshImpl,
      });
      const root = view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
      fireEvent.touchStart(root, touch(0, 0));
      fireEvent.touchMove(root, touch(0, 200));
      fireEvent.touchEnd(root);

      // Unmount while the refresh promise is still in-flight.
      view.unmount();

      // Resolving now + advancing the success-timer window must not schedule
      // or invoke any setState on the unmounted instance.
      resolveRefresh();
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(view.container.querySelector('[data-slot="pull-refresh"]')).toBeNull();
      const unmountWarnings = errorSpy.mock.calls.filter((c) =>
        /unmount/i.test(String(c[0])),
      );
      expect(unmountWarnings).toHaveLength(0);
    } finally {
      errorSpy.mockRestore();
      vi.useRealTimers();
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
});
