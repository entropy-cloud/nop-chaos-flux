import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { registerScadaSymbol, unregisterScadaSymbol } from '../symbols/symbol-registry.js';
import { ScadaCanvasEngine } from './scada-engine.js';
import type { ScadaConfig, ScadaSymbolNode } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const makeContainer = () => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 600, configurable: true });
  return el;
};

const shape = (id: string, type: string, overrides: Partial<ScadaSymbolNode> = {}): ScadaSymbolNode => ({
  id,
  type,
  x: 0,
  y: 0,
  ...overrides,
});

const allShapesConfig = (): ScadaConfig => ({
  version: 1,
  symbols: [
    shape('r', 'scada-rect', { width: 100, height: 50, fill: '#ff0000' }),
    shape('rr', 'scada-round-rect', { width: 60, height: 40 }),
    shape('e', 'scada-ellipse', { width: 30, height: 30 }),
    shape('l', 'scada-line', { width: 120, height: 0, stroke: '#333' }),
    shape('a', 'scada-arrow', { width: 80, height: 0 }),
    shape('p', 'scada-pipe', { width: 200, height: 0, stroke: '#3f7b5a' }),
    shape('t', 'scada-text', { text: 'hello', textSize: 16, textColor: '#111' }),
    shape('pg', 'scada-polygon'),
  ],
});

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

describe('ConfigAdapter build (I5.3b)', () => {
  it('should build the scene tree with registry indexes for all 8 shapes', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(allShapesConfig());
    expect(engine.registry.size()).toBe(8);
    expect(engine.getSymbols().map((leaf) => leaf.id)).toEqual([
      'r',
      'rr',
      'e',
      'l',
      'a',
      'p',
      't',
      'pg',
    ]);
    const tags = new Map(engine.getSymbols().map((leaf) => [leaf.id, (leaf.node as { tag: string }).tag]));
    expect(tags.get('r')).toBe('Rect');
    expect(tags.get('rr')).toBe('Rect');
    expect(tags.get('e')).toBe('Ellipse');
    expect(tags.get('l')).toBe('Line');
    expect(tags.get('a')).toBe('Line');
    expect(tags.get('p')).toBe('Line');
    expect(tags.get('t')).toBe('Text');
    expect(tags.get('pg')).toBe('Polygon');
    engine.destroy();
  });

  it('should map shape properties onto the created leafer nodes', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(allShapesConfig());
    const rect = engine.getSymbol('r')?.node as { width: number; height: number; fill: string };
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(50);
    expect(rect.fill).toBe('#ff0000');
    const round = engine.getSymbol('rr')?.node as { cornerRadius: number };
    expect(round.cornerRadius).toBe(8);
    const text = engine.getSymbol('t')?.node as unknown as { text: string; fontSize: number; fill: string };
    expect(text.text).toBe('hello');
    expect(text.fontSize).toBe(16);
    expect(text.fill).toBe('#111');
    const line = engine.getSymbol('l')?.node as unknown as { points: number[]; stroke: string };
    expect(line.points).toEqual([0, 0, 120, 0]);
    expect(line.stroke).toBe('#333');
    engine.destroy();
  });

  it('should recurse into children and register parent/child relationships', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [shape('g', 'scada-group', { children: [shape('c1', 'scada-rect'), shape('c2', 'scada-ellipse')] })],
    } as ScadaConfig);
    expect(engine.registry.size()).toBe(3);
    expect(engine.getSymbol('g')?.node.tag).toBe('Group');
    expect(engine.getSymbol('c1')?.parentId).toBe('g');
    expect(engine.getSymbol('c2')?.parentId).toBe('g');
    expect(engine.getSymbol('g')?.node.children).toHaveLength(2);
    engine.destroy();
  });

  it('should forward scale onto group container nodes (I8.3 复合图元装配)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        shape('g', 'scada-group', {
          x: 10,
          y: 20,
          scale: 3,
          children: [shape('c1', 'scada-rect', { x: 1, y: 2 })],
        }),
      ],
    } as ScadaConfig);
    const group = engine.getSymbol('g')?.node as unknown as Record<string, unknown>;
    expect(group.scaleX).toBe(3);
    expect(group.scaleY).toBe(3);
    expect(group.x).toBe(10);
    expect((engine.getSymbol('c1')?.node as unknown as { x: number }).x).toBe(1);
    engine.destroy();
  });

  it('should apply symbol defaults when instance props omit them', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [shape('r', 'scada-rect')] } as ScadaConfig);
    const rect = engine.getSymbol('r')?.node as { width: number; height: number; fill: string };
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(100);
    expect(rect.fill).toBe('#ffffff');
    engine.destroy();
  });

  it('should throw on unknown symbol type during build', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    expect(() =>
      engine.reset({ version: 1, symbols: [shape('x', 'scada-nope')] } as ScadaConfig),
    ).toThrow(/unknown scada symbol type/);
    engine.destroy();
  });
});

