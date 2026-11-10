import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { WheelPickerOption } from './schemas.js';
import { wheelTimeColumns, encodeTime } from './wheel-date-columns.js';
import { WheelTimePickerRenderer } from './wheel-time-picker.js';
import { createMockRendererProps } from './test-support.js';
import { TestRuntimeProvider, createTestRuntime } from '@nop-chaos/flux-react/test-support';
import { DEFAULT_ROW_HEIGHT, offsetForIndex } from './wheel-column-logic.js';

// Plan 863 T8: gesture events carry a PINNED synthetic timeStamp (zero
// velocity → deterministic static snap) and the post-drag wait is the strip
// transform reaching the target offset — unpinned wall-clock timestamps made
// the landing inertia-sensitive under full-suite load.
function dispatchPinnedTouch(
  strip: HTMLElement,
  type: 'touchstart' | 'touchmove' | 'touchend',
  clientY: number,
) {
  const event = new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches: type === 'touchend' ? [] : [{ clientX: 100, clientY } as unknown as Touch],
    changedTouches: [{ clientX: 100, clientY } as unknown as Touch],
  } as TouchEventInit);
  Object.defineProperty(event, 'timeStamp', { value: 1_000, configurable: true });
  act(() => {
    strip.dispatchEvent(event);
  });
}

// P1-MA4.3-002 regression guard: the wheel-time-picker component-level
// contract — minuteStep actually drives the minute column grid, and the
// confirm chain emits the HH:mm value. Before this test the only coverage
// was name-list-level hits in markers/definitions gates (audit Round B
// B-01).

async function dragStrip(container: HTMLElement, column: number, deltaY: number) {
  const strip = container.querySelector(
    `[data-column="${column}"] [data-slot="picker-view-strip"]`,
  ) as HTMLElement;
  const centerY = 200;
  const columnEl = strip.closest('[data-column]') as HTMLElement;
  const startIndex = Number(
    columnEl.querySelector('[data-active="true"]')?.getAttribute('data-index') ?? '0',
  );
  dispatchPinnedTouch(strip, 'touchstart', centerY);
  dispatchPinnedTouch(strip, 'touchmove', centerY + deltaY);
  dispatchPinnedTouch(strip, 'touchend', centerY + deltaY);
  const targetIndex = startIndex + Math.round(-deltaY / DEFAULT_ROW_HEIGHT);
  await waitFor(() =>
    expect(strip.style.transform).toBe(`translateY(${offsetForIndex(targetIndex, DEFAULT_ROW_HEIGHT)}px)`),
  );
}

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('wheel-time-picker component contract (P1-MA4.3-002)', () => {
  it('A: minuteStep drives the minute column grid (5 -> 12 entries step 5); default step is 1', async () => {
    const columns = wheelTimeColumns(5);
    expect(columns).toHaveLength(2);
    expect(columns[0]).toHaveLength(24);
    expect(columns[1]).toHaveLength(12);
    expect(columns[1]?.map((option: WheelPickerOption) => option.value)).toEqual([
      0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55,
    ]);
    // default step: full 60-minute grid
    expect(wheelTimeColumns(1)[1]).toHaveLength(60);

    // component wiring: minuteStep=5 renders the stepped minute column
    const onConfirm = vi.fn();
    const props = createMockRendererProps({
      schema: { type: 'wheel-time-picker' as const },
      props: { name: 'time', value: '08:30', minuteStep: 5 },
      meta: { testid: 'wtp' },
      events: { onConfirm: onConfirm as never },
    });
    const view = render(
    <TestRuntimeProvider runtime={createTestRuntime()}>
      <WheelTimePickerRenderer {...props} />
    </TestRuntimeProvider>,
  );
    fireEvent.click(view.getByTestId('wtp-trigger'));
    await waitFor(() =>
      expect(view.container.querySelector('[data-slot="wheel-picker-popup"]')).not.toBeNull(),
    );
    const minuteColumn = view.container.querySelector('[data-column="1"]');
    expect(minuteColumn?.querySelectorAll('[data-slot="picker-view-row"]').length ?? 0).toBe(12);
  });

  it('B: confirm chain emits the HH:mm value — 08:30 + one minute-column step lands 08:35', async () => {
    const onConfirm = vi.fn();
    const props = createMockRendererProps({
      schema: { type: 'wheel-time-picker' as const },
      props: { name: 'time', value: '08:30', minuteStep: 5 },
      meta: { testid: 'wtp' },
      events: { onConfirm: onConfirm as never },
    });
    const view = render(
    <TestRuntimeProvider runtime={createTestRuntime()}>
      <WheelTimePickerRenderer {...props} />
    </TestRuntimeProvider>,
  );
    fireEvent.click(view.getByTestId('wtp-trigger'));
    await waitFor(() =>
      expect(view.container.querySelector('[data-slot="wheel-picker-popup"]')).not.toBeNull(),
    );

    // one row up on the minute column: 30 -> 35 (step 5 grid)
    await dragStrip(view.container, 1, -44);
    await waitFor(() =>
      expect(
        view.container.querySelector('[data-column="1"] [data-active="true"]')?.getAttribute('data-index'),
      ).toBe('7'),
    );

    fireEvent.click(view.container.querySelector('[data-slot="wheel-picker-confirm"]') as HTMLElement);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const payload = onConfirm.mock.calls[0][0] as { type: string; value: string };
    expect(payload.type).toBe('confirm');
    expect(payload.value).toBe('08:35');
    expect(encodeTime([8, 35])).toBe('08:35');
    expect(view.container.querySelector('[data-slot="wheel-picker-popup"]')).toBeNull();
  });
});
