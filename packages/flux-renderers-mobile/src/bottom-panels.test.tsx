import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  ActionSheetSchema,
  FloatingBubbleSchema,
  FloatingPanelSchema,
} from './schemas.js';
import { FloatingPanelRenderer } from './floating-panel.js';
import { FloatingBubbleRenderer } from './floating-bubble.js';
import { ActionSheetRenderer } from './action-sheet.js';
import { createMockRendererProps } from './test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function touch(x: number, y: number) {
  return {
    touches: [{ clientX: x, clientY: y } as Touch],
    changedTouches: [{ clientX: x, clientY: y } as Touch],
  } as unknown as React.TouchEvent;
}

describe('FloatingPanelRenderer (plan 666 Phase 1)', () => {
  function renderPanel(options: { anchors?: number[]; defaultHeight?: number } = {}) {
    const onChange = vi.fn();
    const props = createMockRendererProps<FloatingPanelSchema>({
      schema: { type: 'floating-panel' },
      props: {
        anchors: options.anchors ?? [100, 300],
        defaultHeight: options.defaultHeight,
        testid: 'fp',
      },
      regions: { body: <div data-testid="fp-body">Content</div> },
      events: { onChange: onChange as never },
    });
    const view = render(<FloatingPanelRenderer {...props} />);
    return { view, onChange };
  }

  function panelOf(view: ReturnType<typeof render>) {
    return view.container.querySelector('[data-slot="floating-panel"]') as HTMLElement;
  }

  it('mounts at the snapped default height with anchor markers', () => {
    const { view } = renderPanel({ anchors: [100, 300], defaultHeight: 120 });
    const panel = panelOf(view);
    expect(panel.getAttribute('data-height')).toBe('100');
    expect(panel.getAttribute('data-anchor')).toBe('0');
    expect(panel.style.height).toBe('100px');
  });

  it('drag up grows the panel and release snaps to the nearest anchor', async () => {
    const { view, onChange } = renderPanel({ anchors: [100, 300], defaultHeight: 100 });
    const panel = panelOf(view);
    fireEvent.touchStart(panel, touch(100, 400));
    fireEvent.touchMove(panel, touch(100, 250)); // finger up 150 → height 250
    // mid-drag only the inline style moves; data-height follows at settle
    expect(panel.style.height).toBe('250px');
    fireEvent.touchEnd(panel, touch(100, 250));
    // data-anchor commits at settle; data-height/onChange dispatch after the
    // 240ms snap animation completes
    await waitFor(() => expect(panel.getAttribute('data-height')).toBe('300'));
    expect(panel.getAttribute('data-anchor')).toBe('1');
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const payload = onChange.mock.calls[0][0] as { type: string; index: number; height: number };
    expect(payload.type).toBe('anchor');
    expect(payload.index).toBe(1);
    expect(payload.height).toBe(300);
  });

  it('arbitration: below the top anchor the panel owns vertical drags (no content scroll)', () => {
    const { view } = renderPanel({ anchors: [100, 300], defaultHeight: 100 });
    const panel = panelOf(view);
    const preventDefault = vi.spyOn(Event.prototype, 'preventDefault');
    fireEvent.touchStart(panel, touch(100, 400));
    fireEvent.touchMove(panel, touch(100, 380));
    expect(preventDefault).toHaveBeenCalled();
    preventDefault.mockRestore();
  });
});

