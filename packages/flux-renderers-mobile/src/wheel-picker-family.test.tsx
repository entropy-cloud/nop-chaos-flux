import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  WheelCascaderOption,
  WheelPickerOption,
} from './schemas.js';
import { WheelPickerRenderer } from './wheel-picker.js';
import { WheelDatePickerRenderer } from './wheel-date-picker.js';
import { WheelCascaderRenderer } from './wheel-cascader.js';
import { createMockRendererProps } from './test-support.js';
import { TestRuntimeProvider, createTestRuntime } from '@nop-chaos/flux-react/test-support';
import { DEFAULT_ROW_HEIGHT, offsetForIndex } from './wheel-column-logic.js';

// Plan 863 T8: gesture events are dispatched with a PINNED synthetic
// timeStamp (zero velocity → the static snap path is deterministic) and the
// post-drag wait is the strip transform reaching the target offset — not the
// mid-gesture `data-active` marker, which updates before settle commits the
// draft. Under full-suite load the unpinned wall-clock timestamps produced
// spurious inertia landings (plan 859 T8).
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const COLORS: WheelPickerOption[] = [
  { label: '红', value: 'red' },
  { label: '绿', value: 'green' },
  { label: '蓝', value: 'blue' },
];
const SIZES: WheelPickerOption[] = [
  { label: 'S', value: 's' },
  { label: 'M', value: 'm' },
];

const REGIONS: WheelCascaderOption[] = [
  {
    label: '江',
    value: 'j',
    children: [
      { label: '南京', value: 'nj' },
      { label: '苏州', value: 'sz' },
    ],
  },
  {
    label: '浙',
    value: 'z',
    children: [
      { label: '杭州', value: 'hz' },
      { label: '宁波', value: 'nb' },
    ],
  },
];

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
  // Deterministic settle condition: the strip transform lands on the target
  // offset (with a pinned timeStamp the settle path is synchronous, but the
  // wait keeps the assertion independent of timing).
  const targetIndex = startIndex + Math.round(-deltaY / DEFAULT_ROW_HEIGHT);
  await waitFor(() =>
    expect(strip.style.transform).toBe(`translateY(${offsetForIndex(targetIndex, DEFAULT_ROW_HEIGHT)}px)`),
  );
}

