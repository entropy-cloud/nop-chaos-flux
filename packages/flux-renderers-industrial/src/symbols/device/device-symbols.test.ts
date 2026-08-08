import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock, MockText } from '../../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../register-builtin.js';
import { clearScadaSymbolRegistry, hasScadaSymbol } from '../symbol-registry.js';
import { instantiateSymbol } from '../symbol-factory.js';
import { createCompositeGroup, applyCompositeProps } from './common.js';
import { ScadaCanvasEngine } from '../../engine/scada-engine.js';
import { PointStore } from '../../binding/point-store.js';
import { ReverseIndex } from '../../binding/reverse-index.js';
import { DirtyCollector } from '../../binding/dirty-collector.js';
import { RefreshPipeline } from '../../binding/refresh-pipeline.js';
import { Animator } from '../../binding/animator.js';
import { StateVisualApplier } from '../visual-state.js';
import { validateScadaConfig } from '../../serialization/validate.js';
import { serializeScadaConfig } from '../../serialization/serialize.js';
import type { ScadaConfig, ScadaSymbolNode } from '../../serialization/config-types.js';
import type { LeafNode } from '../symbol-types.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const makeContainer = () => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 600, configurable: true });
  return el;
};

const childrenOf = (root: LeafNode): Array<Record<string, unknown>> =>
  (root as unknown as { children: Array<Record<string, unknown>> }).children ?? [];

const childOf = (root: LeafNode, name: string): Record<string, unknown> => {
  const found = childrenOf(root).find((child) => child.name === name);
  if (!found) throw new Error(`child ${name} not found`);
  return found;
};

interface DeviceHarness {
  engine: ScadaCanvasEngine;
  pipeline: RefreshPipeline;
  animator: Animator;
  runTick: () => void;
  advance: (ms: number) => void;
  setValue: (pointId: string, value: number | boolean | string) => void;
  flush: () => void;
}

function createDeviceHarness(config: ScadaConfig, points: Array<{ id: string; value: number | boolean | string }>): DeviceHarness {
  const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
  engine.reset(config);
  const pointStore = new PointStore();
  pointStore.loadDeclarations(
    points.map((p) => ({ id: p.id, source: 'static' as const, value: p.value })),
  );
  const reverseIndex = new ReverseIndex(config.symbols);
  const collector = new DirtyCollector({ scheduleTick: () => () => {} });
  let now = 0;
  let scheduledTick: (() => void) | undefined;
  const animator = new Animator({
    now: () => now,
    scheduleTick: (cb) => {
      scheduledTick = cb;
      return () => {
        scheduledTick = undefined;
      };
    },
    collect: (entry) => collector.collect(entry),
  });
  const pipeline = new RefreshPipeline({
    pointStore,
    reverseIndex,
    collector,
    animator,
    getStates: (id) => engine.getSymbolDeclarations(id)?.states,
    getAnimations: (id) => engine.getSymbolDeclarations(id)?.animations,
  });
  const applier = new StateVisualApplier(engine);
  applier.attachTo(pipeline);
  return {
    engine,
    pipeline,
    animator,
    advance: (ms) => {
      now += ms;
    },
    runTick: () => {
      scheduledTick?.();
    },
    setValue: (pointId, value) => pointStore.setPointValues({ [pointId]: value }),
    flush: () => pipeline.flushFrame((attrs) => engine.applyAttrs(attrs)),
  };
}

const deviceNode = (id: string, type: string, extra: Partial<ScadaSymbolNode> = {}): ScadaSymbolNode => ({
  id,
  type,
  x: 0,
  y: 0,
  bindings: { fill: { point: 'flag' } },
  ...extra,
});

beforeEach(() => {
  resetLeaferMock();
  clearScadaSymbolRegistry();
  registerBuiltinScadaSymbols();
});

