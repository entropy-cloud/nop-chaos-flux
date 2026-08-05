import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PointStore, EventHub } from './point-store.js';
import type { ScadaPointDeclaration } from '../serialization/config-types.js';

const declarations = (overrides: Array<Partial<ScadaPointDeclaration> & { id: string }> = []): ScadaPointDeclaration[] => [
  { id: 'v1', source: 'static', value: 10 },
  { id: 'v2', source: 'static', value: 'on' },
  { id: 'v3', source: 'expression', expression: '${v1 * 2}', init: 0 },
  { id: 'v4', source: 'flux', flux: '${tank.level}', init: 5 },
  ...overrides,
] as ScadaPointDeclaration[];

describe('PointStore 三源声明加载 (I6.1)', () => {
  let store: PointStore;

  beforeEach(() => {
    store = new PointStore();
  });

  it('should load static/expression/flux declarations with initial values', () => {
    store.loadDeclarations(declarations());
    expect(store.getPointValue('v1')).toBe(10);
    expect(store.getPointValue('v2')).toBe('on');
    expect(store.getPointValue('v3')).toBe(0);
    expect(store.getPointValue('v4')).toBe(5);
  });

  it('should fall back to init when static value is missing', () => {
    store.loadDeclarations([{ id: 's1', source: 'static', init: 7 }]);
    expect(store.getPointValue('s1')).toBe(7);
  });

  it('should leave expression/flux points undefined when no init is declared', () => {
    store.loadDeclarations([{ id: 'e1', source: 'expression', expression: '${v1 + 1}' }]);
    expect(store.getPointValue('e1')).toBeUndefined();
  });

  it('getPointState should return value/dirty/declaration snapshot', () => {
    store.loadDeclarations(declarations());
    const state = store.getPointState('v1');
    expect(state).toEqual({
      value: 10,
      dirty: false,
      declaration: expect.objectContaining({ id: 'v1', source: 'static' }),
    });
    expect(store.getPointState('missing')).toBeUndefined();
  });

  it('reset should clear entries, subscriptions and event listeners', () => {
    store.loadDeclarations(declarations());
    const spy = vi.fn();
    store.on('point:change', spy);
    store.setPointValue('v1', 11);
    expect(spy).toHaveBeenCalledTimes(1);
    store.reset();
    expect(store.getPointValue('v1')).toBeUndefined();
    store.setPointValue('v1', 12);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('PointStore setPointValue/setPointValues (I6.1)', () => {
  let store: PointStore;

  beforeEach(() => {
    store = new PointStore();
    store.loadDeclarations(declarations());
  });

  it('should write single value and emit point:change with value/prev', () => {
    const spy = vi.fn();
    store.on('point:change', spy);
    expect(store.setPointValue('v1', 20)).toBe(true);
    expect(store.getPointValue('v1')).toBe(20);
    expect(spy).toHaveBeenCalledWith({ pointId: 'v1', value: 20, prev: 10 });
  });

  it('should batch-write multiple values in one call (统一归口)', () => {
    const spy = vi.fn();
    store.on('point:change', spy);
    store.setPointValues({ v1: 30, v2: 'off' });
    expect(store.getPointValue('v1')).toBe(30);
    expect(store.getPointValue('v2')).toBe('off');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should dedupe unchanged values (onlyChange, 值未变不派发)', () => {
    const spy = vi.fn();
    store.on('point:change', spy);
    expect(store.setPointValue('v1', 10)).toBe(false);
    expect(store.setPointValue('v1', 10)).toBe(false);
    store.setPointValue('v1', 15);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should skip unknown point ids without crashing', () => {
    const spy = vi.fn();
    store.on('point:change', spy);
    expect(store.setPointValue('missing', 1)).toBe(false);
    store.setPointValues({ missing: 1, v1: 42 });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(store.getPointValue('v1')).toBe(42);
  });

  it('should apply deadband: |Δ| < deadband 不派发', () => {
    store.loadDeclarations([{ id: 'd1', source: 'static', value: 100, deadband: 1 }]);
    const spy = vi.fn();
    store.on('point:change', spy);
    expect(store.setPointValue('d1', 100.5)).toBe(false);
    expect(store.getPointValue('d1')).toBe(100);
    expect(store.setPointValue('d1', 101.5)).toBe(true);
    expect(store.getPointValue('d1')).toBe(101.5);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should not apply deadband to non-numeric values', () => {
    store.loadDeclarations([{ id: 's1', source: 'static', value: 'a', deadband: 1 }]);
    store.setPointValue('s1', 'b');
    expect(store.getPointValue('s1')).toBe('b');
  });

  it('should apply linear scale y = k*x + b at write time', () => {
    store.loadDeclarations([{ id: 'sc', source: 'static', value: 0, scale: { k: 2, b: 1 } }]);
    store.setPointValue('sc', 5);
    expect(store.getPointValue('sc')).toBe(11);
  });

  it('should apply k-only scale with default b=0 and b-only scale', () => {
    store.loadDeclarations([
      { id: 'k1', source: 'static', value: 0, scale: { k: 3 } },
      { id: 'b1', source: 'static', value: 0, scale: { b: 10 } },
    ]);
    store.setPointValues({ k1: 2, b1: 1 });
    expect(store.getPointValue('k1')).toBe(6);
    expect(store.getPointValue('b1')).toBe(11);
  });

  it('should not scale string values', () => {
    store.loadDeclarations([{ id: 'str', source: 'static', value: 'x', scale: { k: 2 } }]);
    store.setPointValue('str', 'y');
    expect(store.getPointValue('str')).toBe('y');
  });

  it('should not apply scale to expression-sourced points (computed value is final)', () => {
    store.loadDeclarations([
      { id: 'e1', source: 'expression', expression: '${v1 * 2}', scale: { k: 2 }, init: 0 },
    ]);
    store.setPointValue('e1', 8);
    expect(store.getPointValue('e1')).toBe(8);
  });

  it('should leave expression-scale values raw (evaluator 层处理)', () => {
    store.loadDeclarations([{ id: 'es', source: 'static', value: 0, scale: { expression: '${v1 + 1}' } }]);
    store.setPointValue('es', 3);
    expect(store.getPointValue('es')).toBe(3);
  });

  it('should treat NaN as unchanged (no re-dispatch loop)', () => {
    store.setPointValue('v1', Number.NaN);
    expect(store.getPointValue('v1')).toBe(Number.NaN);
    expect(store.setPointValue('v1', Number.NaN)).toBe(false);
  });
});

describe('PointStore subscribe protocol (I6.1)', () => {
  let store: PointStore;

  beforeEach(() => {
    store = new PointStore();
    store.loadDeclarations(declarations());
  });

  it('should notify only subscribed point ids (FUXA 订阅协议)', () => {
    const cb = vi.fn();
    const unsubscribe = store.subscribe(['v1', 'v4'], cb);
    store.setPointValues({ v1: 1, v2: 'x', v4: 9 });
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenCalledWith({ pointId: 'v1', value: 1, prev: 10 });
    expect(cb).toHaveBeenCalledWith({ pointId: 'v4', value: 9, prev: 5 });
    unsubscribe();
    store.setPointValue('v1', 2);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('should ignore unknown point ids in subscribe and be idempotent', () => {
    const cb = vi.fn();
    const unsubA = store.subscribe(['v1', 'missing'], cb);
    const unsubB = store.subscribe(['v1'], cb);
    store.setPointValue('v1', 3);
    expect(cb).toHaveBeenCalledTimes(1);
    unsubA();
    unsubB();
    store.setPointValue('v1', 4);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('should not emit point:change for deduped writes to subscribers', () => {
    const cb = vi.fn();
    store.subscribe(['v1'], cb);
    store.setPointValue('v1', 10);
    expect(cb).not.toHaveBeenCalled();
  });
});

describe('PointStore dirty tracking (I6.1)', () => {
  let store: PointStore;

  beforeEach(() => {
    store = new PointStore();
    store.loadDeclarations(declarations());
  });

  it('drainDirtyPointIds should return changed ids once and clear dirty flags', () => {
    store.setPointValues({ v1: 1, v4: 2 });
    expect(store.drainDirtyPointIds().sort()).toEqual(['v1', 'v4']);
    expect(store.drainDirtyPointIds()).toEqual([]);
    expect(store.getPointState('v1')?.dirty).toBe(false);
  });

  it('deduped writes should not mark dirty', () => {
    store.setPointValue('v1', 10);
    expect(store.drainDirtyPointIds()).toEqual([]);
    store.setPointValue('v1', 11);
    expect(store.drainDirtyPointIds()).toEqual(['v1']);
  });
});

describe('EventHub (I6.1 事件订阅基元)', () => {
  it('should emit to listeners, support off and removeAll', () => {
    const hub = new EventHub<{ tick: (n: number) => void }>();
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = hub.on('tick', a);
    hub.on('tick', b);
    hub.emit('tick', 1);
    expect(a).toHaveBeenCalledWith(1);
    expect(b).toHaveBeenCalledWith(1);
    unsubA();
    hub.emit('tick', 2);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
    hub.removeAll();
    hub.emit('tick', 3);
    expect(b).toHaveBeenCalledTimes(2);
  });
});
