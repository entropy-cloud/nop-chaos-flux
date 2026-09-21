import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, act, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Calendar } from './calendar.js';
import { CalendarEventBlock } from './components/calendar-event-block.js';
import type { CalendarEvent, CalendarResource } from '../schemas.js';
import type { PositionedEvent } from './calendar.types.js';

// plan 481 Phase 2 Proof：
// ① 拖拽目标格 data-drop-target/data-drop-valid/drag-ok/drag-conflict
//    set/remove 断言（calendar.tsx 发射端已有，此处固化行为）；
// ② calendar.css 三条 token 驱动新规则的存在性断言（规则文本级）；
// ③ N2/R2 双轨消解契约：默认路径不再 inline 注入背景色，类型化事件由
//    calendar.css 语义 token 规则着色；event.color 显式覆盖保留。
//
// 先红记录：②（规则缺失）与 ③（inline backgroundColor 存在）修复前为红。

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererRuntime: () => ({ dispatch: vi.fn() }),
  useRenderScope: () => ({ id: 'mock-scope', path: '/mock', readVisible: () => ({}), readOwn: () => ({}), update: vi.fn(), merge: vi.fn(), replace: vi.fn(), dispose: vi.fn() }),
  useScopeSelector: () => undefined,
  useCurrentComponentRegistry: () => undefined,
}));

// happy-dom 无可测量视口，@tanstack/react-virtual 产不出虚拟行 → 月视图 0 行。
// 拖拽发射路径与虚拟化无关，直接给出两行虚拟条目（r1/r2）。
vi.mock('./hooks/use-calendar-virtualizer.js', () => ({
  useCalendarVirtualizer: () => ({
    scrollRef: { current: null },
    virtualItems: [
      { index: 0, start: 0, size: 48, key: 0 },
      { index: 1, start: 48, size: 48, key: 1 },
    ],
    totalSize: 96,
  }),
}));

const cssSource = readFileSync(join(import.meta.dirname, 'calendar.css'), 'utf8');

const mockEvents: CalendarEvent[] = [
  { id: 'e1', title: 'Morning Shift', start: '2026-07-21T08:00:00', end: '2026-07-21T16:00:00', type: 'shift', resourceId: 'r1' },
];
const mockResources: CalendarResource[] = [
  { id: 'r1', title: 'Team A' },
  { id: 'r2', title: 'Team B' },
];

function renderCalendar() {
  return render(React.createElement(Calendar, {
    id: 'cal-drag',
    path: 'test',
    schema: { type: 'calendar' as const },
    templateNode: {} as any,
    node: {} as any,
    props: {
      events: mockEvents,
      resources: mockResources,
      date: '2026-07-20',
    } as any,
    meta: { visible: true, disabled: false } as any,
    regions: {} as any,
    events: {} as any,
    reactions: {} as any,
    helpers: {} as any,
  }));
}

const cellSelector = (date: string, resource: string) =>
  `[data-slot="calendar-cell"][data-date="${date}"][data-resource="${resource}"]`;

function cellInner(container: HTMLElement, date: string, resource: string): Element {
  const cell = container.querySelector(cellSelector(date, resource));
  if (!cell) throw new Error(`cell ${date}/${resource} not found`);
  return cell;
}

// window 级 pointer 事件在 React act 之外派发时，dragState → attribute-stamp
// effect 是被动刷新；act 内派发保证断言前 DOM 已结算。
function dispatchPointer(type: 'pointermove' | 'pointerup', x = 10, y = 10): void {
  act(() => {
    window.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1 }));
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('calendar drag drop-target visuals (plan 482 N1 / 481 R1)', () => {
  it('pointer drag stamps data-drop-target/data-drop-valid/drag-ok on the valid target cell', () => {
    const { container } = renderCalendar();
    const sourceEvent = container.querySelector('[data-slot="calendar-event"][data-event-id="e1"]') as HTMLElement;
    expect(sourceEvent).toBeTruthy();
    const targetCell = cellInner(container, '2026-07-22', 'r2');
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(targetCell as HTMLElement);

    fireEvent.pointerDown(sourceEvent, { button: 0, pointerId: 1 });
    dispatchPointer('pointermove');

    expect(targetCell.getAttribute('data-drop-target')).toBe('true');
    expect(targetCell.getAttribute('data-drop-valid')).toBe('true');
    expect(targetCell.classList.contains('drag-ok')).toBe(true);
    expect(targetCell.classList.contains('drag-conflict')).toBe(false);
  });

  it('same-cell hover marks drag-conflict (invalid drop)', () => {
    const { container } = renderCalendar();
    const sourceEvent = container.querySelector('[data-slot="calendar-event"][data-event-id="e1"]') as HTMLElement;
    const sourceCell = cellInner(container, '2026-07-21', 'r1');
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(sourceCell as HTMLElement);

    fireEvent.pointerDown(sourceEvent, { button: 0, pointerId: 1 });
    dispatchPointer('pointermove');

    expect(sourceCell.getAttribute('data-drop-target')).toBe('true');
    expect(sourceCell.getAttribute('data-drop-valid')).toBe('false');
    expect(sourceCell.classList.contains('drag-conflict')).toBe(true);
    expect(sourceCell.classList.contains('drag-ok')).toBe(false);
  });

  it('marks swap between cells and removes all traces after pointerup', () => {
    const { container } = renderCalendar();
    const sourceEvent = container.querySelector('[data-slot="calendar-event"][data-event-id="e1"]') as HTMLElement;
    const sourceCell = cellInner(container, '2026-07-21', 'r1');
    const targetCell = cellInner(container, '2026-07-22', 'r2');
    const hit = vi.spyOn(document, 'elementFromPoint');

    hit.mockReturnValue(targetCell as HTMLElement);
    fireEvent.pointerDown(sourceEvent, { button: 0, pointerId: 1 });
    dispatchPointer('pointermove');
    expect(targetCell.classList.contains('drag-ok')).toBe(true);

    dispatchPointer('pointerup');
    expect(targetCell.getAttribute('data-drop-target')).toBeNull();
    expect(targetCell.getAttribute('data-drop-valid')).toBeNull();
    expect(targetCell.classList.contains('drag-ok')).toBe(false);
    expect(targetCell.classList.contains('drag-conflict')).toBe(false);
    expect(sourceCell.getAttribute('data-drop-target')).toBeNull();

    void sourceCell;
  });
});

