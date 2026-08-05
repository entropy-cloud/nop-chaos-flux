import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { registerScadaSymbol, unregisterScadaSymbol } from '../symbols/symbol-registry.js';
import { ScadaCanvasEngine } from './scada-engine.js';
import { scadaTestHandleKey } from './test-handle.js';
import type { ScadaConfig } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const makeContainer = () => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 600, configurable: true });
  return el;
};

const validConfig = (overrides: Record<string, unknown> = {}) => ({
  version: 1,
  symbols: [
    { id: 'rect-1', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' },
    { id: 'rect-2', type: 'scada-rect', x: 200, y: 20, width: 100, height: 50, fill: '#00ff00' },
  ],
  ...overrides,
});

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

// 拆分自 scada-engine.test.ts：事件桥接线（symbol:click/dblclick/hover，I6.4）+
// getSymbolDeclarations 声明合并快路径（I14.2）+ image cache + config projection。
// 仅移动、不改断言。
describe('ScadaCanvasEngine 事件桥接线 (I6.4)', () => {
  it('should emit symbol:click with normalized payload on tree tap', async () => {
    const onSymbolEvent = vi.fn();
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), onSymbolEvent });
    engine.reset(validConfig() as ScadaConfig);
    const leaf = engine.getSymbol('rect-1')?.node;
    (engine.tree as unknown as { selector: { getByPoint: (p: unknown) => unknown } }).selector.getByPoint = () =>
      ({ target: leaf, path: [leaf] });
    // tap 经双击合并延迟 120ms 发射（leafer 交互层语义，I11.1 Proof）
    engine.tree.emit('tap', { x: 100, y: 200 });
    await vi.waitFor(() => expect(onSymbolEvent).toHaveBeenCalledTimes(1));
    expect(onSymbolEvent).toHaveBeenCalledWith(
      'symbol:click',
      expect.objectContaining({
        symbolId: 'rect-1',
        symbolType: 'scada-rect',
        world: { x: 100, y: 200 },
        viewport: { x: 100, y: 200 },
      }),
    );
    engine.destroy();
  });

  it('should project bound point values via getPointValuesFor into the payload', () => {
    const onSymbolEvent = vi.fn();
    const getPointValuesFor = vi.fn(() => ({ level: 42 }));
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), onSymbolEvent, getPointValuesFor });
    engine.reset(validConfig() as ScadaConfig);
    const leaf = engine.getSymbol('rect-1')?.node;
    (engine.tree as unknown as { selector: { getByPoint: (p: unknown) => unknown } }).selector.getByPoint = () =>
      ({ target: leaf, path: [leaf] });
    engine.tree.emit('double_tap', { x: 10, y: 20 });
    expect(getPointValuesFor).toHaveBeenCalledWith('rect-1');
    expect(onSymbolEvent).toHaveBeenCalledWith(
      'symbol:dblclick',
      expect.objectContaining({ symbolId: 'rect-1', pointValues: { level: 42 } }),
    );
    engine.destroy();
  });

  it('should map world coordinates through the viewport state', () => {
    const onSymbolEvent = vi.fn();
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), onSymbolEvent });
    engine.reset(validConfig() as ScadaConfig);
    engine.setViewport({ x: 0, y: 0, scale: 2 });
    const leaf = engine.getSymbol('rect-1')?.node;
    (engine.tree as unknown as { selector: { getByPoint: (p: unknown) => unknown } }).selector.getByPoint = () =>
      ({ target: leaf, path: [leaf] });
    engine.app.emit('pointer.move', { x: 100, y: 200 });
    expect(onSymbolEvent).toHaveBeenCalledWith(
      'symbol:hover',
      expect.objectContaining({ world: { x: 50, y: 100 }, viewport: { x: 100, y: 200 } }),
    );
    engine.destroy();
  });

  it('should not emit when no onSymbolEvent handler is provided', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(validConfig() as ScadaConfig);
    const leaf = engine.getSymbol('rect-1')?.node;
    (engine.tree as unknown as { selector: { getByPoint: (p: unknown) => unknown } }).selector.getByPoint = () =>
      ({ target: leaf, path: [leaf] });
    engine.tree.emit('tap', { x: 10, y: 20 });
    engine.destroy();
  });

  it('destroy should detach the event bridge', () => {
    const onSymbolEvent = vi.fn();
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), onSymbolEvent });
    engine.reset(validConfig() as ScadaConfig);
    const leaf = engine.getSymbol('rect-1')?.node;
    (engine.tree as unknown as { selector: { getByPoint: (p: unknown) => unknown } }).selector.getByPoint = () =>
      ({ target: leaf, path: [leaf] });
    engine.destroy();
    engine.tree.emit('tap', { x: 10, y: 20 });
    expect(onSymbolEvent).not.toHaveBeenCalled();
  });
});