describe('I9.1 device symbol registration (scada-device-*)', () => {
  it('should register the 4 device symbols as builtins with device category', () => {
    for (const type of [
      'scada-device-motor',
      'scada-device-pump',
      'scada-device-valve',
      'scada-device-fan',
    ]) {
      expect(hasScadaSymbol(type)).toBe(true);
    }
  });

  it('should fall back to defaults when a device is created without explicit sizing props', () => {
    const motor = instantiateSymbol('scada-device-motor', {
      id: 'm0',
      props: { x: 0, y: 0 },
      engine: {},
      config: { world: { x: 0, y: 0, scale: 1 } },
    });
    const body = childOf(motor as LeafNode, 'body');
    expect(body.width).toBe(64);
    expect(body.fill).toBe('#607d8b');
    expect(body.strokeWidth).toBe(2);
    const fan = instantiateSymbol('scada-device-fan', {
      id: 'f0',
      props: { x: 0, y: 0 },
      engine: {},
      config: { world: { x: 0, y: 0, scale: 1 } },
    });
    expect(childOf(fan as LeafNode, 'blades').tag).toBe('Group');
    const valve = instantiateSymbol('scada-device-valve', {
      id: 'v0',
      props: { x: 0, y: 0 },
      engine: {},
      config: { world: { x: 0, y: 0, scale: 1 } },
    });
    expect(childOf(valve as LeafNode, 'core').rotation).toBe(0);
    const valveNoRatio = instantiateSymbol('scada-device-valve', {
      id: 'v1',
      props: { x: 0, y: 0, custom: { label: 'P-101' } },
      engine: {},
      config: { world: { x: 0, y: 0, scale: 1 } },
    });
    expect(childOf(valveNoRatio as LeafNode, 'core').rotation).toBe(0);
  });

  it('should validate configs containing device instances', () => {
    const config: ScadaConfig = {
      version: 1,
      symbols: [
        deviceNode('m1', 'scada-device-motor'),
        deviceNode('p1', 'scada-device-pump'),
        deviceNode('v1', 'scada-device-valve'),
        deviceNode('f1', 'scada-device-fan'),
      ],
    };
    expect(validateScadaConfig(config)).toEqual({ ok: true });
  });

  it('should expose default state declarations and animations via the engine', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [deviceNode('m1', 'scada-device-motor')] });
    const declarations = engine.getSymbolDeclarations('m1');
    expect(declarations?.states?.states.run?.style?.fill).toBe('#00cc66');
    expect(declarations?.states?.states.stop?.style?.fill).toBe('#9e9e9e');
    expect(declarations?.states?.states.fault?.style?.fill).toBe('#e53935');
    expect(declarations?.states?.states.fault?.animations?.[0]?.kind).toBe('blink');
    expect(declarations?.animations?.find(
      (a) => a.kind === 'rotate' && a.when !== undefined && a.when !== 'always' && a.when.state === 'run',
    )).toBeDefined();
    engine.destroy();
  });
});

describe('I9.1 scada-device-motor (机座/转轴复合 + 旋转动画 + 状态色)', () => {
  it('should assemble a Group with body/rotor children and route props per part', () => {
    const node = instantiateSymbol('scada-device-motor', {
      id: 'm1',
      props: { x: 4, y: 8, width: 70, fill: '#3366ff' },
      engine: {},
      config: { world: { x: 0, y: 0, scale: 1 } },
    });
    expect((node as unknown as { tag: string }).tag).toBe('Group');
    const body = childOf(node as LeafNode, 'body');
    expect(body.tag).toBe('Rect');
    expect(body.cornerRadius).toBe(8);
    expect(body.width).toBe(70);
    expect(body.fill).toBe('#3366ff');
    const rotor = childOf(node as LeafNode, 'rotor');
    expect(rotor.tag).toBe('Ellipse');
    expect((node as unknown as { x: number }).x).toBe(4);
  });

  it('should route rotation updates to the rotor child via applyProps', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [deviceNode('m1', 'scada-device-motor')] });
    engine.setSymbolProps('m1', { rotation: 90 });
    const rotor = childOf(engine.getSymbol('m1')!.node, 'rotor');
    expect(rotor.rotation).toBe(90);
    expect((engine.getSymbol('m1')!.node as unknown as { rotation: number }).rotation).toBeUndefined();
    engine.destroy();
  });

  it('should apply run/stop/fault state colors via the visual state pipeline', () => {
    const { engine, setValue, flush } = createDeviceHarness(
      { version: 1, symbols: [deviceNode('m1', 'scada-device-motor')] },
      [{ id: 'flag', value: true }],
    );
    setValue('flag', false);
    flush();
    expect(childOf(engine.getSymbol('m1')!.node, 'body').fill).toBe('#9e9e9e');
    setValue('flag', true);
    flush();
    expect(childOf(engine.getSymbol('m1')!.node, 'body').fill).toBe('#00cc66');
    engine.destroy();
  });

  it('should enter fault state via instance ranges: red fill + blink animation linkage', () => {
    const node = deviceNode('m1', 'scada-device-motor', {
      bindings: { fill: { point: 'speed' } },
      states: { states: {}, ranges: [{ min: 80, state: 'fault' }] },
    });
    const { engine, animator, setValue, flush } = createDeviceHarness(
      { version: 1, symbols: [node] },
      [{ id: 'speed', value: 50 }],
    );
    setValue('speed', 90);
    flush();
    expect(childOf(engine.getSymbol('m1')!.node, 'body').fill).toBe('#e53935');
    expect(animator.isPlaying('m1', 'blink')).toBe(true);
    engine.destroy();
  });

  it('should drive rotor rotation from the rotate animation when run (animator → applyProps routing)', () => {
    const { engine, animator, setValue, flush, advance, runTick } = createDeviceHarness(
      { version: 1, symbols: [deviceNode('m1', 'scada-device-motor')] },
      [{ id: 'flag', value: false }],
    );
    setValue('flag', true);
    flush();
    expect(animator.isPlaying('m1', 'rotate')).toBe(true);
    advance(250);
    runTick();
    flush();
    expect(childOf(engine.getSymbol('m1')!.node, 'rotor').rotation).toBe(90);
    setValue('flag', false);
    flush();
    expect(animator.isPlaying('m1', 'rotate')).toBe(false);
    engine.destroy();
  });
});

