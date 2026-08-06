import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock, MockRect } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from './register-builtin.js';
import { clearScadaSymbolRegistry, registerScadaSymbol, unregisterScadaSymbol, hasScadaSymbol } from './symbol-registry.js';
import { instantiateSymbol } from './symbol-factory.js';
import {
  deepMergeInstanceProps,
  diffInstanceProps,
  instantiateInstance,
  mergeInstanceProps,
  scadaGroupType,
} from './compound.js';
import { validateScadaConfig } from '../serialization/validate.js';
import { serializeScadaConfig } from '../serialization/serialize.js';
import { diffScadaConfig } from '../serialization/diff.js';
import { ScadaCanvasEngine } from '../engine/scada-engine.js';
import { toShapeAttrs } from './base-shapes/common.js';
import type { ScadaSymbolDefinition, ScadaSymbolProps } from './symbol-types.js';
import type { ScadaConfig, ScadaSymbolNode } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const makeContainer = () => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 600, configurable: true });
  return el;
};

const templateDef = (type: string): ScadaSymbolDefinition => ({
  type,
  name: 'Template',
  category: 'shape',
  props: {
    x: { type: 'number' },
    y: { type: 'number' },
    width: { type: 'number' },
    height: { type: 'number' },
    fill: { type: 'string' },
    custom: { type: 'object' },
    bindings: { type: 'object' },
    states: { type: 'object' },
  },
  defaults: {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    fill: '#ffffff',
    custom: { a: 1, b: { c: 2 } },
    bindings: { fill: { point: 'p1' } },
  },
  create: ({ props }) =>
    new MockRect({ ...toShapeAttrs(props), custom: props.custom }) as never,
});

beforeEach(() => {
  resetLeaferMock();
  clearScadaSymbolRegistry();
  registerBuiltinScadaSymbols();
});

describe('group 复合图元建树 (I8.3, design-symbols.md §4.3)', () => {
  it('should register scada-group as a structural container symbol', () => {
    expect(hasScadaSymbol(scadaGroupType)).toBe(true);
    const node = instantiateSymbol(scadaGroupType, {
      id: 'g',
      props: { x: 10, y: 20, rotation: 45 },
      engine: {},
      config: { world: { x: 0, y: 0, scale: 1 } },
    });
    expect((node as unknown as { tag: string }).tag).toBe('Group');
    expect((node as unknown as { x: number }).x).toBe(10);
    expect((node as unknown as { y: number }).y).toBe(20);
    expect((node as unknown as { rotation: number }).rotation).toBe(45);
  });

  it('should build children with coordinates/rotation relative to the group and index parent/child ids', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        {
          id: 'g1',
          type: 'scada-group',
          x: 100,
          y: 50,
          rotation: 45,
          children: [
            { id: 'c1', type: 'scada-rect', x: 10, y: 20, width: 40, height: 30 },
            {
              id: 'g2',
              type: 'scada-group',
              x: 0,
              y: 0,
              children: [{ id: 'c2', type: 'scada-ellipse', x: 5, y: 5, width: 10, height: 10 }],
            },
          ],
        },
      ],
    } as ScadaConfig);
    expect(engine.registry.size()).toBe(4);
    const g1 = engine.getSymbol('g1');
    const c1 = engine.getSymbol('c1');
    const g2 = engine.getSymbol('g2');
    const c2 = engine.getSymbol('c2');
    // 子节点坐标相对父级（保持相对值），组节点持有绝对位置与相对旋转
    expect((c1?.node as unknown as { x: number }).x).toBe(10);
    expect((c1?.node as unknown as { y: number }).y).toBe(20);
    expect((g1?.node as unknown as { x: number }).x).toBe(100);
    expect((g1?.node as unknown as { rotation: number }).rotation).toBe(45);
    expect(c1?.parentId).toBe('g1');
    expect(g2?.parentId).toBe('g1');
    expect(c2?.parentId).toBe('g2');
    expect(g1?.node.children).toHaveLength(2);
    expect(g2?.node.children).toHaveLength(1);
    engine.destroy();
  });

  it('should clean up the whole group subtree on destroy', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        {
          id: 'g',
          type: 'scada-group',
          x: 0,
          y: 0,
          children: [
            { id: 'c1', type: 'scada-rect', x: 0, y: 0 },
            { id: 'c2', type: 'scada-ellipse', x: 0, y: 0 },
          ],
        },
      ],
    } as ScadaConfig);
    expect(engine.registry.size()).toBe(3);
    engine.destroy();
    expect(engine.registry.size()).toBe(0);
  });
});