describe('FloatingBubbleRenderer (plan 666 Phase 2)', () => {
  function renderBubble(options: { initialX?: number; initialY?: number } = {}) {
    const onClick = vi.fn();
    const props = createMockRendererProps<FloatingBubbleSchema>({
      schema: { type: 'floating-bubble' },
      props: { initialX: options.initialX ?? 900, initialY: options.initialY ?? 700, testid: 'fb' },
      events: { onClick: onClick as never },
    });
    const view = render(<FloatingBubbleRenderer {...props} />);
    return { view, onClick };
  }

  function bubbleOf(view: ReturnType<typeof render>) {
    return view.container.querySelector('[data-slot="floating-bubble"]') as HTMLElement;
  }

  it('sub-threshold tap dispatches click without a magnet animation', () => {
    const { view, onClick } = renderBubble({ initialX: 900, initialY: 700 });
    const bubble = bubbleOf(view);
    fireEvent.touchStart(bubble, touch(920, 720));
    fireEvent.touchEnd(bubble, touch(921, 721));
    expect(onClick).toHaveBeenCalledTimes(1);
    const payload = onClick.mock.calls[0][0] as { type: string };
    expect(payload.type).toBe('click');
  });

  it('drag over 6px does not dispatch click (negative assertion)', () => {
    const { view, onClick } = renderBubble({ initialX: 900, initialY: 700 });
    const bubble = bubbleOf(view);
    fireEvent.touchStart(bubble, touch(920, 720));
    fireEvent.touchMove(bubble, touch(990, 720));
    fireEvent.touchEnd(bubble, touch(990, 720));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('drag release magnetizes to the nearest edge', async () => {
    const { view } = renderBubble({ initialX: 900, initialY: 700 });
    const bubble = bubbleOf(view);
    fireEvent.touchStart(bubble, touch(870, 720));
    fireEvent.touchMove(bubble, touch(900, 720));
    fireEvent.touchEnd(bubble, touch(900, 720));
    // near the right edge → snaps to maxX (window.innerWidth - 48)
    await waitFor(() => {
      const x = parseFloat(bubble.style.transform.match(/translate\((-?\d+(\.\d+)?)px/)?.[1] ?? '0');
      expect(x).toBeGreaterThan(800);
    });
  });

  it('over-drag beyond the left bound is rubberband-resisted (visual damping)', () => {
    const { view } = renderBubble({ initialX: 10, initialY: 700 });
    const bubble = bubbleOf(view);
    // 100px drag past the left edge: raw x would be -100+10-... clamped visual
    // x = -rubberband(90, 48, 0.15) ≈ -21.5, well short of the raw -90
    fireEvent.touchStart(bubble, touch(100, 700));
    fireEvent.touchMove(bubble, touch(10, 700));
    const x = parseFloat(bubble.style.transform.match(/translate\((-?\d+(\.\d+)?)px/)?.[1] ?? '0');
    expect(x).toBeLessThan(0);
    expect(x).toBeGreaterThan(-60);
  });

  it('drag release magnetizes to the nearest edge (legacy duplicate slot)', async () => {
    const { view } = renderBubble({ initialX: 850, initialY: 700 });
    const bubble = bubbleOf(view);
    fireEvent.touchStart(bubble, touch(870, 720));
    fireEvent.touchMove(bubble, touch(900, 720));
    fireEvent.touchEnd(bubble, touch(900, 720));
    // near the right edge → snaps to maxX (window.innerWidth - 48)
    await waitFor(() => {
      const x = parseFloat(bubble.style.transform.match(/translate\((-?\d+(\.\d+)?)px/)?.[1] ?? '0');
      expect(x).toBeGreaterThan(800);
    });
  });
});

describe('ActionSheetRenderer (plan 666 Phase 4)', () => {
  function renderSheet(options: { display?: 'list' | 'grid' } = {}) {
    const onSelect = vi.fn();
    const onCancel = vi.fn();
    const props = createMockRendererProps<ActionSheetSchema>({
      schema: { type: 'action-sheet' },
      props: {
        triggerText: '打开操作',
        title: '操作',
        display: options.display,
        items: [
          { label: '分享', value: 'share' },
          { label: '删除', value: 'delete', disabled: true },
        ],
        testid: 'as',
      },
      meta: { testid: 'as' },
      events: { onSelect: onSelect as never, onCancel: onCancel as never },
    });
    const view = render(<ActionSheetRenderer {...props} />);
    return { view, onSelect, onCancel };
  }

  it('opens on trigger and renders list items with disabled marking', async () => {
    const { view } = renderSheet();
    fireEvent.click(view.getByTestId('as-trigger'));
    await waitFor(() =>
      expect(view.container.querySelector('[data-slot="action-sheet-popup"]')).not.toBeNull(),
    );
    const items = view.container.querySelectorAll('[data-slot="action-sheet-item"]');
    expect(items).toHaveLength(2);
    expect(items[1].getAttribute('data-disabled')).toBe('true');
  });

  it('enabled item tap dispatches select payload and closes; disabled does not', async () => {
    const { view, onSelect, onCancel } = renderSheet();
    fireEvent.click(view.getByTestId('as-trigger'));
    await waitFor(() =>
      expect(view.container.querySelector('[data-slot="action-sheet-popup"]')).not.toBeNull(),
    );
    const items = view.container.querySelectorAll('[data-slot="action-sheet-item"]');
    fireEvent.click(items[1]); // disabled
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(items[0]);
    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
    const payload = onSelect.mock.calls[0][0] as { type: string; index: number; value: string; label: string };
    expect(payload).toEqual({ type: 'select', index: 0, value: 'share', label: '分享' });
    expect(view.container.querySelector('[data-slot="action-sheet-popup"]')).toBeNull();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('mask click dispatches cancel and closes', async () => {
    const { view, onCancel } = renderSheet();
    fireEvent.click(view.getByTestId('as-trigger'));
    await waitFor(() =>
      expect(view.container.querySelector('[data-slot="action-sheet-popup"]')).not.toBeNull(),
    );
    fireEvent.click(view.container.querySelector('[data-slot="action-sheet-mask"]') as HTMLElement);
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    expect(view.container.querySelector('[data-slot="action-sheet-popup"]')).toBeNull();
  });

  it('grid display renders the grid container', async () => {
    const { view } = renderSheet({ display: 'grid' });
    fireEvent.click(view.getByTestId('as-trigger'));
    await waitFor(() =>
      expect(view.container.querySelector('[data-slot="action-sheet-items-grid"]')).not.toBeNull(),
    );
  });
});