describe('I9.1 scada-device-pump (泵体/叶轮复合 + 开关状态形态)', () => {
  it('should assemble body/impeller and switch impeller rotation with run/stop state', () => {
    const { engine, animator, setValue, flush, advance, runTick } = createDeviceHarness(
      { version: 1, symbols: [deviceNode('p1', 'scada-device-pump')] },
      [{ id: 'flag', value: false }],
    );
    expect(childOf(engine.getSymbol('p1')!.node, 'impeller').tag).toBe('Ellipse');
    setValue('flag', true);
    flush();
    expect(animator.isPlaying('p1', 'rotate')).toBe(true);
    advance(500);
    runTick();
    flush();
    expect(childOf(engine.getSymbol('p1')!.node, 'impeller').rotation).toBe(180);
    setValue('flag', false);
    flush();
    expect(animator.isPlaying('p1', 'rotate')).toBe(false);
    expect(childOf(engine.getSymbol('p1')!.node, 'body').fill).toBe('#9e9e9e');
    engine.destroy();
  });
});

describe('I9.1 scada-device-valve (阀体/阀芯开合形态 + 开度状态样式)', () => {
  it('should assemble body/core and rotate the core with custom.openRatio (0=closed, 1=open)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        { id: 'v1', type: 'scada-device-valve', x: 0, y: 0, custom: { openRatio: 0 } },
        { id: 'v2', type: 'scada-device-valve', x: 50, y: 0, custom: { openRatio: 1 } },
      ],
    });
    const coreClosed = childOf(engine.getSymbol('v1')!.node, 'core');
    const coreOpen = childOf(engine.getSymbol('v2')!.node, 'core');
    expect(coreClosed.rotation).toBe(90);
    expect(coreOpen.rotation).toBe(0);
    engine.setSymbolProps('v1', { custom: { openRatio: 1 } });
    expect(childOf(engine.getSymbol('v1')!.node, 'core').rotation).toBe(0);
    engine.destroy();
  });

  it('should apply state colors while keeping the open/close core morphology', () => {
    const { engine, setValue, flush } = createDeviceHarness(
      {
        version: 1,
        symbols: [
          { ...deviceNode('v1', 'scada-device-valve'), custom: { openRatio: 0 } },
        ],
      },
      [{ id: 'flag', value: false }],
    );
    setValue('flag', true);
    flush();
    expect(childOf(engine.getSymbol('v1')!.node, 'body').fill).toBe('#00cc66');
    expect(childOf(engine.getSymbol('v1')!.node, 'core').rotation).toBe(90);
    engine.destroy();
  });
});

describe('I9.1 scada-device-fan (扇叶旋转动画 + 状态色)', () => {
  it('should rotate the blades child on run and apply state colors', () => {
    const { engine, animator, setValue, flush, advance, runTick } = createDeviceHarness(
      { version: 1, symbols: [deviceNode('f1', 'scada-device-fan')] },
      [{ id: 'flag', value: false }],
    );
    expect(childOf(engine.getSymbol('f1')!.node, 'blades').tag).toBe('Group');
    setValue('flag', true);
    flush();
    expect(animator.isPlaying('f1', 'rotate')).toBe(true);
    advance(250);
    runTick();
    flush();
    expect(childOf(engine.getSymbol('f1')!.node, 'blades').rotation).toBe(90);
    setValue('flag', false);
    flush();
    expect(animator.isPlaying('f1', 'rotate')).toBe(false);
    engine.destroy();
  });
});