describe('calendar.css drag rules (plan 481 N1/R1 — text level)', () => {
  it('declares the drop-target ring, drag-ok and drag-conflict token rules', () => {
    expect(cssSource).toMatch(/\.nop-calendar \[data-slot='calendar-cell'\]\[data-drop-target='true'\]/);
    const dropRule = cssSource.slice(cssSource.indexOf("[data-slot='calendar-cell'][data-drop-target='true']"));
    expect(dropRule.slice(0, 300)).toContain('var(--color-primary)');

    expect(cssSource).toMatch(/\.drag-ok/);
    const okRule = cssSource.slice(cssSource.indexOf('.drag-ok'));
    expect(okRule.slice(0, 300)).toContain('--color-success');

    expect(cssSource).toMatch(/\.drag-conflict/);
    const conflictRule = cssSource.slice(cssSource.indexOf('.drag-conflict'));
    expect(conflictRule.slice(0, 300)).toContain('--color-destructive');
  });
});

describe('calendar event color dual-track resolution (plan 481 N2/R2)', () => {
  const positioned: PositionedEvent = {
    event: { id: 'e1', title: 'Morning Shift', start: '2026-07-21T08:00:00', end: '2026-07-21T16:00:00', type: 'shift', resourceId: 'r1' },
    eventId: 'e1',
    left: 10,
    width: 80,
    top: 0,
    height: 100,
    isSplit: false,
    concurrentIndex: 0,
    maxConcurrent: 1,
    overlap: false,
  };

  function renderBlock(event: CalendarEvent) {
    return render(React.createElement(CalendarEventBlock, {
      positionedEvent: { ...positioned, event },
      dateStr: '2026-07-21',
    }));
  }

  it('typed events carry no inline background-color (CSS token rules own the default path)', () => {
    const { container } = renderBlock(positioned.event);
    const el = container.querySelector('[data-slot="calendar-event"]') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.style.backgroundColor).toBe('');
    expect(el.getAttribute('style') ?? '').not.toContain('background');
  });

  it('typeless events also carry no inline background-color — fallback landing is a CSS rule', () => {
    const typeless: CalendarEvent = { id: 'e9', title: 'Ad hoc', start: '2026-07-21T08:00:00', end: '2026-07-21T09:00:00', resourceId: 'r1' };
    const { container } = renderBlock(typeless);
    const el = container.querySelector('[data-slot="calendar-event"]') as HTMLElement;
    expect(el.style.backgroundColor).toBe('');
  });

  it('explicit event.color override still lands inline', () => {
    const colored: CalendarEvent = { ...positioned.event, color: '#123456' };
    const { container } = renderBlock(colored);
    const el = container.querySelector('[data-slot="calendar-event"]') as HTMLElement;
    expect(el.style.backgroundColor).toBe('#123456');
  });

  it('calendar.css keeps the semantic token rules for typed events (dark-adaptive)', () => {
    expect(cssSource).toMatch(/\.nop-calendar \[data-event-type='shift'\]/);
    const shiftRule = cssSource.slice(cssSource.indexOf("[data-event-type='shift']"));
    expect(shiftRule.slice(0, 200)).toContain('var(--color-success)');
  });

  it('no undefined --color-calendar-* consumption remains in package source', () => {
    const blockSource = readFileSync(join(import.meta.dirname, 'components', 'calendar-event-block.tsx'), 'utf8');
    const calendarSource = readFileSync(join(import.meta.dirname, 'calendar.tsx'), 'utf8');
    expect(blockSource).not.toContain('--color-calendar-');
    expect(calendarSource).not.toContain('--color-calendar-');
  });
});