describe('WheelPickerRenderer (plan 665 Phase 2)', () => {
  it('shows the placeholder and opens the bottom-sheet popup with a scroll lock', async () => {
    const props = createMockRendererProps({
      schema: { type: 'wheel-picker' as const },
      props: { columns: [COLORS, SIZES], placeholder: '请选择' },
      meta: { testid: 'wp' },
      events: {},
    });
    const view = render(
    <TestRuntimeProvider runtime={createTestRuntime()}>
      <WheelPickerRenderer {...props} />
    </TestRuntimeProvider>,
  );
    expect(view.getByTestId('wp-trigger').textContent).toBe('请选择');
    fireEvent.click(view.getByTestId('wp-trigger'));
    await waitFor(() =>
      expect(view.container.querySelector('[data-slot="wheel-picker-popup"]')).not.toBeNull(),
    );
    expect(document.body.classList.contains('nop-scroll-lock')).toBe(true);
    await act(async () => {
      fireEvent.click(view.container.querySelector('[data-slot="wheel-picker-cancel"]') as HTMLElement);
    });
    expect(view.container.querySelector('[data-slot="wheel-picker-popup"]')).toBeNull();
    expect(document.body.classList.contains('nop-scroll-lock')).toBe(false);
  });

  it('shows the selected labels on the trigger', () => {
    const props = createMockRendererProps({
      schema: { type: 'wheel-picker' as const },
      props: { columns: [COLORS, SIZES], value: ['green', 'm'] },
      meta: { testid: 'wp' },
      events: {},
    });
    const view = render(
    <TestRuntimeProvider runtime={createTestRuntime()}>
      <WheelPickerRenderer {...props} />
    </TestRuntimeProvider>,
  );
    expect(view.getByTestId('wp-trigger').textContent).toBe('绿 M');
  });

  it('confirm dispatches the wheel landing and closes; cancel never confirms', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const props = createMockRendererProps({
      schema: { type: 'wheel-picker' as const },
      props: { columns: [COLORS, SIZES], value: ['red', 's'] },
      meta: { testid: 'wp' },
      events: { onConfirm: onConfirm as never, onCancel: onCancel as never },
    });
    const view = render(
    <TestRuntimeProvider runtime={createTestRuntime()}>
      <WheelPickerRenderer {...props} />
    </TestRuntimeProvider>,
  );
    fireEvent.click(view.getByTestId('wp-trigger'));
    await waitFor(() =>
      expect(view.container.querySelector('[data-slot="wheel-picker-popup"]')).not.toBeNull(),
    );

    // land column 0 on 绿 (one row up)
    await dragStrip(view.container, 0, -44);
    await waitFor(() =>
      expect(
        view.container.querySelector('[data-column="0"] [data-active="true"]')?.getAttribute('data-index'),
      ).toBe('1'),
    );

    fireEvent.click(view.container.querySelector('[data-slot="wheel-picker-confirm"]') as HTMLElement);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const payload = onConfirm.mock.calls[0][0] as { type: string; value: string[]; labels: string[] };
    expect(payload.type).toBe('confirm');
    expect(payload.value).toEqual(['green', 's']);
    expect(payload.labels).toEqual(['绿', 'S']);
    expect(view.container.querySelector('[data-slot="wheel-picker-popup"]')).toBeNull();

    // reopen + cancel: no confirm
    fireEvent.click(view.getByTestId('wp-trigger'));
    await waitFor(() =>
      expect(view.container.querySelector('[data-slot="wheel-picker-popup"]')).not.toBeNull(),
    );
    fireEvent.click(view.container.querySelector('[data-slot="wheel-picker-cancel"]') as HTMLElement);
    await waitFor(() =>
      expect(view.container.querySelector('[data-slot="wheel-picker-popup"]')).toBeNull(),
    );
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('confirm still dispatches without a form owner (capability-guarded write path)', async () => {
    const onConfirm = vi.fn();
    const props = createMockRendererProps({
      schema: { type: 'wheel-picker' as const },
      props: { name: 'color', columns: [COLORS], value: ['red'] },
      meta: { testid: 'wp' },
      events: { onConfirm: onConfirm as never },
    });
    const view = render(
    <TestRuntimeProvider runtime={createTestRuntime()}>
      <WheelPickerRenderer {...props} />
    </TestRuntimeProvider>,
  );
    // useCurrentForm is undefined outside a real form: the confirm path must
    // skip the write guarded by capability checks and still dispatch.
    fireEvent.click(view.container.querySelector('[data-slot="wheel-picker-trigger"]') as HTMLElement);
    await waitFor(() =>
      expect(view.container.querySelector('[data-slot="wheel-picker-popup"]')).not.toBeNull(),
    );
    fireEvent.click(view.container.querySelector('[data-slot="wheel-picker-confirm"]') as HTMLElement);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(view.container.querySelector('[data-slot="wheel-picker-popup"]')).toBeNull();
  });
});

describe('WheelDatePickerRenderer (plan 665 Phase 3)', () => {
  it('confirm dispatches the encoded YYYY-MM-DD value', async () => {
    const onConfirm = vi.fn();
    const props = createMockRendererProps({
      schema: { type: 'wheel-date-picker' as const },
      props: { value: '2026-03-15', min: '2026-01-01', max: '2026-12-31' },
      meta: { testid: 'wd' },
      events: { onConfirm: onConfirm as never },
    });
    const view = render(
    <TestRuntimeProvider runtime={createTestRuntime()}>
      <WheelDatePickerRenderer {...props} />
    </TestRuntimeProvider>,
  );
    expect(view.getByTestId('wd-trigger').textContent).toBe('2026-03-15');
    fireEvent.click(view.getByTestId('wd-trigger'));
    await waitFor(() =>
      expect(view.container.querySelector('[data-slot="wheel-picker-popup"]')).not.toBeNull(),
    );
    fireEvent.click(view.container.querySelector('[data-slot="wheel-picker-confirm"]') as HTMLElement);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const payload = onConfirm.mock.calls[0][0] as { type: string; value: string };
    expect(payload.value).toBe('2026-03-15');
  });

  it('clamps the draft into the min/max range on open', async () => {
    const onConfirm = vi.fn();
    const props = createMockRendererProps({
      schema: { type: 'wheel-date-picker' as const },
      props: { value: '2025-06-01', min: '2026-01-01', max: '2026-12-31' },
      meta: { testid: 'wd' },
      events: { onConfirm: onConfirm as never },
    });
    const view = render(
    <TestRuntimeProvider runtime={createTestRuntime()}>
      <WheelDatePickerRenderer {...props} />
    </TestRuntimeProvider>,
  );
    fireEvent.click(view.getByTestId('wd-trigger'));
    await waitFor(() =>
      expect(view.container.querySelector('[data-slot="wheel-picker-popup"]')).not.toBeNull(),
    );
    fireEvent.click(view.container.querySelector('[data-slot="wheel-picker-confirm"]') as HTMLElement);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const payload = onConfirm.mock.calls[0][0] as { value: string };
    expect(payload.value).toBe('2026-01-01');
  });
});

describe('WheelCascaderRenderer (plan 665 Phase 4)', () => {
  it('links parent selection to children and confirms the full leaf path', async () => {
    const onConfirm = vi.fn();
    const props = createMockRendererProps({
      schema: { type: 'wheel-cascader' as const },
      props: { options: REGIONS },
      meta: { testid: 'wc' },
      events: { onConfirm: onConfirm as never },
    });
    const view = render(
    <TestRuntimeProvider runtime={createTestRuntime()}>
      <WheelCascaderRenderer {...props} />
    </TestRuntimeProvider>,
  );
    fireEvent.click(view.getByTestId('wc-trigger'));
    await waitFor(() =>
      expect(view.container.querySelector('[data-slot="wheel-picker-popup"]')).not.toBeNull(),
    );
    // two columns: provinces + cities of the first province
    expect(view.container.querySelectorAll('[data-slot="picker-view-column"]')).toHaveLength(2);

    // settle the parent column onto 浙 (one row up) → child column resets
    await dragStrip(view.container, 0, -44);
    await waitFor(() =>
      expect(
        view.container.querySelector('[data-column="1"] [data-active="true"]')?.getAttribute('data-index'),
      ).toBe('0'),
    );

    fireEvent.click(view.container.querySelector('[data-slot="wheel-picker-confirm"]') as HTMLElement);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const payload = onConfirm.mock.calls[0][0] as { value: string[]; labels: string[] };
    expect(payload.value).toEqual(['z', 'hz']);
    expect(payload.labels).toEqual(['浙', '杭州']);
  });
});