describe('instance 模板复用与属性覆盖深合并 (I8.3, §4.3 优先级链)', () => {
  const TYPE = 'scada-test-template';

  it('should deep-merge with the priority chain defaults ← instance JSON ← declaration layers', () => {
    const merged = deepMergeInstanceProps(
      templateDef(TYPE).defaults as ScadaSymbolProps,
      {
        x: 0,
        y: 0,
        width: 50,
        custom: { b: { c: 9 }, d: 3 },
        bindings: { text: { point: 't' } },
        states: { states: { fault: { style: { fill: '#f00' } } } },
      } as ScadaSymbolProps,
    );
    expect(merged.width).toBe(50);
    expect(merged.height).toBe(100);
    expect(merged.custom).toEqual({ a: 1, b: { c: 9 }, d: 3 });
    expect(merged.bindings).toEqual({
      fill: { point: 'p1' },
      text: { point: 't' },
    });
    expect(merged.states).toEqual({ states: { fault: { style: { fill: '#f00' } } } });
  });

  it('mergeInstanceProps should resolve the registered template defaults', () => {
    registerScadaSymbol(templateDef(TYPE));
    const merged = mergeInstanceProps(TYPE, { x: 0, y: 0, width: 30 } as ScadaSymbolProps);
    expect(merged.width).toBe(30);
    expect(merged.fill).toBe('#ffffff');
    expect(merged.custom).toEqual({ a: 1, b: { c: 2 } });
    expect(() => mergeInstanceProps('scada-unknown', { x: 0, y: 0 })).toThrow(/unknown scada symbol type/);
  });

  it('instantiateSymbol should apply the deep-merged props (scale + custom passthrough)', () => {
    registerScadaSymbol(templateDef(TYPE));
    const node = instantiateSymbol(TYPE, {
      id: 'inst',
      props: { x: 0, y: 0, width: 80, scale: 2, custom: { d: 5 } } as ScadaSymbolProps,
      engine: {},
      config: { world: { x: 0, y: 0, scale: 1 } },
    }) as unknown as Record<string, unknown>;
    expect(node.width).toBe(80);
    expect(node.scaleX).toBe(2);
    expect(node.scaleY).toBe(2);
    expect(node.custom).toEqual({ a: 1, b: { c: 2 }, d: 5 });
  });

  it('diffInstanceProps should output the minimal override set (diff against defaults)', () => {
    registerScadaSymbol(templateDef(TYPE));
    const node: ScadaSymbolNode = {
      id: 'inst',
      type: TYPE,
      x: 0,
      y: 0,
      width: 50,
      fill: '#ffffff',
      custom: { b: { c: 9 } },
    };
    const diff = diffInstanceProps(node, templateDef(TYPE));
    expect(diff).toEqual({
      width: 50,
      custom: { b: { c: 9 } },
    });
  });

  // plan 2026-08-05-0653-4 Proof-C2（failing-first，open-audit P2-6）：第三方 registerScadaSymbol 带
  // object-typed defaults 时，instance 与 defaults 的 object 字段 key 序若不同，diffInstanceProps 应稳定判等
  // （不产冗余 override）。修复前：`deepEquals` 用 `JSON.stringify(a) === JSON.stringify(b)`（key 序敏感），
  // key 序不同 → 判不等 → 把与 defaults 等值（仅 key 序不同）的 object 字段当作 override 写入序列化输出
  // （非最小覆盖集，重新引入 plan 2026-08-04-2243-2 W5 同类隐患）。修复后：deepEquals 与 diff.valuesEqual
  // 共享 own-keys 递归 stable deep-equal（key 序不影响判等），key 序重排产 0 冗余 override。
  it('diffInstanceProps should not emit redundant overrides for object-typed defaults with reordered keys (C2: key-order-insensitive deep-equal)', () => {
    // defaults.custom = { a: 1, b: { c: 2 } }；instance.custom 与之等值但 key 序重排（b 在 a 前，且 b.c 嵌套）
    registerScadaSymbol(templateDef(TYPE));
    const def = templateDef(TYPE);
    const node: ScadaSymbolNode = {
      id: 'inst',
      type: TYPE,
      x: 0,
      y: 0,
      // key 序与 defaults 反向（b 先于 a），但内容等值
      custom: { b: { c: 2 }, a: 1 },
    };
    const diff = diffInstanceProps(node, def);
    // custom 与 defaults 等值（key 序不同但内容相同）→ 不应出现在 override 集中
    expect(diff).toEqual({});
  });

  it('deepEquals via shared equality module should treat nested reordered-key objects as equal (C2: stable deep-equal parity with diff.valuesEqual)', () => {
    // 直接验证共享 deepEqual 实现：嵌套 object key 序重排判等稳定（与 diff.valuesEqual W5 行为对齐）
    registerScadaSymbol(templateDef(TYPE));
    const def = templateDef(TYPE);
    // defaults.bindings = { fill: { point: 'p1' } }；instance.bindings 与之等值，key 序重排（point 先于 fill 不可能
    // 因为是单键，故换一个测试：用 custom 嵌套 + 数组混合验证深层 stable）
    const node: ScadaSymbolNode = {
      id: 'inst2',
      type: TYPE,
      x: 0,
      y: 0,
      // custom.a / custom.b.c 与 defaults 等值，custom 整体 key 序与 defaults 反向
      custom: { b: { c: 2 }, a: 1 },
    };
    const diff = diffInstanceProps(node, def);
    expect(diff).toEqual({});
    // 反向验证：内容不同（custom.b.c 改值）→ 仍判不等，正确产出 override
    const node2: ScadaSymbolNode = {
      id: 'inst3',
      type: TYPE,
      x: 0,
      y: 0,
      custom: { b: { c: 9 }, a: 1 },
    };
    const diff2 = diffInstanceProps(node2, def);
    expect(diff2).toEqual({ custom: { b: { c: 9 }, a: 1 } });
  });
});