describe('ConfigAdapter destroy/rebuild (I5.3b)', () => {
  it('destroy should clear registry and detach the tree root', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(allShapesConfig());
    const adapter = (engine as unknown as { adapter: { destroy: () => void } }).adapter;
    const treeChildren = () => (engine.tree as unknown as { children: unknown[] }).children;
    const before = treeChildren().length;
    adapter.destroy();
    expect(engine.registry.size()).toBe(0);
    expect(treeChildren()).toHaveLength(before - 1);
  });

  it('rebuild (reset) should fully replace the previous scene tree', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(allShapesConfig());
    engine.reset({ version: 1, symbols: [shape('only', 'scada-rect', { width: 10, height: 10 })] } as ScadaConfig);
    expect(engine.registry.size()).toBe(1);
    expect(engine.getSymbol('only')).toBeDefined();
    expect(engine.getSymbol('r')).toBeUndefined();
    engine.destroy();
  });
});

describe('ConfigAdapter applyDiff (I5.3b)', () => {
  const base = (): ScadaConfig => ({
    version: 1,
    symbols: [shape('a', 'scada-rect', { width: 50, height: 50 }), shape('b', 'scada-rect', { fill: '#000' })],
  });

  it('should apply added / removed / updated symbols incrementally', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(base());
    engine.applyDiff({
      added: [shape('c', 'scada-ellipse', { width: 20, height: 20 })],
      removed: ['b'],
      updated: [{ id: 'a', patch: { fill: '#123456', width: 99 } }],
    });
    expect(engine.registry.size()).toBe(2);
    expect(engine.getSymbol('c')).toBeDefined();
    expect(engine.getSymbol('b')).toBeUndefined();
    const a = engine.getSymbol('a')?.node as { fill: string; width: number };
    expect(a.fill).toBe('#123456');
    expect(a.width).toBe(99);
    engine.destroy();
  });

  it('should rebuild children when an updated patch carries a children array', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [shape('g', 'scada-group', { children: [shape('c1', 'scada-rect')] })] } as ScadaConfig);
    engine.applyDiff({
      added: [],
      removed: [],
      updated: [{ id: 'g', patch: { children: [shape('c1', 'scada-rect'), shape('c2', 'scada-rect')] } }],
    });
    expect(engine.registry.size()).toBe(3);
    expect(engine.getSymbol('c2')).toBeDefined();
    expect(engine.getSymbol('g')?.node.children).toHaveLength(2);
    engine.destroy();
  });

  it('should remove subtree entries together with a removed group', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [shape('g', 'scada-group', { children: [shape('c1', 'scada-rect')] })],
    } as ScadaConfig);
    engine.applyDiff({ added: [], removed: ['g'], updated: [] });
    expect(engine.registry.size()).toBe(0);
    engine.destroy();
  });

  it('should no-op for unknown ids in applyDiff remove/update (I8.3 增量收敛)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [shape('a', 'scada-rect')] } as ScadaConfig);
    expect(() =>
      engine.applyDiff({ added: [], removed: ['ghost'], updated: [{ id: 'ghost2', patch: { fill: '#000' } }] }),
    ).not.toThrow();
    expect(engine.registry.size()).toBe(1);
    const a = engine.getSymbol('a')?.node as { fill: string };
    expect(a.fill).toBe('#ffffff');
    engine.destroy();
  });

  it('should throw when applyDiff is invoked before a build', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    const adapter = (engine as unknown as { adapter: { applyDiff: (d: unknown) => void } }).adapter;
    expect(() => adapter.applyDiff({ added: [], removed: [], updated: [] })).toThrow(/not built/);
    engine.destroy();
  });

  it('should use the definition applyProps hook for updated custom symbols', () => {
    const applyProps = vi.fn((node: unknown, patch: unknown) => {
      (node as { set: (p: unknown) => void }).set(patch);
    });
    registerScadaSymbol({
      type: 'scada-test-adapter-custom',
      name: 'Custom',
      props: { x: { type: 'number' }, y: { type: 'number' }, fill: { type: 'string' } },
      create: () => ({ tag: 'Rect', set: (patch: unknown) => Object.assign({}, patch) } as never),
      applyProps,
    });
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [shape('c', 'scada-test-adapter-custom')],
    } as ScadaConfig);
    engine.applyDiff({ added: [], removed: [], updated: [{ id: 'c', patch: { fill: '#abc' } }] });
    expect(applyProps).toHaveBeenCalledWith(engine.getSymbol('c')?.node, expect.objectContaining({ fill: '#abc' }));
    unregisterScadaSymbol('scada-test-adapter-custom');
    engine.destroy();
  });
});

describe('engine serialization command wiring (I5.3b)', () => {
  it('exportConfig should return the current config snapshot', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    const config = allShapesConfig();
    engine.reset(config);
    expect(engine.exportConfig()).toEqual(config);
    engine.destroy();
  });

  it('importConfig should build from a JSON string and reject invalid configs', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.importConfig(JSON.stringify({ version: 1, symbols: [shape('i', 'scada-rect')] }));
    expect(engine.registry.size()).toBe(1);
    expect(() => engine.importConfig(JSON.stringify({ version: 2, symbols: [] }))).toThrow(/invalid scada config/);
    expect(() => engine.importConfig('{not json')).toThrow(/invalid scada config JSON/);
    engine.destroy();
  });
});
