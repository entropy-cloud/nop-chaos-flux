import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ComponentCapabilities, ComponentHandle, ComponentHandleRegistry } from '@nop-chaos/flux-core';
import { PointStore } from '../../binding/point-store.js';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../../symbols/register-builtin.js';
import { useScadaHandles } from './use-scada-handles.js';
import type { ScadaCanvasRuntime } from './use-scada-engine.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

interface CapturedHandle extends ComponentHandle {
  capabilities: ComponentCapabilities & {
    invoke: (method: string, payload?: Record<string, unknown>) => { ok: boolean; error?: unknown };
  };
}

function makeRegistry(): { registry: ComponentHandleRegistry; captured: () => CapturedHandle | undefined } {
  let handle: CapturedHandle | undefined;
  const registry = {
    id: 'test-registry',
    register(h: ComponentHandle) {
      handle = h as CapturedHandle;
      return () => {
        handle = undefined;
      };
    },
    unregister() {},
    resolve() {
      return handle;
    },
  } as unknown as ComponentHandleRegistry;
  return { registry, captured: () => handle };
}

function makeRuntime(pointStore: PointStore): ScadaCanvasRuntime {
  const applyAttrs = vi.fn();
  return {
    engine: {
      isDestroyed: () => false,
      exportConfig: () => undefined,
      getSymbols: () => [],
      getSymbolProps: () => undefined,
      fit: () => ({ x: 0, y: 0, scale: 1 }),
      center: () => ({ x: 0, y: 0, scale: 1 }),
    },
    pointStore,
    pipeline: { requestRender: vi.fn() },
    applyAttrs,
  } as unknown as ScadaCanvasRuntime;
}

describe('component:setPointValue isScadaPrimitive guard (plan 2026-08-04-2243-2 W4)', () => {
  it('accepts a primitive value and writes it to the point store', () => {
    const store = new PointStore();
    store.loadDeclarations([{ id: 'p1', source: 'static', value: 0 }]);
    const { registry, captured } = makeRegistry();
    renderHook(() =>
      useScadaHandles({
        componentRegistry: registry,
        id: 'scada-1',
        cid: 1,
        runtime: makeRuntime(store),
        destroy: vi.fn(),
        reloadConfig: vi.fn(),
      }),
    );
    const result = captured()!.capabilities.invoke('setPointValue', { pointId: 'p1', value: 42 });
    expect(result.ok).toBe(true);
    expect(store.getPointValue('p1')).toBe(42);
  });

  it('rejects an object value with { ok:false } and does not corrupt the point store', () => {
    const store = new PointStore();
    store.loadDeclarations([{ id: 'p1', source: 'static', value: 7 }]);
    const { registry, captured } = makeRegistry();
    renderHook(() =>
      useScadaHandles({
        componentRegistry: registry,
        id: 'scada-1',
        cid: 2,
        runtime: makeRuntime(store),
        destroy: vi.fn(),
        reloadConfig: vi.fn(),
      }),
    );
    const before = store.getPointValue('p1');
    const result = captured()!.capabilities.invoke('setPointValue', {
      pointId: 'p1',
      value: { unexpected: 'object' },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    // 点表不变（host 非原始值未 corrupt）
    expect(store.getPointValue('p1')).toBe(before);
  });

  it('rejects an array value with { ok:false } and does not corrupt the point store', () => {
    const store = new PointStore();
    store.loadDeclarations([{ id: 'p1', source: 'static', value: 7 }]);
    const { registry, captured } = makeRegistry();
    renderHook(() =>
      useScadaHandles({
        componentRegistry: registry,
        id: 'scada-1',
        cid: 3,
        runtime: makeRuntime(store),
        destroy: vi.fn(),
        reloadConfig: vi.fn(),
      }),
    );
    const before = store.getPointValue('p1');
    const result = captured()!.capabilities.invoke('setPointValue', { pointId: 'p1', value: [1, 2, 3] });
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(store.getPointValue('p1')).toBe(before);
  });

  it('accepts boolean and string primitives', () => {
    const store = new PointStore();
    store.loadDeclarations([{ id: 'b1', source: 'static', value: false }, { id: 's1', source: 'static', value: '' }]);
    const { registry, captured } = makeRegistry();
    renderHook(() =>
      useScadaHandles({
        componentRegistry: registry,
        id: 'scada-1',
        cid: 4,
        runtime: makeRuntime(store),
        destroy: vi.fn(),
        reloadConfig: vi.fn(),
      }),
    );
    expect(captured()!.capabilities.invoke('setPointValue', { pointId: 'b1', value: true }).ok).toBe(true);
    expect(store.getPointValue('b1')).toBe(true);
    expect(captured()!.capabilities.invoke('setPointValue', { pointId: 's1', value: 'on' }).ok).toBe(true);
    expect(store.getPointValue('s1')).toBe('on');
  });

  it('rejects null value (non-primitive) with { ok:false }', () => {
    const store = new PointStore();
    store.loadDeclarations([{ id: 'p1', source: 'static', value: 7 }]);
    const { registry, captured } = makeRegistry();
    renderHook(() =>
      useScadaHandles({
        componentRegistry: registry,
        id: 'scada-1',
        cid: 5,
        runtime: makeRuntime(store),
        destroy: vi.fn(),
        reloadConfig: vi.fn(),
      }),
    );
    const result = captured()!.capabilities.invoke('setPointValue', { pointId: 'p1', value: null });
    expect(result.ok).toBe(false);
    expect(store.getPointValue('p1')).toBe(7);
  });
});