describe('复合图元序列化协同 (I8.3, serialization-instance-drift)', () => {
  const TYPE = 'scada-test-serial-template';

  it('should serialize instance override sets diffed from defaults (minimal coverage set)', () => {
    registerScadaSymbol(templateDef(TYPE));
    const config: ScadaConfig = {
      version: 1,
      symbols: [
        { id: 'a', type: TYPE, x: 0, y: 0, width: 100, height: 100, fill: '#ffffff' },
        { id: 'b', type: TYPE, x: 10, y: 0, width: 50 },
      ],
    };
    const serialized = JSON.parse(serializeScadaConfig(config)) as ScadaConfig;
    expect(serialized.symbols[0]).toEqual({ id: 'a', type: TYPE });
    expect(serialized.symbols[1]).toEqual({ id: 'b', type: TYPE, x: 10, width: 50 });
  });

  it('should recurse group children while pruning each instance node', () => {
    const config: ScadaConfig = {
      version: 1,
      symbols: [
        {
          id: 'g',
          type: 'scada-group',
          x: 0,
          y: 0,
          children: [{ id: 'c', type: 'scada-rect', x: 0, y: 0, width: 100, height: 100, fill: '#abc' }],
        },
      ],
    };
    const serialized = JSON.parse(serializeScadaConfig(config)) as ScadaConfig;
    expect(serialized.symbols[0]).toEqual({
      id: 'g',
      type: 'scada-group',
      x: 0,
      y: 0,
      children: [{ id: 'c', type: 'scada-rect', fill: '#abc' }],
    });
  });

  it('should leave unregistered or defaults-less symbol nodes unchanged on serialize', () => {
    registerScadaSymbol({ ...templateDef(TYPE), defaults: undefined });
    const config: ScadaConfig = {
      version: 1,
      symbols: [
        { id: 'u', type: 'scada-never-registered', x: 0, y: 0, width: 1 },
        { id: 'nd', type: TYPE, x: 0, y: 0, width: 2 },
      ],
    };
    const serialized = JSON.parse(serializeScadaConfig(config)) as ScadaConfig;
    expect(serialized.symbols[0]).toEqual({ id: 'u', type: 'scada-never-registered', x: 0, y: 0, width: 1 });
    expect(serialized.symbols[1]).toEqual({ id: 'nd', type: TYPE, x: 0, y: 0, width: 2 });
    unregisterScadaSymbol(TYPE);
  });

  it('should prune registered instance nodes that carry their own children', () => {
    registerScadaSymbol(templateDef(TYPE));
    const config: ScadaConfig = {
      version: 1,
      symbols: [
        {
          id: 'composite',
          type: TYPE,
          x: 0,
          y: 0,
          width: 100,
          children: [{ id: 'leaf', type: 'scada-rect', x: 0, y: 0, width: 100, height: 100 }],
        },
        { id: 'plain-group', type: 'scada-group', x: 0, y: 0 },
      ],
    };
    const serialized = JSON.parse(serializeScadaConfig(config)) as ScadaConfig;
    expect(serialized.symbols[0]).toEqual({
      id: 'composite',
      type: TYPE,
      children: [{ id: 'leaf', type: 'scada-rect' }],
    });
    expect(serialized.symbols[1]).toEqual({ id: 'plain-group', type: 'scada-group', x: 0, y: 0 });
    unregisterScadaSymbol(TYPE);
  });

  it('deep merge should replace arrays/primitives wholesale and skip undefined instance values', () => {
    const merged = deepMergeInstanceProps(
      { x: 0, y: 0, strokeDash: [6, 2], custom: { a: 1 } } as unknown as ScadaSymbolProps,
      { x: undefined as unknown as number, strokeDash: [1, 1], custom: { a: 2 } } as unknown as ScadaSymbolProps,
    );
    expect(merged.strokeDash).toEqual([1, 1]);
    expect(merged.custom).toEqual({ a: 2 });
    expect(merged.x).toBe(0);
  });

  it('instantiateInstance should reuse the registered template via deep merge', () => {
    registerScadaSymbol(templateDef(TYPE));
    const node = instantiateInstance(TYPE, {
      id: 'inst',
      props: { x: 0, y: 0, width: 42 } as ScadaSymbolProps,
      engine: {},
      config: { world: { x: 0, y: 0, scale: 1 } },
    }) as unknown as Record<string, unknown>;
    expect(node.width).toBe(42);
    expect(node.fill).toBe('#ffffff');
    unregisterScadaSymbol(TYPE);
  });

  it('serialized minimal sets should still validate and round-trip through the engine', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    const config: ScadaConfig = {
      version: 1,
      symbols: [{ id: 'r', type: 'scada-rect', x: 0, y: 0, width: 100, height: 100 }],
    };
    const minimal = JSON.parse(serializeScadaConfig(config)) as ScadaConfig;
    expect(minimal.symbols[0]).toEqual({ id: 'r', type: 'scada-rect' });
    expect(validateScadaConfig(minimal)).toEqual({ ok: true });
    engine.importConfig(JSON.stringify(minimal));
    const node = engine.getSymbolProps('r') as unknown as { width: number; height: number; fill: string };
    expect(node.width).toBe(100);
    expect(node.height).toBe(100);
    expect(node.fill).toBe('#ffffff');
    engine.destroy();
  });

  it('applyDiff should converge group subtree changes without full rebuild', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    const base: ScadaConfig = {
      version: 1,
      symbols: [
        { id: 'keep', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 },
        { id: 'g', type: 'scada-group', x: 0, y: 0, children: [{ id: 'c1', type: 'scada-rect', x: 0, y: 0 }] },
      ],
    };
    engine.reset(base);
    const next: ScadaConfig = {
      ...base,
      symbols: [
        { id: 'keep', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 },
        {
          id: 'g',
          type: 'scada-group',
          x: 5,
          y: 0,
          children: [
            { id: 'c1', type: 'scada-rect', x: 0, y: 0 },
            { id: 'c2', type: 'scada-rect', x: 1, y: 1 },
          ],
        },
      ],
    };
    engine.applyDiff(diffScadaConfig(base, next), next);
    expect(engine.registry.size()).toBe(4);
    expect(engine.getSymbol('keep')).toBeDefined();
    expect(engine.getSymbol('c2')).toBeDefined();
    expect(engine.getSymbol('c2')?.parentId).toBe('g');
    expect((engine.getSymbol('g')?.node as unknown as { x: number }).x).toBe(5);
    expect(engine.getSymbol('c1')).toBeDefined();
    engine.destroy();
  });

  it('applyDiff should remove a group subtree and update instance properties incrementally', () => {
    registerScadaSymbol(templateDef(TYPE));
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    const base: ScadaConfig = {
      version: 1,
      symbols: [
        { id: 'g', type: 'scada-group', x: 0, y: 0, children: [{ id: 'c1', type: 'scada-rect', x: 0, y: 0 }] },
        { id: 'inst', type: TYPE, x: 0, y: 0, width: 40 },
      ],
    };
    engine.reset(base);
    engine.applyDiff({ added: [], removed: ['g'], updated: [{ id: 'inst', patch: { width: 77, fill: '#123456' } }] });
    expect(engine.registry.size()).toBe(1);
    expect(engine.getSymbol('c1')).toBeUndefined();
    const inst = engine.getSymbolProps('inst') as unknown as { width: number; fill: string };
    expect(inst.width).toBe(77);
    expect(inst.fill).toBe('#123456');
    engine.destroy();
  });
});

