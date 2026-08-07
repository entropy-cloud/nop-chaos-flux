import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { ComponentHandle, ComponentHandleRegistry } from '@nop-chaos/flux-core';
import { Gantt } from './gantt.js';

const registryMock = vi.hoisted(() => {
  const state: { handle: ComponentHandle | null } = { handle: null };
  return {
    register: vi.fn((handle: ComponentHandle) => {
      state.handle = handle;
      return () => {};
    }),
    state,
  };
});

vi.mock('@nop-chaos/flux-react', () => ({
  useRenderScope: () => ({
    id: 'mock-scope',
    path: '/mock',
    readVisible: () => ({}),
    readOwn: () => ({}),
    update: vi.fn(),
    merge: vi.fn(),
    replace: vi.fn(),
    dispose: vi.fn(),
  }),
  useCurrentComponentRegistry: () => registryMock as unknown as ComponentHandleRegistry,
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
  useGanttKeyboard: vi.fn(),
}));

const baseProps = {
  id: 'gantt-handle-test',
  path: 'test',
  schema: { type: 'gantt' as const },
  templateNode: {} as any,
  node: {} as any,
  props: { tasks: [{ id: 't1', text: 'T1', start: '2026-01-01', end: '2026-01-10' }], links: [] } as any,
  meta: { visible: true, disabled: false } as any,
  regions: {} as any,
  events: {} as any,
  reactions: {} as any,
  helpers: {} as any,
};

describe('Gantt handle invoke dispatches declared schema reactions (22-13)', () => {
  afterEach(() => {
    registryMock.register.mockClear();
    registryMock.state.handle = null;
  });

  function makeReactions() {
    return {
      zoomIn: { ready: vi.fn(), dispatch: vi.fn() },
      zoomOut: { ready: vi.fn(), dispatch: vi.fn() },
      scrollToToday: { ready: vi.fn(), dispatch: vi.fn() },
      scrollToTask: { ready: vi.fn(), dispatch: vi.fn() },
    };
  }

  it('invoking zoomIn/zoomOut/scrollToToday/scrollToTask dispatches each declared reaction', async () => {
    const reactions = makeReactions();
    render(
      React.createElement(Gantt, {
        ...baseProps,
        props: { tasks: [{ id: 't1', text: 'T1', start: '2026-01-01', end: '2026-01-10' }], links: [] } as any,
        reactions: reactions as any,
      }),
    );
    await waitFor(() => {
      expect(registryMock.state.handle).toBeTruthy();
    });
    const handle = registryMock.state.handle!;

    expect(handle.capabilities.invoke('zoomIn', undefined, {})).toEqual({ ok: true });
    expect(handle.capabilities.invoke('zoomOut', undefined, {})).toEqual({ ok: true });
    expect(handle.capabilities.invoke('scrollToToday', undefined, {})).toEqual({ ok: true });
    expect(handle.capabilities.invoke('scrollToTask', { taskId: 't1' }, {})).toEqual({ ok: true });

    expect(reactions.zoomIn.dispatch).toHaveBeenCalledTimes(1);
    expect(reactions.zoomOut.dispatch).toHaveBeenCalledTimes(1);
    expect(reactions.scrollToToday.dispatch).toHaveBeenCalledTimes(1);
    expect(reactions.scrollToTask.dispatch).toHaveBeenCalledTimes(1);
  });

  it('scrollToTask without taskId returns ok:false and does not dispatch the reaction', async () => {
    const reactions = makeReactions();
    render(
      React.createElement(Gantt, {
        ...baseProps,
        props: { tasks: [{ id: 't1', text: 'T1', start: '2026-01-01', end: '2026-01-10' }], links: [] } as any,
        reactions: reactions as any,
      }),
    );
    await waitFor(() => {
      expect(registryMock.state.handle).toBeTruthy();
    });
    const result = registryMock.state.handle!.capabilities.invoke('scrollToTask', {}, {});
    expect(result).toMatchObject({ ok: false });
    expect(reactions.scrollToTask.dispatch).not.toHaveBeenCalled();
    expect(reactions.zoomIn.dispatch).not.toHaveBeenCalled();
  });
});