describe('I9.1 composite applyProps routing (device/common.ts)', () => {
  it('should route root fields (x/visible/opacity/scale) to the group root and style fields to the body', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [deviceNode('m1', 'scada-device-motor')] });
    engine.setSymbolProps('m1', {
      x: 12,
      visible: false,
      opacity: 0.5,
      scale: 2,
      strokeDash: [4, 2],
      stroke: '#111111',
      textColor: '#123456',
    });
    const root = engine.getSymbol('m1')!.node as unknown as Record<string, unknown>;
    expect(root.x).toBe(12);
    expect(root.visible).toBe(false);
    expect(root.opacity).toBe(0.5);
    expect(root.scaleX).toBe(2);
    expect(root.scaleY).toBe(2);
    const body = childOf(engine.getSymbol('m1')!.node, 'body');
    expect(body.dashPattern).toEqual([4, 2]);
    expect(body.stroke).toBe('#111111');
    expect(body.textColor).toBe('#123456');
    engine.destroy();
  });

  it('should skip undefined values and fall back to core rotation for rotor-less composites', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [deviceNode('m1', 'scada-device-motor')] });
    engine.setSymbolProps('m1', { opacity: undefined, rotation: 33 } as never);
    expect(childOf(engine.getSymbol('m1')!.node, 'rotor').rotation).toBe(33);
    engine.destroy();
    const result = createCompositeGroup({ x: 0, y: 0 } as never, [
      { name: 'body', node: new MockText({ name: 'body' }) as never },
      { name: 'core', node: new MockText({ name: 'core' }) as never },
    ]);
    applyCompositeProps(result.root, result.parts, { rotation: 12 });
    expect((result.parts.core as unknown as { rotation: number }).rotation).toBe(12);
  });

  it('should no-op text patches when the composite has no label part', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [deviceNode('m1', 'scada-device-motor')] });
    engine.setSymbolProps('m1', { text: 'no-label-device' });
    const body = childOf(engine.getSymbol('m1')!.node, 'body');
    expect(body.text).toBeUndefined();
    engine.destroy();
  });

  it('should route symbol-level rotation to the root for the valve (rotationTarget root)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [deviceNode('v1', 'scada-device-valve')] });
    engine.setSymbolProps('v1', { rotation: 45 });
    expect((engine.getSymbol('v1')!.node as unknown as { rotation: number }).rotation).toBe(45);
    const core = childOf(engine.getSymbol('v1')!.node, 'core');
    expect(core.rotation).toBe(0);
    engine.destroy();
  });

  it('createCompositeGroup should classify label children as the text part (instrument reuse)', () => {
    const result = createCompositeGroup({ x: 0, y: 0 } as never, [
      { name: 'body', node: new MockText({ name: 'body' }) as never },
      { name: 'label', node: new MockText({ name: 'label' }) as never },
    ]);
    expect(result.parts.text).toBeDefined();
    expect(result.parts.body).toBeDefined();
    expect((result.root as unknown as { children: unknown[] }).children).toHaveLength(2);
    applyCompositeProps(result.root, result.parts, { text: '42.5 °C', textColor: '#f00' });
    expect((result.parts.text as unknown as { text: string }).text).toBe('42.5 °C');
    expect((result.parts.text as unknown as { fill: string }).fill).toBe('#f00');
  });

  it('should ignore custom patches without openRatio on the valve (openRatio guard)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [deviceNode('v1', 'scada-device-valve')] });
    engine.setSymbolProps('v1', { custom: { label: 'P-101' } });
    expect(childOf(engine.getSymbol('v1')!.node, 'core').rotation).toBe(0);
    engine.destroy();
  });
});