describe('V5 复合图元全路径（注册 → 校验 → 实例化 → 场景树加载 → 序列化 → 卸载）', () => {
  const TYPE = 'scada-test-compound-pump';

  it('should load a group tree of instances through the full path and unregister cleanly', () => {
    registerScadaSymbol(templateDef(TYPE));
    const config: ScadaConfig = {
      version: 1,
      symbols: [
        {
          id: 'skid',
          type: 'scada-group',
          x: 0,
          y: 0,
          children: [
            { id: 'p1', type: TYPE, x: 0, y: 0, width: 60, scale: 2 },
            { id: 'p2', type: TYPE, x: 100, y: 0, width: 60 },
            { id: 'nested', type: 'scada-group', x: 0, y: 0, children: [{ id: 'p3', type: TYPE, x: 0, y: 0 }] },
          ],
        },
      ],
    };
    expect(validateScadaConfig(config)).toEqual({ ok: true });

    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(config);
    expect(engine.registry.size()).toBe(5);
    // plan 2026-08-06-0900-2 P2-10：getSymbolProps 经 fromNodeAttrs 反映射回 schema 名（scale 非 raw scaleX）
    const p1 = engine.getSymbolProps('p1') as unknown as { width: number; scale: number; fill: string; custom: unknown };
    expect(p1.width).toBe(60);
    expect(p1.scale).toBe(2);
    expect(p1.fill).toBe('#ffffff');
    expect(p1.custom).toEqual({ a: 1, b: { c: 2 } });
    expect(engine.getSymbol('p3')?.parentId).toBe('nested');

    const exported = engine.exportConfig();
    expect(exported).toEqual(config);

    const serialized = JSON.parse(serializeScadaConfig(config)) as ScadaConfig;
    const skid = serialized.symbols[0];
    expect(skid.children?.map((c) => c.id)).toEqual(['p1', 'p2', 'nested']);
    expect((skid.children?.[0] as ScadaSymbolNode).width).toBe(60);
    expect((skid.children?.[0] as ScadaSymbolNode).scale).toBe(2);

    engine.destroy();
    expect(unregisterScadaSymbol(TYPE)).toBe(true);
    expect(validateScadaConfig(config).ok).toBe(false);
  });
});