describe('getSymbolDeclarations 无声明快路径 (I14.2)', () => {
  it('should return undefined when neither instance nor defaults declare states/animations', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(validConfig() as ScadaConfig);
    expect(engine.getSymbolDeclarations('rect-1')).toBeUndefined();
    engine.destroy();
  });

  it('should return merged instance states when only the instance declares them', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        {
          id: 's',
          type: 'scada-rect',
          x: 0,
          y: 0,
          states: {
            states: { alarm: { style: { fill: '#ff0000' } } },
            booleanMap: { true: 'alarm', false: 'normal' },
          },
        },
      ],
    } as ScadaConfig);
    const declarations = engine.getSymbolDeclarations('s');
    expect(declarations?.states?.booleanMap).toEqual({ true: 'alarm', false: 'normal' });
    engine.destroy();
  });

  it('should return merged defaults when only the definition defaults declare them', () => {
    registerScadaSymbol({
      type: 'scada-test-decl-defaults',
      name: 'DeclDefaults',
      props: { x: { type: 'number' }, y: { type: 'number' }, fill: { type: 'string' } },
      defaults: {
        x: 0,
        y: 0,
        states: { states: { fault: { style: { fill: '#0000ff' } } }, booleanMap: { true: 'fault', false: 'normal' } },
      },
      create: () => ({ tag: 'Rect', set: (patch: unknown) => Object.assign({}, patch) } as never),
    });
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [{ id: 'd', type: 'scada-test-decl-defaults', x: 0, y: 0 }],
    } as ScadaConfig);
    const declarations = engine.getSymbolDeclarations('d');
    expect(declarations?.states?.booleanMap).toEqual({ true: 'fault', false: 'normal' });
    engine.destroy();
    unregisterScadaSymbol('scada-test-decl-defaults');
  });

  it('should let instance declarations override definition defaults', () => {
    registerScadaSymbol({
      type: 'scada-test-decl-override',
      name: 'DeclOverride',
      props: { x: { type: 'number' }, y: { type: 'number' } },
      defaults: {
        x: 0,
        y: 0,
        states: { states: { a: { style: { fill: '#ffffff' } } }, booleanMap: { true: 'a', false: 'b' } },
      },
      create: () => ({ tag: 'Rect', set: (patch: unknown) => Object.assign({}, patch) } as never),
    });
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        {
          id: 'o',
          type: 'scada-test-decl-override',
          x: 0,
          y: 0,
          states: { states: { z: { style: { fill: '#123456' } } }, booleanMap: { true: 'z', false: 'n' } },
        },
      ],
    } as ScadaConfig);
    const declarations = engine.getSymbolDeclarations('o');
    expect(declarations?.states?.booleanMap).toEqual({ true: 'z', false: 'n' });
    engine.destroy();
    unregisterScadaSymbol('scada-test-decl-override');
  });

  it('should keep returning declarations for symbols with only animations declared', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        {
          id: 'a',
          type: 'scada-rect',
          x: 0,
          y: 0,
          animations: [{ kind: 'rotate', period: 1000, when: 'always' }],
        },
      ],
    } as ScadaConfig);
    const declarations = engine.getSymbolDeclarations('a');
    expect(declarations?.animations).toEqual([{ kind: 'rotate', period: 1000, when: 'always' }]);
    engine.destroy();
  });
});

describe('ScadaCanvasEngine image cache + config projection (plan 2026-08-04-1558-3 Phase 3 覆盖缺口)', () => {
  it('cacheImage / resolveImageUrl round-trip：缓存命中返回 resolved，未缓存回退原 url', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    // 未缓存：返回原 url
    expect(engine.resolveImageUrl('https://x/a.png')).toBe('https://x/a.png');
    // 缓存写入后：命中返回 resolved
    engine.cacheImage('https://x/a.png', 'blob:resolved-a');
    expect(engine.resolveImageUrl('https://x/a.png')).toBe('blob:resolved-a');
    // 不同 url 仍未缓存
    expect(engine.resolveImageUrl('https://x/b.png')).toBe('https://x/b.png');
    engine.destroy();
  });

  it('exportConfig returns undefined before any config is built (no currentConfig)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    expect(engine.exportConfig()).toBeUndefined();
    engine.destroy();
  });

  it('test handle measureAddStrategies projection returns count + timing shape (m-8 探针投影)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), exposeTestHandle: true, cid: 77 });
    const handle = (window as unknown as Record<string, unknown>)[scadaTestHandleKey(77)] as {
      measureAddStrategies?: (count: number) => { count: number; perNodeMs: number; batchMs: number; ratio: number };
    };
    expect(handle.measureAddStrategies).toBeDefined();
    const probe = handle.measureAddStrategies!(30);
    expect(probe.count).toBe(30);
    expect(Object.keys(probe).sort()).toEqual(['batchMs', 'count', 'perNodeMs', 'ratio']);
    expect(Number.isFinite(probe.ratio)).toBe(true);
    engine.destroy();
  });
});
