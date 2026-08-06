import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { Calendar } from './calendar.js';
import type { ComponentHandle } from '@nop-chaos/flux-core';

declare const process: {
  on: (event: 'unhandledRejection', listener: (reason: unknown) => void) => unknown;
  off: (event: 'unhandledRejection', listener: (reason: unknown) => void) => unknown;
};

const html2canvasMock = vi.hoisted(() => vi.fn());

vi.mock('html2canvas', () => ({ default: html2canvasMock }));

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
  useRendererRuntime: () => ({ dispatch: vi.fn(), env: { notify: vi.fn() } }),
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
  useScopeSelector: () => undefined,
  useCurrentComponentRegistry: () => registryMock,
}));

vi.mock('../shared/hooks/use-focus-trap.js', () => ({
  useFocusTrap: vi.fn(),
}));

const baseProps = {
  id: 'cal-export-test',
  path: 'test',
  schema: { type: 'calendar' as const },
  templateNode: {} as any,
  node: {} as any,
  props: {
    events: [
      {
        id: 'e1',
        title: 'Event',
        start: '2026-07-21T09:00:00',
        end: '2026-07-21T10:00:00',
        type: 'shift',
        resourceId: 'r1',
      },
    ],
    resources: [{ id: 'r1', text: 'R1', title: 'R1' }],
  },
  meta: { visible: true, disabled: false } as any,
  regions: {} as any,
  events: {} as any,
  reactions: {} as any,
  helpers: {} as any,
};

describe('Calendar component exportToPNG handle', () => {
  afterEach(() => {
    html2canvasMock.mockReset();
    registryMock.register.mockClear();
    registryMock.state.handle = null;
  });

  it('reports {ok:false,error} when PNG export fails and does not produce an unhandled rejection', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);
    try {
      html2canvasMock.mockRejectedValue(new Error('canvas boom'));
      render(<Calendar {...baseProps} />);
      await waitFor(() => {
        expect(registryMock.state.handle).toBeTruthy();
      });

      const result = await registryMock.state.handle!.capabilities.invoke('exportToPNG', undefined, {});

      expect(result.ok).toBe(false);
      expect((result as { error?: unknown }).error).toBeInstanceOf(Error);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(unhandled).toHaveLength(0);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  it('reports {ok:true} when PNG export succeeds', async () => {
    html2canvasMock.mockResolvedValue({
      toBlob: (callback: (blob: Blob | null) => void) => callback(new Blob()),
      toDataURL: () => 'data:image/png;base64,test',
      width: 100,
      height: 100,
    });
    render(<Calendar {...baseProps} />);
    await waitFor(() => {
      expect(registryMock.state.handle).toBeTruthy();
    });

    const result = await registryMock.state.handle!.capabilities.invoke('exportToPNG', undefined, {});
    expect(result.ok).toBe(true);
  });

  it('dispatches the declared print/exportPNG reactions when the handle methods are invoked (22-05)', async () => {
    html2canvasMock.mockResolvedValue({
      toBlob: (callback: (blob: Blob | null) => void) => callback(new Blob()),
      toDataURL: () => 'data:image/png;base64,test',
      width: 100,
      height: 100,
    });
    const print = { ready: vi.fn(), dispatch: vi.fn() };
    const exportPNG = { ready: vi.fn(), dispatch: vi.fn() };
    (window as unknown as { print: () => void }).print = vi.fn();
    render(<Calendar {...baseProps} reactions={{ print, exportPNG } as any} />);
    await waitFor(() => {
      expect(registryMock.state.handle).toBeTruthy();
    });
    const handle = registryMock.state.handle!;

    // component:exportToPrint → print reaction fires
    handle.capabilities.invoke('exportToPrint', undefined, {});
    expect(print.dispatch).toHaveBeenCalledTimes(1);
    expect(exportPNG.dispatch).not.toHaveBeenCalled();

    // component:exportToPNG → exportPNG reaction fires
    const result = await handle.capabilities.invoke('exportToPNG', undefined, {});
    expect(result.ok).toBe(true);
    expect(exportPNG.dispatch).toHaveBeenCalledTimes(1);
    expect(print.dispatch).toHaveBeenCalledTimes(1);
  });
});
