import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { Gantt } from './gantt.js';

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererRuntime: () => ({ dispatch: vi.fn() }),
  useRenderScope: () => ({ id: 'mock-scope', path: '/mock', readVisible: () => ({}), readOwn: () => ({}), update: vi.fn(), merge: vi.fn(), replace: vi.fn(), dispose: vi.fn() }),
  useScopeSelector: () => undefined,
  useCurrentComponentRegistry: () => undefined,
}));

vi.mock('./hooks/use-gantt-drag.js', () => ({
  useGanttDrag: () => ({
    dragRef: { current: null },
    onPointerDown: vi.fn(),
  }),
}));

vi.mock('./hooks/use-gantt-link-draw.js', () => ({
  useGanttLinkDraw: () => ({
    onLinkHandlePointerDown: vi.fn(),
    startKeyboardLink: vi.fn(),
    completeKeyboardLink: vi.fn(),
    cancelLink: vi.fn(),
    isLinking: false,
  }),
}));

vi.mock('./hooks/use-gantt-scroll.js', () => ({
  useGanttScroll: vi.fn(),
}));

vi.mock('./hooks/use-gantt-keyboard.js', () => ({
  useGanttKeyboard: () => undefined,
}));

// The keyboard-edit channel: GanttBars invokes `onBarKeyAction(taskId,
// action)` for bar keyboard edits (move-up/move-down/resize-left/resize-right).
// This mock drives the REAL gantt.tsx `handleBarKeyAction` wiring — the four
// dispatch branches under adjudication (2-19).
const barActionsTriggered = vi.hoisted(() => ({ actions: [] as string[] }));

vi.mock('./gantt-bars.js', () => ({
  GanttBars: ({ onBarKeyAction }: { onBarKeyAction?: (taskId: string | number, action: string) => void }) => {
    const firedRef = React.useRef(false);
    React.useEffect(() => {
      // Fire each declared keyboard-edit action exactly once per mount —
      // store updates re-render Gantt, so an unguarded effect would loop.
      if (firedRef.current) return;
      firedRef.current = true;
      for (const action of barActionsTriggered.actions) {
        onBarKeyAction?.('t1', action);
      }
    }, [onBarKeyAction]);
    return null;
  },
}));

const baseProps = {
  id: 'gantt-test',
  path: 'test',
  schema: { type: 'gantt' as const },
  templateNode: {} as any,
  node: {} as any,
  props: {
    tasks: [{ id: 't1', text: 'T1', start: '2026-01-01', end: '2026-01-10' }],
    links: [],
  } as any,
  meta: { visible: true, disabled: false } as any,
  regions: {} as any,
  events: {} as any,
  reactions: {} as any,
  helpers: {} as any,
};

describe('Gantt keyboard-edit event contract — 2-19 adjudication (onTaskEdit, not onTaskDragEnd)', () => {
  it('move-up dispatches onTaskEdit with {_taskId, changes} + full ctx and NOT onTaskDragEnd', () => {
    barActionsTriggered.actions = ['move-up'];
    const onTaskEdit = vi.fn();
    const onTaskDragEnd = vi.fn();
    render(
      React.createElement(Gantt, {
        ...baseProps,
        events: { onTaskEdit, onTaskDragEnd } as any,
      }),
    );
    expect(onTaskEdit).toHaveBeenCalledTimes(1);
    expect(onTaskEdit).toHaveBeenCalledWith(
      { _taskId: 't1', changes: { start: '2025-12-31', end: '2026-01-09' } },
      expect.objectContaining({
        event: expect.objectContaining({ _taskId: 't1' }),
        evaluationBindings: expect.objectContaining({ _taskId: 't1', changes: expect.objectContaining({ start: '2025-12-31' }) }),
        scope: expect.anything(),
      }),
    );
    expect(onTaskDragEnd).not.toHaveBeenCalled();
  });

  it('move-down dispatches onTaskEdit with {_taskId, changes}', () => {
    barActionsTriggered.actions = ['move-down'];
    const onTaskEdit = vi.fn();
    const onTaskDragEnd = vi.fn();
    render(
      React.createElement(Gantt, {
        ...baseProps,
        events: { onTaskEdit, onTaskDragEnd } as any,
      }),
    );
    expect(onTaskEdit).toHaveBeenCalledTimes(1);
    expect(onTaskEdit).toHaveBeenCalledWith(
      { _taskId: 't1', changes: { start: '2026-01-02', end: '2026-01-11' } },
      expect.anything(),
    );
    expect(onTaskDragEnd).not.toHaveBeenCalled();
  });

  it('resize-left dispatches onTaskEdit with only the end change', () => {
    barActionsTriggered.actions = ['resize-left'];
    const onTaskEdit = vi.fn();
    const onTaskDragEnd = vi.fn();
    render(
      React.createElement(Gantt, {
        ...baseProps,
        events: { onTaskEdit, onTaskDragEnd } as any,
      }),
    );
    expect(onTaskEdit).toHaveBeenCalledTimes(1);
    expect(onTaskEdit).toHaveBeenCalledWith(
      { _taskId: 't1', changes: { end: '2026-01-09' } },
      expect.anything(),
    );
    expect(onTaskDragEnd).not.toHaveBeenCalled();
  });

  it('resize-right dispatches onTaskEdit with only the end change', () => {
    barActionsTriggered.actions = ['resize-right'];
    const onTaskEdit = vi.fn();
    const onTaskDragEnd = vi.fn();
    render(
      React.createElement(Gantt, {
        ...baseProps,
        events: { onTaskEdit, onTaskDragEnd } as any,
      }),
    );
    expect(onTaskEdit).toHaveBeenCalledTimes(1);
    expect(onTaskEdit).toHaveBeenCalledWith(
      { _taskId: 't1', changes: { end: '2026-01-11' } },
      expect.anything(),
    );
    expect(onTaskDragEnd).not.toHaveBeenCalled();
  });
});
