import { vi } from 'vitest';
import type { DesignerConfig } from '@nop-chaos/flow-designer-core';

export type TestNotify = (level: string, message: string) => void;

export interface RendererTestEnv {
  fetcher: <T>() => Promise<{ ok: true; status: number; data: T | null }>;
  notify: TestNotify;
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

export function ensureResizeObserverMock() {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: ResizeObserverMock,
      writable: true,
      configurable: true,
    });
  }
}

export function createTestConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'flow',
    nodeTypes: [
      {
        id: 'task',
        label: 'Task',
        body: { type: 'text', text: 'Task' },
        defaults: { label: 'Task' },
      },
      {
        id: 'end',
        label: 'End',
        body: { type: 'text', text: 'End' },
        defaults: { label: 'End' },
      },
    ],
    edgeTypes: [{ id: 'default', label: 'Flow', defaults: {} }],
    palette: {
      groups: [{ id: 'basic', label: 'Basic', nodeTypes: ['task', 'end'] }],
    },
  };
}

export function createRendererEnv(notify: TestNotify = vi.fn() as TestNotify): RendererTestEnv {
  return {
    fetcher: async function <T>() {
      return { ok: true, status: 200, data: null as T };
    },
    notify,
  };
}
