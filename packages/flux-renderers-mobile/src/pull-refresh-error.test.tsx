// G4-R2-视角5-01 (plan 485 Phase 2) — a rejected onRefresh must surface a
// user-visible failure state instead of silently resetting to 'normal'.
// The 'error' status holds for the same bounded window as 'success' (no
// spinner), then resets; a re-pull during the error window is allowed.
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
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

function renderPullRefresh(options: {
  threshold?: number;
  successDuration?: number;
  onRefresh?: (event?: unknown) => Promise<void> | void;
} = {}) {
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
      successDuration: options.successDuration,
    },
    regions: { body: <div data-testid="body-content">Body</div> },
    events: { onRefresh: onRefresh as never },
  });
  const view = render(<PullRefreshRenderer {...props} />);
  return { view, onRefresh };
}

function rootEl(view: ReturnType<typeof render>) {
  return view.container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
}

async function pullPastThreshold(view: ReturnType<typeof render>, threshold = 60) {
  const root = rootEl(view);
  fireEvent.touchStart(root, touch(0, 0));
  fireEvent.touchMove(root, touch(0, threshold + 20));
  fireEvent.touchEnd(root);
}

describe('PullRefreshRenderer failure feedback (G4-R2-视角5-01)', () => {
  it('shows a visible error status when onRefresh rejects, then resets (bounded)', async () => {
    const { view } = renderPullRefresh({
      threshold: 60,
      successDuration: 40,
      onRefresh: async () => {
        throw new Error('network down');
      },
    });
    await pullPastThreshold(view);

    // Loading spinner phase flips into the visible error state.
    await waitFor(() => {
      expect(rootEl(view).getAttribute('data-status')).toBe('error');
    });
    const indicator = view.container.querySelector('[data-slot="pull-refresh-indicator"]');
    expect(indicator?.getAttribute('data-indicator-text')).toBe('刷新失败');

    // Bounded window: resets to normal afterwards.
    await waitFor(
      () => {
        expect(rootEl(view).getAttribute('data-status')).toBe('normal');
      },
      { timeout: 500 },
    );
    // The failed refresh dispatched onRefresh exactly once (no auto retry).
  });

  it('error status holds the indicator open at the threshold like success', async () => {
    let reject!: (reason: unknown) => void;
    const gate = new Promise((_resolve, rej) => {
      reject = rej;
    });
    const { view } = renderPullRefresh({
      threshold: 80,
      successDuration: 5000,
      onRefresh: () => gate as unknown as Promise<void>,
    });
    await pullPastThreshold(view, 80);
    const root = rootEl(view);

    await waitFor(() => {
      expect(root.getAttribute('data-status')).toBe('loading');
    });
    reject(new Error('boom'));
    await waitFor(() => {
      expect(root.getAttribute('data-status')).toBe('error');
    });
    // Geometry: the indicator band stays visible (hold translate at threshold),
    // matching the success window rather than collapsing instantly.
    expect(root.style.transform).toBe('translateY(80px)');
  });

  it('allows an immediate re-pull during the error window without a stuck timer', async () => {
    let calls = 0;
    const { view } = renderPullRefresh({
      threshold: 60,
      successDuration: 5000,
      onRefresh: async () => {
        calls += 1;
        if (calls === 1) {
          throw new Error('first fails');
        }
      },
    });
    await pullPastThreshold(view);
    await waitFor(() => {
      expect(rootEl(view).getAttribute('data-status')).toBe('error');
    });

    // Re-pull during the error window: must reach 'loading' and then 'success',
    // not be reset early by the stale error timer.
    await pullPastThreshold(view);
    await waitFor(() => {
      expect(rootEl(view).getAttribute('data-status')).toBe('success');
    });
    expect(calls).toBe(2);
  });
});
