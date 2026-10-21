import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SwipeCellSchema } from './schemas.js';
import { SwipeCellRenderer } from './swipe-cell.js';
import { createMockRendererProps } from './test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function touch(x: number, y: number, time?: number) {
  return {
    touches: [{ clientX: x, clientY: y } as Touch],
    ...(time === undefined ? {} : { timeStamp: time }),
  } as unknown as React.TouchEvent;
}

// fireEvent cannot inject `timeStamp` (read-only, set by the UA at
// construction), so velocity-driven tests dispatch a native TouchEvent and
// pin the timestamp on the instance. Times must be non-zero: React falls
// back to performance.now() for a native timeStamp of 0, which would invert
// the dt against the following move.
function fireTouch(
  target: HTMLElement,
  type: 'touchstart' | 'touchmove',
  x: number,
  y: number,
  time: number,
) {
  const event = new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches: [{ clientX: x, clientY: y } as unknown as Touch],
  } as TouchEventInit);
  Object.defineProperty(event, 'timeStamp', { value: time, configurable: true });
  // act(): raw dispatchEvent must flush React state synchronously so the
  // next handler in the gesture sequence sees committed deltas.
  act(() => {
    target.dispatchEvent(event);
  });
}

function renderSwipeCell(
  options: {
    threshold?: number;
    direction?: 'left' | 'right' | 'both';
    disabled?: boolean;
    closeOnOutside?: boolean;
    onOpen?: (event?: unknown) => void;
    onClose?: (event?: unknown) => void;
    onAction?: (event?: unknown) => void;
    body?: React.ReactNode;
    left?: React.ReactNode;
    right?: React.ReactNode;
    strictMode?: boolean;
  } = {},
) {
  const onOpen = vi.fn<(event?: unknown) => void>(options.onOpen ?? (() => undefined));
  const onClose = vi.fn<(event?: unknown) => void>(options.onClose ?? (() => undefined));
  const onAction = vi.fn<(event?: unknown) => void>(options.onAction ?? (() => undefined));
  const props = createMockRendererProps<SwipeCellSchema>({
    schema: { type: 'swipe-cell' },
    props: {
      threshold: options.threshold,
      direction: options.direction,
      disabled: options.disabled,
      closeOnOutside: options.closeOnOutside,
    },
    regions: {
      body: options.body ?? <div data-testid="body-content">Body</div>,
      left: options.left ?? (
        <button type="button" data-testid="left-action">
          Archive
        </button>
      ),
      right: options.right ?? (
        <button type="button" data-testid="right-action">
          Delete
        </button>
      ),
    },
    events: {
      onOpen: onOpen as never,
      onClose: onClose as never,
      onAction: onAction as never,
    },
  });
  const tree = options.strictMode ? (
    <React.StrictMode>
      <SwipeCellRenderer {...props} />
    </React.StrictMode>
  ) : (
    <SwipeCellRenderer {...props} />
  );
  const view = render(tree);
  return { view, onOpen, onClose, onAction, props };
}