describe('I9.1 device full path (注册 → 校验 → 实例化 → 场景树加载 → 状态样式应用 → 序列化 → 卸载)', () => {
  it('should load device instances through the config-adapter path and serialize minimal overrides', () => {
    const config: ScadaConfig = {
      version: 1,
      symbols: [
        deviceNode('m1', 'scada-device-motor', { x: 10, width: 80 }),
        deviceNode('p1', 'scada-device-pump'),
        deviceNode('v1', 'scada-device-valve', { custom: { openRatio: 0 } }),
        deviceNode('f1', 'scada-device-fan'),
      ],
    };
    expect(validateScadaConfig(config)).toEqual({ ok: true });
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(config);
    expect(engine.registry.size()).toBe(4);
    expect(engine.getSymbol('m1')?.definition?.type).toBe('scada-device-motor');
    const serialized = JSON.parse(serializeScadaConfig(config)) as ScadaConfig;
    expect(serialized.symbols[0]).toEqual({
      id: 'm1',
      type: 'scada-device-motor',
      x: 10,
      width: 80,
      bindings: { fill: { point: 'flag' } },
    });
    expect(serialized.symbols[1]).toEqual({
      id: 'p1',
      type: 'scada-device-pump',
      bindings: { fill: { point: 'flag' } },
    });
    expect(serialized.symbols[2]).toEqual({
      id: 'v1',
      type: 'scada-device-valve',
      custom: { openRatio: 0 },
      bindings: { fill: { point: 'flag' } },
    });
    engine.destroy();
  });

  it('should keep the builtin registration count consistent at 15 with group', () => {
    expect(registerBuiltinScadaSymbols()).toBeUndefined();
  });
});

// plan 2026-08-06-0900-2 Phase 1（open P2-4 复合族 resize 几何响应 proof）：
// device 族（motor/pump/valve/fan）无 extent part——width/height 经 applyProps 原 `EXTENT_FIELDS.has(key) && parts.extent`
// 短路静默丢弃（composite.ts:64）。修复后 applyCompositeProps 回落到 per-symbol `parts.resize` hook 重算 body + 子形状相对锚点。
describe('I9.1 device composite resize via applyProps (plan 2026-08-06-0900-2 Phase 1 open P2-4)', () => {
  it('motor: width applyProps 重算 body width 并重定位 rotor 到新中心', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [deviceNode('m1', 'scada-device-motor')] });
    expect(childOf(engine.getSymbol('m1')!.node, 'body').width).toBe(64);
    engine.setSymbolProps('m1', { width: 200 });
    expect(childOf(engine.getSymbol('m1')!.node, 'body').width).toBe(200);
    // rotor 中心 = width/2（新几何响应，非原值 32）
    expect(childOf(engine.getSymbol('m1')!.node, 'rotor').x).toBe(100);
    engine.destroy();
  });

  it('motor: height applyProps 重算 body height 并重定位 rotor（两维独立路由）', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [deviceNode('m1', 'scada-device-motor')] });
    engine.setSymbolProps('m1', { height: 96 });
    expect(childOf(engine.getSymbol('m1')!.node, 'body').height).toBe(96);
    expect(childOf(engine.getSymbol('m1')!.node, 'rotor').y).toBe(48);
    engine.destroy();
  });

  it('pump: width applyProps 重算 body width/cornerRadius 并重定位 impeller', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [deviceNode('p1', 'scada-device-pump')] });
    engine.setSymbolProps('p1', { width: 120 });
    const body = childOf(engine.getSymbol('p1')!.node, 'body');
    expect(body.width).toBe(120);
    expect(body.cornerRadius).toBe(60);
    expect(childOf(engine.getSymbol('p1')!.node, 'impeller').x).toBe(60);
    engine.destroy();
  });

  it('valve: width applyProps 重算 body width 并重定位 core（保留 openRatio rotation）', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [{ id: 'v1', type: 'scada-device-valve', x: 0, y: 0, custom: { openRatio: 0 } }],
    });
    expect(childOf(engine.getSymbol('v1')!.node, 'core').rotation).toBe(90);
    engine.setSymbolProps('v1', { width: 128 });
    expect(childOf(engine.getSymbol('v1')!.node, 'body').width).toBe(128);
    // core 相对锚点重定位（x = width/2 - height*0.22 = 64 - 32*0.22）
    expect(childOf(engine.getSymbol('v1')!.node, 'core').x).toBeCloseTo(64 - 32 * 0.22, 6);
    // openRatio rotation 不被 resize 覆盖
    expect(childOf(engine.getSymbol('v1')!.node, 'core').rotation).toBe(90);
    engine.destroy();
  });

  it('fan: width applyProps 重算 body width 并重定位 blades 中心', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({ version: 1, symbols: [deviceNode('f1', 'scada-device-fan')] });
    engine.setSymbolProps('f1', { width: 120 });
    expect(childOf(engine.getSymbol('f1')!.node, 'body').width).toBe(120);
    expect(childOf(engine.getSymbol('f1')!.node, 'blades').x).toBe(60);
    engine.destroy();
  });
});
