// OA-18 regression suite — pull-refresh rebound GEOMETRY.
//
// The package's whole reason for existing is native-feel rebound geometry. For
// three audits running the data-* assertions (data-status) passed while the
// inline `style.transform` was wrong: after every release the root stuck at the
// stale damped pull distance because `use-touch.onTouchEnd` only clears
// `isTouching`, not `deltaY` (documented at pull-refresh.tsx:104-108). The
// resting `trackTranslate` derived from the un-gated `pullDistance`, so
// `translateY` never returned to `0px`. This file closes that data-*-only gap:
// it asserts the inline transform geometry at rest, which the data-* suite
// cannot see. These assertions demonstrably fail against the pre-OA-18 code.
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PullRefreshSchema } from '../schemas.js';
import { PullRefreshRenderer } from '../pull-refresh.js';
import { createMockRendererProps } from '../test-support.js';

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
    disabled?: boolean;
    successDuration?: number;
    animationDuration?: number;
    onRefresh?: (event?: unknown) => Promise<void> | void;
    body?: React.ReactNode;
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
      disabled: options.disabled,
      successDuration: options.successDuration,
      animationDuration: options.animationDuration,
    },
    regions: { body: options.body ?? <div data-testid="body-content">Body</div> },
    events: { onRefresh: onRefresh as never },
  });
  const view = render(<PullRefreshRenderer {...props} />);
  return { view, onRefresh };
}

function rootEl(view: ReturnType<typeof render>) {
  return view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
}

describe('PullRefreshRenderer rebound geometry (OA-18)', () => {
  it('rests at translateY(0px) after a below-threshold release', () => {
    const { view } = renderPullRefresh({ threshold: 80 });
    const root = rootEl(view);

    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 30)); // below threshold while touching
    // While touching, the body tracks the finger (non-zero translate).
    expect(root.style.transform).not.toBe('translateY(0px)');

    fireEvent.touchEnd(root); // release below threshold -> no commit
    // use-touch.onTouchEnd clears isTouching but leaves deltaY non-zero. The
    // resting translate MUST still be 0px (the OA-18 defect leaves the stale
    // damped pull distance here).
    expect(root.style.transform).toBe('translateY(0px)');
    expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
      'normal',
    );
  });

  it('rests at translateY(0px) after a full loading -> success -> normal cycle', async () => {
    vi.useFakeTimers();
    try {
      const { view, onRefresh } = renderPullRefresh({
        threshold: 50,
        successDuration: 200,
      });
      const root = rootEl(view);
      fireEvent.touchStart(root, touch(0, 0));
      fireEvent.touchMove(root, touch(0, 200));
      fireEvent.touchEnd(root);

      await vi.waitFor(() => expect(onRefresh).toHaveBeenCalled());
      await vi.waitFor(() =>
        expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
          'success',
        ),
      );
      // Held at threshold during success hold.
      expect(root.style.transform).not.toBe('translateY(0px)');

      // Run the successDuration schedule to transition success -> normal.
      vi.advanceTimersByTime(300);
      await vi.waitFor(() =>
        expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
          'normal',
        ),
      );

      // After success -> normal the body MUST rebound to 0px. The OA-18 defect
      // leaves the stale pull distance (and even jumps further down here).
      expect(root.style.transform).toBe('translateY(0px)');
    } finally {
      vi.useRealTimers();
    }
  });

  it('rests at translateY(0px) after onRefresh rejects', async () => {
    const onRefreshImpl = async () => {
      throw new Error('network');
    };
    const { view } = renderPullRefresh({ threshold: 60, onRefresh: onRefreshImpl });
    const root = rootEl(view);
    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 200));
    fireEvent.touchEnd(root);

    await waitFor(() =>
      expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
        'loading',
      ),
    );
    await waitFor(() =>
      expect(view.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe(
        'normal',
      ),
    );
    // Reject path MUST rebound to 0px (no stale pull distance, no spinner lock).
    expect(root.style.transform).toBe('translateY(0px)');
  });

  it('indicator height is 0 at rest after a below-threshold release (no empty gap)', () => {
    const { view } = renderPullRefresh({ threshold: 80 });
    const root = rootEl(view);
    const indicator = view.container.querySelector(
      '[data-slot="pull-refresh-indicator"]',
    ) as HTMLElement;

    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 30));
    expect(indicator.style.height).not.toBe('0px');

    fireEvent.touchEnd(root);
    // At rest the indicator collapses to height 0 (the OA-18 stale-translate
    // defect also popped an empty indicator gap because trackTranslate stayed
    // non-zero).
    expect(indicator.style.height).toBe('0px');
  });
});
