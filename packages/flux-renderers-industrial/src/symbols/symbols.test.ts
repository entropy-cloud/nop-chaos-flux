import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import {
  clearScadaSymbolRegistry,
  getScadaSymbolDefinition,
  hasScadaSymbol,
  listScadaSymbols,
  registerScadaSymbol,
  unregisterScadaSymbol,
} from './symbol-registry.js';
import { resolveSymbolStyle } from './style-resolver.js';
import { instantiateSymbol, toNodePatch } from './symbol-factory.js';
import { registerBuiltinScadaSymbols, builtinScadaSymbolDefinitions } from './register-builtin.js';
import { scadaPipeDefinition } from './base-shapes/pipe.js';
import { validateScadaConfig } from '../serialization/validate.js';
import { ScadaCanvasEngine } from '../engine/scada-engine.js';
import type { ScadaSymbolDefinition, ScadaSymbolProps } from './symbol-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const makeContainer = () => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 600, configurable: true });
  return el;
};

const makeDef = (type: string, overrides: Partial<ScadaSymbolDefinition> = {}): ScadaSymbolDefinition => ({
  type,
  name: type,
  props: { x: { type: 'number' }, y: { type: 'number' } },
  create: () => ({ tag: 'Rect' } as never),
  ...overrides,
});

beforeEach(() => {
  resetLeaferMock();
  clearScadaSymbolRegistry();
  registerBuiltinScadaSymbols();
});

describe('symbol registry (I5.4)', () => {
  it('should register, look up and unregister definitions', () => {
    registerScadaSymbol(makeDef('scada-test-a'));
    expect(hasScadaSymbol('scada-test-a')).toBe(true);
    expect(getScadaSymbolDefinition('scada-test-a')?.type).toBe('scada-test-a');
    expect(unregisterScadaSymbol('scada-test-a')).toBe(true);
    expect(hasScadaSymbol('scada-test-a')).toBe(false);
    expect(unregisterScadaSymbol('scada-test-a')).toBe(false);
    expect(getScadaSymbolDefinition('scada-test-a')).toBeUndefined();
  });

  it('should throw on duplicate registration without override and replace with override', () => {
    registerScadaSymbol(makeDef('scada-test-dup'));
    expect(() => registerScadaSymbol(makeDef('scada-test-dup'))).toThrow(/already registered/);
    const replaced = makeDef('scada-test-dup', { name: 'Replaced' });
    registerScadaSymbol(replaced, { override: true });
    expect(getScadaSymbolDefinition('scada-test-dup')?.name).toBe('Replaced');
  });

  it('should reject invalid definitions', () => {
    expect(() => registerScadaSymbol(makeDef('') as never)).toThrow(/non-empty `type`/);
    expect(() => registerScadaSymbol(makeDef('scada-test-bad', { create: undefined } as never))).toThrow(/factory function/);
    expect(() => registerScadaSymbol(makeDef('scada-test-bad', { props: undefined } as never))).toThrow(/props/);
  });

  it('should list registered definitions', () => {
    const before = listScadaSymbols().length;
    registerScadaSymbol(makeDef('scada-test-listed'));
    expect(listScadaSymbols()).toHaveLength(before + 1);
  });
});

describe('style resolver (I5.4)', () => {
  const def: ScadaSymbolDefinition = {
    type: 'scada-test-style',
    name: 'Style',
    props: {},
    defaults: { x: 0, y: 0, fill: '#000000', stroke: '#ffffff', opacity: 1 },
    create: () => ({ tag: 'Rect' } as never),
  };

  it('should merge defaults ∪ instance with instance priority', () => {
    const style = resolveSymbolStyle(def, { x: 0, y: 0, fill: '#ff0000' });
    expect(style.fill).toBe('#ff0000');
    expect(style.stroke).toBe('#ffffff');
    expect(style.opacity).toBe(1);
  });

  it('should apply statePatch over instance props', () => {
    const style = resolveSymbolStyle(def, { x: 0, y: 0, fill: '#ff0000' }, 'fault');
    expect(style.fill).toBe('#ff0000');
    expect(style).toEqual({ x: 0, y: 0, fill: '#ff0000', stroke: '#ffffff', opacity: 1 });
  });

  it('should use the definition resolveStateStyle hook when provided', () => {
    const hookDef: ScadaSymbolDefinition = {
      ...def,
      resolveStateStyle: (props, state) => (state === 'fault' ? { fill: '#ff0000' } : { fill: props.fill }),
    };
    const style = resolveSymbolStyle(hookDef, { x: 0, y: 0, fill: '#00ff00' }, 'fault');
    expect(style.fill).toBe('#ff0000');
  });

  it('should resolve state style from the instance states declaration by default', () => {
    const style = resolveSymbolStyle(
      def,
      {
        x: 0,
        y: 0,
        states: { states: { fault: { style: { fill: '#990000', visible: false } } } },
      },
      'fault',
    );
    expect(style.fill).toBe('#990000');
    expect(style.visible).toBe(false);
  });

  it('should keep visible flag in style instead of removing the node', () => {
    const style = resolveSymbolStyle(def, { x: 0, y: 0, visible: false });
    expect(style.visible).toBe(false);
    expect(style).not.toBeInstanceOf(Error);
  });
});

