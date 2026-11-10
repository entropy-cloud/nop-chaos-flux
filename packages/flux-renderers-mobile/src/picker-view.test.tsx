import { act, cleanup, render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PickerViewSchema, WheelPickerOption } from './schemas.js';
import { PickerViewRenderer } from './picker-view.js';
import { createMockRendererProps } from './test-support.js';
import { offsetForIndex } from './wheel-column-logic.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const COLUMN: WheelPickerOption[] = Array.from({ length: 10 }, (_, i) => ({
  label: `选项 ${i}`,
  value: i,
}));

// Native TouchEvent dispatch with pinned non-zero timestamps (React resets a
// 0 timeStamp to performance.now(), which would invert dt) — required for
// velocity-driven tests. act() flushes state between gesture steps.
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
  act(() => {
    target.dispatchEvent(event);
  });
}

function fireTouchEnd(target: HTMLElement, x: number, y: number, time: number) {
  const event = new TouchEvent('touchend', {
    bubbles: true,
    cancelable: true,
    touches: [],
    changedTouches: [{ clientX: x, clientY: y } as unknown as Touch],
  } as TouchEventInit);
  Object.defineProperty(event, 'timeStamp', { value: time, configurable: true });
  act(() => {
    target.dispatchEvent(event);
  });
}

function renderPickerView(
  options: {
    columns?: WheelPickerOption[][];
    value?: PickerViewSchema['value'];
    disabled?: boolean;
    strictMode?: boolean;
    onChange?: (event?: unknown) => void;
  } = {},
) {
  const onChange = vi.fn(options.onChange ?? (() => undefined));
  const props = createMockRendererProps<PickerViewSchema>({
    schema: { type: 'picker-view' },
    props: {
      columns: options.columns ?? [COLUMN],
      value: options.value,
      disabled: options.disabled,
    },
    events: { onChange: onChange as never },
  });
  const tree = options.strictMode ? (
    <React.StrictMode>
      <PickerViewRenderer {...props} />
    </React.StrictMode>
  ) : (
    <PickerViewRenderer {...props} />
  );
  const view = render(tree);
  const rerenderWith = (next: PickerViewSchema['value'], columns?: WheelPickerOption[][]) =>
    view.rerender(
      <PickerViewRenderer
        {...createMockRendererProps<PickerViewSchema>({
          schema: { type: 'picker-view' },
          props: { columns: columns ?? options.columns ?? [COLUMN], value: next, disabled: options.disabled },
          events: { onChange: onChange as never },
        })}
      />,
    );
  return { view, onChange, rerenderWith };
}

function rootOf(view: ReturnType<typeof render>) {
  return view.container.querySelector('[data-slot="picker-view"]') as HTMLElement;
}

function stripOf(view: ReturnType<typeof render>, column = 0) {
  return view.container.querySelector(
    `[data-column="${column}"] [data-slot="picker-view-strip"]`,
  ) as HTMLElement;
}

function activeRow(view: ReturnType<typeof render>, column = 0) {
  return view.container.querySelector(
    `[data-column="${column}"] [data-active="true"]`,
  ) as HTMLElement | null;
}

// Plan 863 T8: pinned same-timestamp dispatch → zero velocity → the static
// snap path is deterministic; wall-clock fireEvent timestamps made the
// landing inertia-sensitive under full-suite load.
function dragFrom(root: HTMLElement, fromY: number, deltaY: number) {
  const pinned = 1_000;
  fireTouch(root, 'touchstart', 100, fromY, pinned);
  if (deltaY !== 0) {
    fireTouch(root, 'touchmove', 100, fromY + deltaY, pinned);
  }
  fireTouchEnd(root, 100, fromY + deltaY, pinned);
}

