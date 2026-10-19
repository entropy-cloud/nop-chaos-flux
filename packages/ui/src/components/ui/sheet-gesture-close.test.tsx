import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sheet, SheetContent } from './sheet.js';
import {
  shouldCloseOnRelease,
  shouldCloseOnRelease as shouldCloseOnReleaseDirect,
} from './sheet-gesture-close.js';

afterEach(() => {
  cleanup();
});

function touch(x: number, y: number, time?: number) {
  return {
    touches: x == null ? [] : [{ clientX: x, clientY: y } as Touch],
    changedTouches: x == null ? [] : [{ clientX: x, clientY: y } as Touch],
    ...(time === undefined ? {} : { timeStamp: time }),
  } as unknown as TouchEvent;
}

describe('shouldCloseOnRelease (plan 666 Phase 3 truth table)', () => {
  it('fast + short pull closes (t<300 && d>20)', () => {
    expect(shouldCloseOnRelease({ durationMs: 120, distancePx: 60, panelHeight: 400 })).toBe(true);
  });

  it('slow + half-height pull closes (d > h/2)', () => {
    expect(shouldCloseOnRelease({ durationMs: 800, distancePx: 210, panelHeight: 400 })).toBe(true);
  });

  it('slow + short pull does not close', () => {
    expect(shouldCloseOnRelease({ durationMs: 800, distancePx: 60, panelHeight: 400 })).toBe(false);
  });

  it('upward pull never closes even when fast and long', () => {
    expect(
      shouldCloseOnRelease({ durationMs: 120, distancePx: -300, panelHeight: 400 }),
    ).toBe(false);
  });

  it('matches the standalone module export', () => {
    expect(shouldCloseOnRelease).toBe(shouldCloseOnReleaseDirect);
  });
});

describe('Sheet gestureClose (plan 666 Phase 3)', () => {
  function renderSheet(props: { gestureClose?: boolean; onGestureClose?: () => void }) {
    const onGestureClose = vi.fn(props.onGestureClose);
    const view = render(
      <Sheet open gestureClose={props.gestureClose} onGestureClose={onGestureClose}>
        <SheetContent side="bottom" aria-label="Bottom sheet">
          <div>Sheet body</div>
        </SheetContent>
      </Sheet>,
    );
    const panel = () => document.querySelector('[data-slot="sheet-content"]') as HTMLElement;
    return { view, onGestureClose, panel };
  }

  function drag(panel: HTMLElement, fromY: number, dy: number, times = 1) {
    fireEvent.touchStart(panel, touch(200, fromY));
    for (let i = 1; i <= times; i += 1) {
      fireEvent.touchMove(panel, touch(200, fromY + (dy * i) / times));
    }
    fireEvent.touchEnd(panel, touch(200, fromY + dy));
  }

  it('a fling pull invokes the close callback', async () => {
    const { onGestureClose, panel } = renderSheet({ gestureClose: true });
    drag(panel(), 300, 120);
    await waitFor(() => expect(onGestureClose).toHaveBeenCalledTimes(1));
  });

  it('a slow short pull springs back without closing', async () => {
    const { onGestureClose, panel } = renderSheet({ gestureClose: true });
    drag(panel(), 300, 10, 4);
    expect(onGestureClose).not.toHaveBeenCalled();
    // spring back: the drag transform is cleared
    await waitFor(() => expect(panel().style.transform).toBe(''));
  });

  it('default-off: dragging without gestureClose produces no transform and no close (discriminative)', () => {
    const { onGestureClose, panel } = renderSheet({});
    drag(panel(), 300, 200, 4);
    expect(onGestureClose).not.toHaveBeenCalled();
    expect(panel().style.transform).toBe('');
  });
});
