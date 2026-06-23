// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SwipeCellSchema } from './schemas.js';
import { SwipeCellRenderer } from './swipe-cell.js';
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

describe('SwipeCellRenderer', () => {
  it('renders body and both action regions; defaults to closed state', () => {
    const { view } = renderSwipeCell();
    expect(screen.getByTestId('body-content')).toBeTruthy();
    expect(view.container.querySelector('[data-slot="swipe-cell-left"]')).toBeTruthy();
    expect(view.container.querySelector('[data-slot="swipe-cell-right"]')).toBeTruthy();
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );
  });

  it('opens left region on rightward swipe past threshold and fires onOpen', async () => {
    const { view, onOpen } = renderSwipeCell({ threshold: 30 });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(50, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);

    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-left',
      ),
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('opens right region on leftward swipe past threshold', async () => {
    const { view } = renderSwipeCell({ threshold: 30 });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(120, 50));
    fireEvent.touchMove(root, touch(40, 50));
    fireEvent.touchEnd(root);

    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-right',
      ),
    );
  });

  it('does not open when swipe distance is below threshold', () => {
    const { view } = renderSwipeCell({ threshold: 50 });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(50, 50));
    fireEvent.touchMove(root, touch(70, 50));
    fireEvent.touchEnd(root);
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );
  });

  it('direction:"left" allows leftward swipe but ignores rightward swipe', () => {
    const { view } = renderSwipeCell({ threshold: 30, direction: 'left' });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    // Rightward swipe should NOT open (direction 'left' means left-swipe exposes right region)
    fireEvent.touchStart(root, touch(50, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );

    // Leftward swipe should open
    fireEvent.touchStart(root, touch(120, 50));
    fireEvent.touchMove(root, touch(40, 50));
    fireEvent.touchEnd(root);
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'open-right',
    );
  });

  it('direction:"right" allows rightward swipe but ignores leftward swipe', () => {
    const { view } = renderSwipeCell({ threshold: 30, direction: 'right' });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(120, 50));
    fireEvent.touchMove(root, touch(40, 50));
    fireEvent.touchEnd(root);
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );

    fireEvent.touchStart(root, touch(40, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'open-left',
    );
  });

  it('closeOnOutside:true closes open cell when pointer down outside', async () => {
    const { view, onClose } = renderSwipeCell({ threshold: 30, closeOnOutside: true });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(40, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);

    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-left',
      ),
    );

    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true }),
    );
    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'closed',
      ),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('closeOnOutside:false does not auto-close on outside pointer', async () => {
    const { view, onClose } = renderSwipeCell({ threshold: 30, closeOnOutside: false });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(40, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);

    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-left',
      ),
    );

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'open-left',
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not respond to touch when disabled', () => {
    const { view } = renderSwipeCell({ threshold: 30, disabled: true });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(40, 50));
    fireEvent.touchMove(root, touch(150, 50));
    fireEvent.touchEnd(root);
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );
  });

  it('renders body only when left and right regions are absent', () => {
    const props = createMockRendererProps<SwipeCellSchema>({
      schema: { type: 'swipe-cell' },
      props: {},
      regions: { body: <div data-testid="body-only">BodyOnly</div> },
    });
    const view = render(<SwipeCellRenderer {...props} />);
    expect(screen.getByTestId('body-only')).toBeTruthy();
    expect(view.container.querySelector('[data-slot="swipe-cell-left"]')).toBeNull();
    expect(view.container.querySelector('[data-slot="swipe-cell-right"]')).toBeNull();
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );
  });

  it('horizontal swipe beats tiny vertical drift (no open on vertical)', () => {
    const { view } = renderSwipeCell({ threshold: 30 });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(50, 50));
    fireEvent.touchMove(root, touch(55, 90));
    fireEvent.touchEnd(root);
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );
  });

  it('dispatches onOpen exactly once under React StrictMode (MA-02)', async () => {
    const onOpen = vi.fn(() => undefined);
    const { view } = renderSwipeCell({ threshold: 30, onOpen, strictMode: true });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(50, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);

    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-left',
      ),
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('does not commit on touchCancel and leaves the cell closed (OA-05)', () => {
    const { view, onOpen } = renderSwipeCell({ threshold: 30 });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(50, 50));
    fireEvent.touchMove(root, touch(120, 50));
    // System cancel instead of a user lift — must not open or dispatch.
    fireEvent.touchCancel(root);

    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('touchCancel on an already-open cell does not close it spuriously (OA-05)', async () => {
    const { view, onClose } = renderSwipeCell({ threshold: 30 });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(50, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);
    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-left',
      ),
    );

    // A subsequent system cancel must not generate a spurious close dispatch.
    fireEvent.touchCancel(root);
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'open-left',
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('dispatches onOpen with a structured {type:"open",side} payload (MA-04)', async () => {
    const onOpen = vi.fn<(event?: unknown) => void>(() => undefined);
    const { view } = renderSwipeCell({ threshold: 30, onOpen });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(50, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);
    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-left',
      ),
    );
    expect(onOpen.mock.calls[0][0]).toEqual({ type: 'open', side: 'open-left' });
  });

  it('dispatches onClose with a structured {type:"close",side} payload (MA-04)', async () => {
    const onClose = vi.fn<(event?: unknown) => void>(() => undefined);
    const { view } = renderSwipeCell({ threshold: 30, onClose, closeOnOutside: true });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    // open-left first
    fireEvent.touchStart(root, touch(50, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);
    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-left',
      ),
    );
    // outside pointer down closes the open-left cell deterministically
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'closed',
      ),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose.mock.calls[0][0]).toEqual({ type: 'close', side: 'open-left' });
  });

  it('dispatches onAction and closes when the left action area is clicked (MA-09/OA-02)', async () => {
    const onAction = vi.fn(() => undefined);
    const { view, onAction: onActionMock } = renderSwipeCell({ threshold: 30, onAction });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    // open-left reveals the left action region
    fireEvent.touchStart(root, touch(50, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);
    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-left',
      ),
    );
    const leftAction = view.container.querySelector(
      '[data-testid="left-action"]',
    ) as HTMLButtonElement;
    fireEvent.click(leftAction);
    expect(onActionMock).toHaveBeenCalledTimes(1);
    expect(onActionMock.mock.calls[0][0]).toEqual({ type: 'action', side: 'open-left' });
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );
  });

  it('dispatches onAction with the right side when the right action area is clicked (MA-09/OA-02)', async () => {
    const onAction = vi.fn(() => undefined);
    const { view, onAction: onActionMock } = renderSwipeCell({ threshold: 30, onAction });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    // open-right reveals the right action region (leftward swipe)
    fireEvent.touchStart(root, touch(120, 50));
    fireEvent.touchMove(root, touch(40, 50));
    fireEvent.touchEnd(root);
    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-right',
      ),
    );
    const rightAction = view.container.querySelector(
      '[data-testid="right-action"]',
    ) as HTMLButtonElement;
    fireEvent.click(rightAction);
    expect(onActionMock).toHaveBeenCalledTimes(1);
    expect(onActionMock.mock.calls[0][0]).toEqual({ type: 'action', side: 'open-right' });
    expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'closed',
    );
  });

  it('hides off-screen action regions from AT/focus when closed via inert (OA-08)', () => {
    const { view } = renderSwipeCell();
    const left = view.container.querySelector(
      '[data-slot="swipe-cell-left"]',
    ) as HTMLElement;
    const right = view.container.querySelector(
      '[data-slot="swipe-cell-right"]',
    ) as HTMLElement;
    // Both action regions are visually clipped AND must be removed from the
    // tab order / accessibility tree. `overflow:hidden` alone only clips
    // painting; `inert` is what keeps screen readers and Tab away from the
    // off-screen Delete button.
    expect(left.hasAttribute('inert')).toBe(true);
    expect(right.hasAttribute('inert')).toBe(true);
  });

  it('clears inert on the revealed side and keeps the hidden side inert when open (OA-08)', async () => {
    const { view } = renderSwipeCell({ threshold: 30 });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    fireEvent.touchStart(root, touch(50, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);
    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-left',
      ),
    );
    const left = view.container.querySelector(
      '[data-slot="swipe-cell-left"]',
    ) as HTMLElement;
    const right = view.container.querySelector(
      '[data-slot="swipe-cell-right"]',
    ) as HTMLElement;
    expect(left.hasAttribute('inert')).toBe(false);
    expect(right.hasAttribute('inert')).toBe(true);
  });

  it('re-measures region width when action region content changes (OA-12)', async () => {
    // happy-dom ships a no-op ResizeObserver stub, so install a controllable
    // mock that records (callback, target) pairs and lets the test fire the
    // callback bound to a specific observed target. This proves the renderer
    // re-measures via ResizeObserver (not a one-shot useLayoutEffect) when the
    // off-screen action region content changes size.
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
    const NativeRO = globalThis.ResizeObserver;
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    function fireForTarget(target: Element, width: number) {
      for (const obs of observers) {
        if (obs.targets.has(target)) {
          obs.cb([{ target, contentRect: { width } }]);
        }
      }
    }

    try {
      const { view } = renderSwipeCell({ threshold: 30, direction: 'both' });
      const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
      const leftWrapper = view.container.querySelector(
        '[data-slot="swipe-cell-left"]',
      ) as HTMLElement;

      // Seed the initial narrow width and open-left.
      fireForTarget(leftWrapper, 80);
      fireEvent.touchStart(root, touch(50, 50));
      fireEvent.touchMove(root, touch(120, 50));
      fireEvent.touchEnd(root);
      await waitFor(() =>
        expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
          'open-left',
        ),
      );
      const content = view.container.querySelector(
        '[data-slot="swipe-cell-content"]',
      ) as HTMLElement;
      const narrowPx = parseFloat(content.style.transform.match(/-?\d+\.?\d*/)?.[0] ?? '0');
      expect(narrowPx).toBe(80);

      // Simulate the action region content growing (locale switch, async
      // icon, condition change). The ResizeObserver must re-measure and the
      // committed open-left offset must grow accordingly.
      fireForTarget(leftWrapper, 220);

      await waitFor(() => {
        const widePx = parseFloat(content.style.transform.match(/-?\d+\.?\d*/)?.[0] ?? '0');
        expect(widePx).toBe(220);
      });
    } finally {
      globalThis.ResizeObserver = NativeRO;
    }
  });

  it('declares pan-y touch-action on the root (MA-07)', () => {
    const { view } = renderSwipeCell();
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    // pan-y reserves the HORIZONTAL axis for the element's JS (touch-action
    // names the axis the browser may pan); swipe-cell owns the horizontal swipe
    // while the browser keeps vertical page scroll.
    expect(getComputedStyle(root).touchAction).toBe('pan-y');
  });

  it('suppresses text selection on the content pane while a side is open (MA-24)', async () => {
    const { view } = renderSwipeCell({ threshold: 30 });
    const root = view.container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;
    const content = view.container.querySelector(
      '[data-slot="swipe-cell-content"]',
    ) as HTMLElement;
    // closed initially -> no select-none
    expect(content.classList.contains('select-none')).toBe(false);
    fireEvent.touchStart(root, touch(50, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);
    await waitFor(() =>
      expect(view.container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
        'open-left',
      ),
    );
    expect(content.classList.contains('select-none')).toBe(true);
    expect(getComputedStyle(content).userSelect).toBe('none');
  });
});