describe('symbol factory (I5.4)', () => {
  it('should instantiate a registered type', () => {
    const node = instantiateSymbol('scada-rect', {
      id: 'r1',
      props: { x: 1, y: 2, width: 30, height: 40, fill: '#abc' },
      engine: {},
      config: { world: { x: 0, y: 0, scale: 1 } },
    });
    expect((node as unknown as { tag: string }).tag).toBe('Rect');
    expect((node as unknown as { x: number }).x).toBe(1);
    expect((node as unknown as { fill: string }).fill).toBe('#abc');
  });

  it('should reject unknown types', () => {
    expect(() =>
      instantiateSymbol('scada-unknown', {
        id: 'x',
        props: { x: 0, y: 0 },
        engine: {},
        config: { world: { x: 0, y: 0, scale: 1 } },
      }),
    ).toThrow(/unknown scada symbol type/);
  });

  it('toNodePatch should map scada props to leafer attrs', () => {
    const node = { tag: 'Rect' } as never;
    const patch = toNodePatch(node, {
      scale: 2,
      textSize: 18,
      strokeDash: [4, 4],
      x: 5,
      fill: '#f00',
    });
    expect(patch).toEqual({ scaleX: 2, scaleY: 2, fontSize: 18, dashPattern: [4, 4], x: 5, fill: '#f00' });
  });

  it('toNodePatch should map textColor to fill for Text nodes only', () => {
    const textNode = { tag: 'Text' } as never;
    expect(toNodePatch(textNode, { textColor: '#123' })).toEqual({ fill: '#123' });
    const rectNode = { tag: 'Rect' } as never;
    expect(toNodePatch(rectNode, { textColor: '#123' })).toEqual({ textColor: '#123' });
    expect(toNodePatch(textNode, { align: 'center' })).toEqual({ textAlign: 'center' });
  });
});