describe('SwipeCellRenderer M6 gesture upgrades (plan 664 Phase 5)', () => {
  it('opens on a fast flick below the static threshold (old implementation stayed closed)', async () => {
    const { view } = renderSwipeCell({ threshold: 30 });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    // 15px over 30ms = 0.5 px/ms flick; pre-M6 release logic required 30px.
    // (Times must be non-zero: React falls back to performance.now() for a
    // native timeStamp of 0, which would invert the dt against the move.)
    fireTouch(root, 'touchstart', 50, 50, 1000);
    fireTouch(root, 'touchmove', 65, 50, 1030);
    fireEvent.touchEnd(root);
    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-left',
      ),
    );
  });

  it('CHANGE ①: flick toward the opening side below threshold keeps the cell open (old rebounded closed)', async () => {
    const { view } = renderSwipeCell({ threshold: 30 });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireTouch(root, 'touchstart', 50, 50, 0);
    fireTouch(root, 'touchmove', 120, 50, 60);
    fireEvent.touchEnd(root);
    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-left',
      ),
    );

    // 20px opening nudge at 0.75 px/ms: old logic closed the cell.
    fireTouch(root, 'touchstart', 120, 50, 1000);
    fireTouch(root, 'touchmove', 140, 50, 1026.7);
    fireEvent.touchEnd(root);
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'open-left',
    );
  });

  it('CHANGE ②: a cross closing swipe past threshold closes instead of flipping sides (old flipped to open-right)', async () => {
    const { view, onOpen } = renderSwipeCell({ threshold: 30 });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireTouch(root, 'touchstart', 50, 50, 0);
    fireTouch(root, 'touchmove', 120, 50, 60);
    fireEvent.touchEnd(root);
    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-left',
      ),
    );

    // leftward 40px while open-left: old implementation opened open-right.
    fireTouch(root, 'touchstart', 120, 50, 1000);
    fireTouch(root, 'touchmove', 80, 50, 1060);
    fireEvent.touchEnd(root);
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('CHANGE ③: a quick closing flick below threshold closes (old stayed open)', async () => {
    const { view } = renderSwipeCell({ threshold: 30 });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireTouch(root, 'touchstart', 50, 50, 0);
    fireTouch(root, 'touchmove', 120, 50, 60);
    fireEvent.touchEnd(root);
    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-left',
      ),
    );

    // leftward 20px at 0.6 px/ms while open-left.
    fireTouch(root, 'touchstart', 120, 50, 1000);
    fireTouch(root, 'touchmove', 100, 50, 1033.3);
    fireEvent.touchEnd(root);
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );
  });

  // happy-dom ships a no-op ResizeObserver; this controllable stub lets a
  // test seed measured region widths. vi.stubGlobal keeps the mutation inside
  // vitest's leak-safe stub registry (raw globalThis.ResizeObserver
  // assignment trips find-test-global-leaks).
  function installRegionWidthStub() {
    type ROEntry = { target: Element; contentRect: { width: number } };
    const observers: Array<{ cb: (e: ROEntry[]) => void; targets: Set<Element> }> = [];
    class MockResizeObserver {
      cb: (entries: ROEntry[]) => void;
      targets = new Set<Element>();
      constructor(cb: (entries: ROEntry[]) => void) {
        this.cb = cb;
        observers.push(this);
      }
      observe(target: Element) {
        this.targets.add(target);
      }
      unobserve(target: Element) {
        this.targets.delete(target);
      }
      disconnect() {
        this.targets.clear();
      }
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    return (target: Element, width: number) => {
      for (const obs of observers) {
        if (obs.targets.has(target)) obs.cb([{ target, contentRect: { width } }]);
      }
    };
  }

  it('overswipe past 1.15× region width triggers the first action then closes', async () => {
    const seedRegionWidth = installRegionWidthStub();
    try {
      const onAction = vi.fn(() => undefined);
      const { view, onAction: onActionMock } = renderSwipeCell({
        threshold: 30,
        onAction,
      });
      const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
      const leftWrapper = view.container.querySelector(
        '[data-slot="swipe-cell-left"]',
      ) as HTMLElement;
      seedRegionWidth(leftWrapper, 120);

      // rightward travel 150px >= 1.15×120 = 138 -> overswipe action.
      // A slow 150px drag also clears the static threshold; the
      // discriminative part is the DISPATCH (old logic only opened).
      fireTouch(root, 'touchstart', 50, 50, 1000);
      fireTouch(root, 'touchmove', 200, 50, 1600);
      fireEvent.touchEnd(root);

      await waitFor(() => expect(onActionMock).toHaveBeenCalledTimes(1));
      expect(onActionMock.mock.calls[0][0]).toEqual({ type: 'action', side: 'open-left' });
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'closed',
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('a drag longer than 6px does not synthesize a ghost click on the content (M6a suppression)', async () => {
    const onBodyClick = vi.fn();
    const { view } = renderSwipeCell({
      threshold: 30,
      body: <button type="button" data-testid="body-btn" onClick={onBodyClick}>Go</button>,
    });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    const bodyBtn = view.container.querySelector('[data-testid="body-btn"]') as HTMLElement;

    // drag across the body content (>6px) ending on the button, then the
    // browser-synthesized trusted click must be swallowed
    fireEvent.touchStart(root, touch(50, 50, 0));
    fireEvent.touchMove(root, touch(120, 50, 60));
    fireEvent.touchEnd(root);
    const trustedClick = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(trustedClick, 'isTrusted', { value: true });
    bodyBtn.dispatchEvent(trustedClick);
    expect(onBodyClick).not.toHaveBeenCalled();

    // a fresh tap (new touch sequence) clicks normally
    fireEvent.touchStart(bodyBtn, touch(10, 10));
    fireEvent.touchEnd(bodyBtn);
    fireEvent.click(bodyBtn);
    expect(onBodyClick).toHaveBeenCalledTimes(1);
  });
});

describe('SwipeCellRenderer M6 overswipe degradation', () => {
  it('a region without interactive controls degrades overswipe to plain open (no onAction)', async () => {
    type ROEntry = { target: Element; contentRect: { width: number } };
    const observers: Array<{ cb: (e: ROEntry[]) => void; targets: Set<Element> }> = [];
    class MockResizeObserver {
      cb: (entries: ROEntry[]) => void;
      targets = new Set<Element>();
      constructor(cb: (entries: ROEntry[]) => void) {
        this.cb = cb;
        observers.push(this);
      }
      observe(target: Element) {
        this.targets.add(target);
      }
      unobserve(target: Element) {
        this.targets.delete(target);
      }
      disconnect() {
        this.targets.clear();
      }
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    try {
      const onAction = vi.fn(() => undefined);
      const { view, onAction: onActionMock } = renderSwipeCell({
        threshold: 30,
        onAction,
        left: <div data-testid="plain-left-region">no control</div>,
      });
      const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
      const leftWrapper = view.container.querySelector(
        '[data-slot="swipe-cell-left"]',
      ) as HTMLElement;
      for (const obs of observers) {
        if (obs.targets.has(leftWrapper)) obs.cb([{ target: leftWrapper, contentRect: { width: 120 } }]);
      }

      // 150px >= 1.15×120: overswipe fires, but the region has no
      // button/a/[role]/input/select/textarea — degrade to plain open.
      fireTouch(root, 'touchstart', 50, 50, 1000);
      fireTouch(root, 'touchmove', 200, 50, 1600);
      fireEvent.touchEnd(root);

      await waitFor(() =>
        expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
          'open-left',
        ),
      );
      expect(onActionMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