describe('PickerViewRenderer (plan 665 Phase 1)', () => {
  it('renders columns and honors the controlled value positioning', () => {
    const { view } = renderPickerView({ value: [3] });
    expect(rootOf(view)).not.toBeNull();
    expect(stripOf(view).style.transform).toBe(`translateY(${offsetForIndex(3, 44)}px)`);
    expect(activeRow(view)?.getAttribute('data-index')).toBe('3');
  });

  it('clamps at the first row when dragged past the top boundary', async () => {
    const { view, onChange } = renderPickerView({ value: [3] });
    const root = rootOf(view);
    dragFrom(root, 200, 200); // finger down 200px → far below index 0 → clamps at 0
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(activeRow(view)?.getAttribute('data-index')).toBe('0');
    expect(stripOf(view).style.transform).toBe('translateY(0px)');
  });

  it('finger-up drag advances the index (0 → 2 rows down the list)', async () => {
    const { view, onChange } = renderPickerView({ value: [0] });
    const root = rootOf(view);
    dragFrom(root, 200, -88); // finger up → strip up → index increases by 2
    await waitFor(() =>
      expect(activeRow(view)?.getAttribute('data-index')).toBe('2'),
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    const payload = onChange.mock.calls[0][0] as { index: number; value: number; label: string };
    expect(payload.index).toBe(2);
    expect(payload.value).toBe(2);
    expect(payload.label).toBe('选项 2');
    expect(stripOf(view).style.transform).toBe(`translateY(${offsetForIndex(2, 44)}px)`);
  });

  it('dispatches exactly once under React StrictMode (MA-02 lineage)', async () => {
    const { view, onChange } = renderPickerView({ value: [0], strictMode: true });
    const root = rootOf(view);
    dragFrom(root, 200, -44);
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(activeRow(view)?.getAttribute('data-index')).toBe('1');
  });

  it('suppresses controlled writes during a drag and lands on the gesture row', async () => {
    const { view, onChange, rerenderWith } = renderPickerView({ value: [0] });
    const root = rootOf(view);
    void root;
    const pinned = 1_000; // plan 863 T8: zero-velocity static snap
    fireTouch(root, 'touchstart', 100, 200, pinned);
    fireTouch(root, 'touchmove', 100, 156, pinned); // 1 row up mid-drag
    // external controlled write mid-drag must not yank the wheel
    rerenderWith([8]);
    await act(async () => {
      await Promise.resolve();
    });
    fireTouchEnd(root, 100, 156, pinned);
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(activeRow(view)?.getAttribute('data-index')).toBe('1');
    // the landing wins over the mid-drag external write (value stays at the
    // gesture row: change payload carries index 1, not the written 8)
    const payload = onChange.mock.calls[0][0] as { index: number };
    expect(payload.index).toBe(1);
  });

  it('flings with inertia from a fast short drag (velocity path, old static-only logic cannot)', async () => {
    // manual rAF queue for deterministic animator frames
    let nextHandle = 0;
    const queue = new Map<number, FrameRequestCallback>();
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback): number => {
        const handle = ++nextHandle;
        queue.set(handle, cb);
        return handle;
      },
    );
    vi.stubGlobal('cancelAnimationFrame', (handle: number) => {
      queue.delete(handle);
    });

    const { view, onChange } = renderPickerView({ value: [4] });
    const root = rootOf(view);
    // fast downward flick: 60px over 120ms → v ≈ 0.5 px/ms → 4-3.79 → target 0
    fireTouch(root, 'touchstart', 100, 200, 1000);
    fireTouch(root, 'touchmove', 100, 230, 1040);
    fireTouch(root, 'touchmove', 100, 260, 1120);
    // touchend must carry the pinned timestamp too — fireEvent-built events
    // get the happy-dom construction time, which would blow the 300ms
    // inertia window (duration 931ms → static path).
    fireTouchEnd(root, 100, 260, 1120);

    // drain animator frames with increasing timestamps
    let now = 1120;
    for (let i = 0; i < 30 && (queue.size > 0 || onChange.mock.calls.length === 0); i += 1) {
      now += 40;
      for (const [handle, cb] of [...queue.entries()]) {
        if (!queue.has(handle)) continue;
        queue.delete(handle);
        cb(now);
      }
    }
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const payload = onChange.mock.calls[0][0] as { index: number };
    expect(payload.index).toBe(0);
    expect(activeRow(view)?.getAttribute('data-index')).toBe('0');
  });

  it('clamps the selection when the column shrinks below the current index', async () => {
    const { view, onChange, rerenderWith } = renderPickerView({ value: [8] });
    rerenderWith([8], [COLUMN.slice(0, 5)]);
    await waitFor(() => expect(activeRow(view)?.getAttribute('data-index')).toBe('4'));
    // the visual clamp is controlled-alignment only — change is dispatched by
    // gesture landings, never from a prop effect (MA-02 StrictMode lineage)
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders an empty wheel for empty columns without throwing', () => {
    const { view } = renderPickerView({ columns: [] });
    expect(rootOf(view)).not.toBeNull();
    expect(view.container.querySelector('[data-slot="picker-view-column"]')).toBeNull();
  });

  it('keeps columns independent in the multi-column layout', async () => {
    const second: WheelPickerOption[] = [
      { label: '甲', value: 'a' },
      { label: '乙', value: 'b' },
    ];
    const { view, onChange } = renderPickerView({ columns: [COLUMN, second] });
    const secondColumnStrip = stripOf(view, 1);
    const pinned = 1_000; // plan 863 T8: zero-velocity static snap
    fireTouch(secondColumnStrip, 'touchstart', 150, 200, pinned);
    fireTouch(secondColumnStrip, 'touchmove', 150, 156, pinned);
    fireTouchEnd(secondColumnStrip, 150, 156, pinned);
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const payload = onChange.mock.calls[0][0] as { column: number; value: unknown };
    expect(payload.column).toBe(1);
    expect(payload.value).toBe('b');
    // column 0 untouched
    expect(activeRow(view, 0)?.getAttribute('data-index')).toBe('0');
    expect(secondColumnStrip.style.transform).toBe(`translateY(${offsetForIndex(1, 44)}px)`);
  });

  it('does not respond to touch when disabled', () => {
    const { view, onChange } = renderPickerView({ value: [0], disabled: true });
    dragFrom(rootOf(view), 200, -88);
    expect(onChange).not.toHaveBeenCalled();
    expect(stripOf(view).style.transform).toBe(`translateY(${offsetForIndex(0, 44)}px)`);
  });
});