describe('builtin base shapes (I5.4)', () => {
  const instantiate = (type: string, props: Partial<ScadaSymbolProps> = {}) =>
    instantiateSymbol(type, {
      id: 's',
      props: { x: 0, y: 0, ...props } as ScadaSymbolProps,
      engine: {},
      config: { world: { x: 0, y: 0, scale: 1 } },
    }) as unknown as Record<string, unknown>;

  it('should register exactly the 24 builtin symbols on load (8 shapes + image/video placeholders + group + device/instrument/sensor-control 4 族 12 个 + pipe-junction)', () => {
    expect(builtinScadaSymbolDefinitions).toHaveLength(24);
    for (const def of builtinScadaSymbolDefinitions) {
      expect(hasScadaSymbol(def.type)).toBe(true);
    }
    expect(registerBuiltinScadaSymbols()).toBeUndefined();
  });

  it('scada-rect should create a Rect with width/height defaults', () => {
    const node = instantiate('scada-rect');
    expect(node.tag).toBe('Rect');
    expect(node.width).toBe(100);
    expect(node.height).toBe(100);
    expect(node.fill).toBe('#ffffff');
  });

  it('scada-round-rect should create a rounded Rect', () => {
    const node = instantiate('scada-round-rect', { width: 50, height: 50 });
    expect(node.tag).toBe('Rect');
    expect(node.cornerRadius).toBe(8);
  });

  it('scada-ellipse should create an Ellipse', () => {
    const node = instantiate('scada-ellipse', { width: 60, height: 30 });
    expect(node.tag).toBe('Ellipse');
    expect(node.width).toBe(60);
  });

  it('scada-line should create a Line with points from width/height', () => {
    const node = instantiate('scada-line', { width: 120, height: 40 });
    expect(node.tag).toBe('Line');
    expect(node.points).toEqual([0, 0, 120, 40]);
  });

  it('scada-arrow should create an arrow Line with endArrow', () => {
    const node = instantiate('scada-arrow', { width: 80, height: 0 });
    expect(node.tag).toBe('Line');
    expect(node.endArrow).toBe(true);
  });

  it('scada-pipe should create a thick stroked Line', () => {
    const node = instantiate('scada-pipe', { width: 200, height: 0, stroke: '#333' });
    expect(node.tag).toBe('Line');
    expect(node.stroke).toBe('#333');
    expect(node.strokeWidth).toBe(6);
    expect(node.strokeCap).toBe('round');
  });

  it('scada-text should create a Text with text style mapping', () => {
    const node = instantiate('scada-text', { text: 'hello', textColor: '#ff0000', textSize: 20, align: 'center' });
    expect(node.tag).toBe('Text');
    expect(node.text).toBe('hello');
    expect(node.fill).toBe('#ff0000');
    expect(node.fontSize).toBe(20);
    expect(node.textAlign).toBe('center');
  });

  it('scada-polygon should create a Polygon with default or custom points', () => {
    const def = instantiate('scada-polygon');
    expect(def.tag).toBe('Polygon');
    expect(Array.isArray(def.points)).toBe(true);
    const custom = instantiate('scada-polygon', { custom: { points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] } });
    expect(custom.points).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
  });

  it('should forward scale into scaleX/scaleY on shape creation', () => {
    const node = instantiate('scada-rect', { scale: 3 });
    expect(node.scaleX).toBe(3);
    expect(node.scaleY).toBe(3);
  });

  it('should fall back to default width/height when shapes omit them', () => {
    const rect = instantiate('scada-rect', { width: undefined });
    expect(rect.width).toBe(100);
    const ellipse = instantiate('scada-ellipse', { width: undefined, height: undefined });
    expect(ellipse.width).toBe(100);
    const round = instantiate('scada-round-rect', { width: undefined });
    expect(round.width).toBe(100);
    const line = instantiate('scada-line', { width: undefined, height: undefined });
    expect(line.points).toEqual([0, 0, 100, 0]);
  });

  it('should map strokeDash and shadow into leafer attrs', () => {
    const node = instantiate('scada-rect', { strokeDash: [6, 2], shadow: { x: 1, y: 1, blur: 2, color: '#000' } });
    expect(node.dashPattern).toEqual([6, 2]);
    expect(node.shadow).toEqual({ x: 1, y: 1, blur: 2, color: '#000' });
  });

  it('scada-text should map optional style props when provided', () => {
    const node = instantiate('scada-text', {
      text: 'styled',
      fontFamily: 'monospace',
      fontWeight: 'bold',
      align: 'right',
      textColor: '#123',
      textSize: 9,
    });
    expect(node.fontFamily).toBe('monospace');
    expect(node.fontWeight).toBe('bold');
    expect(node.textAlign).toBe('right');
    expect(node.fill).toBe('#123');
    expect(node.fontSize).toBe(9);
    const plain = instantiate('scada-text');
    expect(plain.text).toBe('');
  });

  it('scada-text 居中主路径：align:center + 显式 width 共同生效 (plan 2026-08-04-1558-3 Phase 1)', () => {
    // leafer-ui@2.2.9 自动宽 Text 下 textAlign:'center' 无 layoutWidth 不生效。
    // 显式 width 为主路径：center 对齐需 width 才产生有效居中偏移。
    const centered = instantiate('scada-text', { text: 'hi', align: 'center', width: 200 });
    expect(centered.textAlign).toBe('center');
    expect(centered.width).toBe(200);
  });

  it('scada-pipe should derive stroke from fill when stroke is absent', () => {
    const node = scadaPipeDefinition.create({
      id: 's',
      props: { x: 0, y: 0, width: 60, height: 0, fill: '#112233' },
      engine: {},
      config: { world: { x: 0, y: 0, scale: 1 } },
    }) as unknown as Record<string, unknown>;
    expect(node.stroke).toBe('#112233');
    expect(node.strokeCap).toBe('round');
  });

  it('scada-arrow/line/ellipse/rect should apply explicit instance props', () => {
    const arrow = instantiate('scada-arrow', { width: 55, height: 12 });
    expect(arrow.points).toEqual([0, 0, 55, 12]);
    const rect = instantiate('scada-rect', { fill: '#fedcba', stroke: '#010203', strokeWidth: 2 });
    expect(rect.fill).toBe('#fedcba');
    expect(rect.stroke).toBe('#010203');
    expect(rect.strokeWidth).toBe(2);
  });

  // I15.1 V5 体积面补强（I5 plan Deferred：I9 设备库落地后 20+ 真实工业图元覆盖断言）：
  // 24 个内置图元定义（8 基础形状 + image/video 占位 + group + 4 族 12 个 + pipe-junction）
  // 全量经引擎场景树加载（validate → engine.reset → getSymbols/registry 覆盖），不弱化既有用例。
  it('should full-path load all 24 builtin symbols through the engine scene tree (I15.1 V5 volume)', () => {
    const config = {
      version: 1 as const,
      symbols: builtinScadaSymbolDefinitions.map((def, index) => ({
        id: `builtin-${index}`,
        type: def.type,
        x: index * 30,
        y: 0,
        width: 40,
        height: 30,
      })),
    };

    const result = validateScadaConfig(config);
    expect(result).toEqual({ ok: true });

    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(config as never);
    expect(engine.registry.size()).toBe(24);
    // scada-group 容器节点按设计不挂 symbol definition（design-symbols.md §4.3 容器语义），
    // 经 node tag（Group）归位；其余图元经 definition.type 断言。
    const loadedTypes = new Set(
      engine.getSymbols().map((leaf) => {
        if (leaf.definition?.type) return leaf.definition.type;
        return (leaf.node as { tag?: string }).tag === 'Group' ? 'scada-group' : undefined;
      }),
    );
    for (const def of builtinScadaSymbolDefinitions) {
      expect(loadedTypes.has(def.type)).toBe(true);
    }
    engine.destroy();
  });
});

describe('registry hygiene across tests', () => {
  it('custom test registrations should not leak', () => {
    expect(hasScadaSymbol('scada-test-a')).toBe(false);
    expect(hasScadaSymbol('scada-rect')).toBe(true);
  });
});
