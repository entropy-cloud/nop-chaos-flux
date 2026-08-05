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

  // plan 2026-08-05-0653-4 Proof-C1（failing-first，defense-in-depth）：scada-rect（叶子 type）误带
  // children 时 ConfigAdapter.buildNode 必须按 type 分支构建（保留 leaf 的 fill/stroke/width/height），
  // 不再静默降级为 Group。修复前：`isContainer = node.type === GROUP_CONTAINER_TYPE || (node.children?.length ?? 0) > 0`
  // ——任何带 children 的节点被静默降级为 Group，leaf 的 fill/stroke/width/height 经 Group 构造分支丢失。
  // 修复后：`isContainer = node.type === GROUP_CONTAINER_TYPE`，叶子带 children 按 leaf 构建（children 被忽略）。
  // 与 validator fail-fast（serialization.test.ts Proof-C1）互为 defense-in-depth：validator 拦截主流路径
  // （renderer.parseAndValidateConfig / engine.importConfig），buildNode 守护 validator 旁路（engine.reset 直调）。
  it('should not silently downgrade leaf-with-children to Group (C1: buildNode preserves leaf attrs by type)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        shape('leaf', 'scada-rect', {
          width: 100,
          height: 50,
          fill: '#ff0000',
          stroke: '#333',
          children: [shape('orphan', 'scada-rect')],
        }),
      ],
    } as ScadaConfig);
    const leaf = engine.getSymbol('leaf')?.node as {
      tag: string;
      width: number;
      height: number;
      fill: string;
      stroke: string;
    };
    // 按叶子类型构建（Rect），非 Group 降级；leaf attrs 全部保留（不丢 fill/stroke/width/height）
    expect(leaf.tag).toBe('Rect');
    expect(leaf.width).toBe(100);
    expect(leaf.height).toBe(50);
    expect(leaf.fill).toBe('#ff0000');
    expect(leaf.stroke).toBe('#333');
    // children 不入 registry（按 leaf 构建，children 字段被忽略；author 应通过 validator 拒绝捕捉）
    expect(engine.registry.get('orphan')).toBeUndefined();
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

  it('should destroy the old symbol before building the new one for a same-id type change (remove-then-rebuild)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [shape('a', 'scada-rect', { width: 100, height: 100 })] } as ScadaConfig);
    const treeRoot = (engine.tree as unknown as { children: Array<{ children: unknown[] }> }).children[0];
    const next = {
      version: 1,
      symbols: [shape('a', 'scada-ellipse', { width: 30, height: 30 })],
    } as ScadaConfig;
    engine.applyDiff(
      { added: [shape('a', 'scada-ellipse', { width: 30, height: 30 })], removed: ['a'], updated: [] },
      next,
    );
    expect(engine.registry.size()).toBe(1);
    expect((engine.getSymbol('a')?.node as { tag: string }).tag).toBe('Ellipse');
    expect(treeRoot.children).toHaveLength(1);
    expect(engine.getConfigNode('a')).toBe(next.symbols[0]);
    engine.destroy();
  });

  it('should refresh nodeById and declarations for non-children updated ids (states/animations via diff)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        shape('d', 'scada-rect', {
          width: 60,
          height: 40,
          states: { states: { run: { style: { fill: '#ff0000' } } } },
        }),
      ],
    } as ScadaConfig);
    expect(engine.getSymbolDeclarations('d')?.states?.states.run.style).toEqual({ fill: '#ff0000' });

    const next = {
      version: 1,
      symbols: [
        shape('d', 'scada-rect', {
          width: 60,
          height: 40,
          states: { states: { run: { style: { fill: '#00ff00' } }, stop: {} } },
          animations: [{ kind: 'blink', period: 50 }],
        }),
      ],
    } as ScadaConfig;
    engine.applyDiff(
      {
        added: [],
        removed: [],
        updated: [
          {
            id: 'd',
            patch: {
              states: { states: { run: { style: { fill: '#00ff00' } }, stop: {} } },
              animations: [{ kind: 'blink', period: 50 }],
            },
          },
        ],
      },
      next,
    );
    const declarations = engine.getSymbolDeclarations('d');
    expect(declarations?.states?.states.run.style).toEqual({ fill: '#00ff00' });
    expect(declarations?.states?.states.stop).toBeDefined();
    expect(declarations?.animations).toEqual([{ kind: 'blink', period: 50 }]);
    expect(engine.getConfigNode('d')).toBe(next.symbols[0]);
    engine.destroy();
  });

  it('getConfigNode should track add/remove/children-rebuild through applyDiff (I14.2 O(1) 索引)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        shape('g', 'scada-group', { children: [shape('c1', 'scada-rect', { x: 1 }), shape('c2', 'scada-rect', { x: 2 })] }),
        shape('b', 'scada-rect', { fill: '#000' }),
      ],
    } as ScadaConfig);
    expect(engine.getConfigNode('c1')?.x).toBe(1);
    expect(engine.getConfigNode('b')?.id).toBe('b');

    engine.applyDiff(
      {
        added: [shape('c', 'scada-ellipse', { width: 20, height: 20 })],
        removed: ['b'],
        updated: [{ id: 'g', patch: { children: [shape('c1', 'scada-rect', { x: 9 }), shape('c3', 'scada-rect', { x: 3 })] } }],
      },
      {
        version: 1,
        symbols: [
          shape('g', 'scada-group', { children: [shape('c1', 'scada-rect', { x: 9 }), shape('c3', 'scada-rect', { x: 3 })] }),
          shape('c', 'scada-ellipse', { width: 20, height: 20 }),
        ],
      },
    );
    expect(engine.getConfigNode('c')?.width).toBe(20);
    expect(engine.getConfigNode('b')).toBeUndefined();
    expect(engine.getConfigNode('c1')?.x).toBe(9);
    expect(engine.getConfigNode('c2')).toBeUndefined();
    expect(engine.getConfigNode('c3')?.x).toBe(3);
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