describe('PickerViewRenderer M7 audit remediation (plan 665 R1)', () => {
  function installRafStub() {
    let nextHandle = 0;
    const queue = new Map<number, FrameRequestCallback>();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
      const handle = ++nextHandle;
      queue.set(handle, cb);
      return handle;
    });
    vi.stubGlobal('cancelAnimationFrame', (handle: number) => {
      queue.delete(handle);
    });
    return {
      fireFrame(now: number) {
        const entries = [...queue.entries()];
        for (const [handle, cb] of entries) {
          if (!queue.has(handle)) continue;
          queue.delete(handle);
          cb(now);
        }
      },
    };
  }

  it('controlled write mid-settle-animation stops the momentum and aligns immediately (stopMomentum contract)', async () => {
    const raf = installRafStub();
    const onChange = vi.fn();
    const { view, rerenderWith } = renderPickerView({ value: [0] });
    const root = rootOf(view);

    // release BETWEEN rows (88px = 2 rows exactly → use 66px: 1.5 rows) so the
    // settle takes the MomentumAnimator path (raw offset ≠ target offset)
    fireTouch(root, 'touchstart', 100, 200, 1000);
    fireTouch(root, 'touchmove', 100, 134, 1100);
    fireTouchEnd(root, 100, 134, 1100);
    raf.fireFrame(1100); // animation frame 1: strip is mid-flight

    // external controlled write lands mid-animation → must interrupt + align
    rerenderWith([5]);
    await act(async () => {
      await Promise.resolve();
    });
    const strip = stripOf(view);
    expect(strip.style.transform).toBe(`translateY(${offsetForIndex(5, 44)}px)`);
    expect(activeRow(view)?.getAttribute('data-index')).toBe('5');

    // drained frames of the cancelled animation must not override the write
    const before = strip.style.transform;
    raf.fireFrame(5000);
    raf.fireFrame(6000);
    expect(strip.style.transform).toBe(before);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('over-drag past the top edge is resisted by the rubberband curve (visual only)', async () => {
    const { view } = renderPickerView({ value: [0] });
    const root = rootOf(view);
    // 200px finger travel beyond the top edge: raw offset would be +200;
    // rubberband(200, 44, 0.15) ≈ 24.16 — the strip must show the damped value
    fireTouch(root, 'touchstart', 100, 200, 1000);
    fireTouch(root, 'touchmove', 100, 400, 1100);
    const raw = 200;
    const damped = (raw * 44 * 0.15) / (44 + 0.15 * raw);
    expect(stripOf(view).style.transform).toBe(`translateY(${damped}px)`);
    expect(parseFloat(stripOf(view).style.transform.replace('translateY(', ''))).toBeLessThan(raw);
  });
});
