import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../register-builtin.js';
import { clearScadaSymbolRegistry, hasScadaSymbol } from '../symbol-registry.js';
import { ScadaCanvasEngine } from '../../engine/scada-engine.js';
import { PointStore } from '../../binding/point-store.js';
import { ReverseIndex } from '../../binding/reverse-index.js';
import { DirtyCollector } from '../../binding/dirty-collector.js';
import { RefreshPipeline } from '../../binding/refresh-pipeline.js';
import { Animator } from '../../binding/animator.js';
import { validateScadaConfig } from '../../serialization/validate.js';
import { serializeScadaConfig } from '../../serialization/serialize.js';
import { diffScadaConfig } from '../../serialization/diff.js';
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

const stubOf = (root: LeafNode, index: number): Record<string, unknown> => {
  const list = childrenOf(root).filter((child) => (child.name as string)?.startsWith('stub-'));
  if (!list[index]) throw new Error(`stub ${index} not found`);
  return list[index];
};

const junctionNode = (id: string, extra: Partial<ScadaSymbolNode> = {}): ScadaSymbolNode => ({
  id,
  type: 'scada-pipe-junction',
  x: 0,
  y: 0,
  ...extra,
});

interface PipeHarness {
  engine: ScadaCanvasEngine;
  animator: Animator;
  setValue: (pointId: string, value: number | boolean | string) => void;
  flush: () => void;
}

function createPipeHarness(config: ScadaConfig, points: Array<{ id: string; value: number | boolean | string }>): PipeHarness {
  const engine = ScadaCanvasEngine.create({ container: makeContainer() });
  engine.reset(config);
  const pointStore = new PointStore();
  pointStore.loadDeclarations(points.map((p) => ({ id: p.id, source: 'static' as const, value: p.value })));
  const collector = new DirtyCollector({ scheduleTick: () => () => {} });
  const animator = new Animator({
    now: () => 0,
    scheduleTick: () => () => {},
    collect: (entry) => collector.collect(entry),
  });
  const pipeline = new RefreshPipeline({
    pointStore,
    reverseIndex: new ReverseIndex(config.symbols),
    collector,
    animator,
    getStates: (id) => engine.getSymbolDeclarations(id)?.states,
    getAnimations: (id) => engine.getSymbolDeclarations(id)?.animations,
  });
  return {
    engine,
    animator,
    setValue: (pointId, value) => pointStore.setPointValues({ [pointId]: value }),
    flush: () => pipeline.flushFrame((attrs) => engine.applyAttrs(attrs)),
  };
}

beforeEach(() => {
  resetLeaferMock();
  clearScadaSymbolRegistry();
  registerBuiltinScadaSymbols();
});

describe('I9.4 scada-pipe-junction (连接点 + 流动方向动画 + 与设备连接语义)', () => {
  it('should register scada-pipe-junction as a pipe builtin', () => {
    expect(hasScadaSymbol('scada-pipe-junction')).toBe(true);
  });

  it('should validate configs with connection point declarations', () => {
    const config: ScadaConfig = {
      version: 1,
      symbols: [
        junctionNode('j1', {
          custom: {
            connections: [
              { id: 'a', x: 0, y: 0.5, direction: 'in' },
              { id: 'b', x: 1, y: 0.5, direction: 'out', target: 'motor-1' },
            ],
          },
        }),
      ],
    };
    expect(validateScadaConfig(config)).toEqual({ ok: true });
  });

  it('should render a pipe stub per declared connection point with direction arrows', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        junctionNode('j1', {
          custom: {
            connections: [
              { id: 'in-1', x: 0, y: 0.5, direction: 'in' },
              { id: 'out-1', x: 1, y: 0.5, direction: 'out' },
              { id: 'bi-1', x: 0.5, y: 0, direction: 'bidirectional' },
            ],
          },
        }),
      ],
    });
    expect(stubOf(engine.getSymbol('j1')!.node, 0).tag).toBe('Line');
    expect(stubOf(engine.getSymbol('j1')!.node, 0).endArrow).toBeUndefined();
    expect(stubOf(engine.getSymbol('j1')!.node, 1).endArrow).toBe(true);
    expect(stubOf(engine.getSymbol('j1')!.node, 2).endArrow).toBe(true);
    engine.destroy();
  });

  it('should apply flow parameters incrementally via applyProps (gate-3-review §10 归属兑现)', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        junctionNode('j1', {
          custom: { connections: [{ id: 'a', x: 0, y: 0.5, direction: 'in' }] },
        }),
      ],
    });
    engine.setSymbolProps('j1', { flow: { enabled: true, speed: 1, dash: [6, 4] } });
    expect(stubOf(engine.getSymbol('j1')!.node, 0).dashPattern).toEqual([6, 4]);
    engine.setSymbolProps('j1', { dashOffset: 25 });
    expect(stubOf(engine.getSymbol('j1')!.node, 0).dashOffset).toBe(25);
    engine.setSymbolProps('j1', { flow: { enabled: false, speed: 0 } });
    expect(stubOf(engine.getSymbol('j1')!.node, 0).dashPattern).toEqual([]);
    engine.destroy();
  });

  it('should animate the dash offset through the animator flow kind when run', () => {
    const { engine, animator, setValue, flush } = createPipeHarness(
      {
        version: 1,
        symbols: [
          junctionNode('j1', {
            bindings: { fill: { point: 'flag' } },
            custom: { connections: [{ id: 'a', x: 0, y: 0.5, direction: 'in' }] },
            flow: { enabled: true, speed: 1, dash: [10, 6] },
          }),
        ],
      },
      [{ id: 'flag', value: false }],
    );
    setValue('flag', true);
    flush();
    expect(animator.isPlaying('j1', 'flow')).toBe(true);
    const stub = stubOf(engine.getSymbol('j1')!.node, 0);
    expect(stub.dashPattern).toEqual([10, 6]);
    setValue('flag', false);
    flush();
    expect(animator.isPlaying('j1', 'flow')).toBe(false);
    engine.destroy();
  });

  it('should fall back to the default dash pattern when flow is enabled without dash', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        junctionNode('j1', {
          flow: { enabled: true, speed: 1 },
          custom: { connections: [{ id: 'a', x: 0, y: 0.5, direction: 'in' }] },
        }),
      ],
    });
    expect(stubOf(engine.getSymbol('j1')!.node, 0).dashPattern).toEqual([10, 6]);
    engine.destroy();
  });

  it('should ignore non-flow patches in the stub update loop', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [junctionNode('j1', { custom: { connections: [{ id: 'a', x: 0, y: 0.5, direction: 'in' }] } })],
    });
    engine.setSymbolProps('j1', { custom: { label: 'J-01' } });
    expect(stubOf(engine.getSymbol('j1')!.node, 0).dashPattern).toBeUndefined();
    engine.destroy();
  });

  // plan 2026-08-06-0900-2 Phase 2（open P2-8 pipe-junction stub strokeWidth proof）：
  // pipe-junction.ts:85 stubs 硬编码 strokeWidth:4 且 applyProps 不路由 → strokeWidth 变更加粗 body 但 stubs 留细。
  // 修复后 stub strokeWidth 从 props.strokeWidth ?? 4 派生 + applyProps 路由 strokeWidth 到 stubs（body/stub 一致）。
  describe('scada-pipe-junction stub strokeWidth follows props.strokeWidth (plan 2026-08-06-0900-2 Phase 2 open P2-8)', () => {
    it('create 时 stub strokeWidth 从 props.strokeWidth 派生（非硬编码 4）', () => {
      const engine = ScadaCanvasEngine.create({ container: makeContainer() });
      engine.reset({
        version: 1,
        symbols: [
          junctionNode('j1', {
            strokeWidth: 10,
            custom: { connections: [{ id: 'a', x: 0, y: 0.5, direction: 'in' }] },
          }),
        ],
      });
      expect(stubOf(engine.getSymbol('j1')!.node, 0).strokeWidth).toBe(10);
      engine.destroy();
    });

    it('applyProps 路由 strokeWidth 到 stubs（body/stub 粗细一致）', () => {
      const engine = ScadaCanvasEngine.create({ container: makeContainer() });
      engine.reset({
        version: 1,
        symbols: [junctionNode('j1', { custom: { connections: [{ id: 'a', x: 0, y: 0.5, direction: 'in' }] } })],
      });
      // 默认 strokeWidth=6 → stub 派生 6（非硬编码 4）
      expect(stubOf(engine.getSymbol('j1')!.node, 0).strokeWidth).toBe(6);
      engine.setSymbolProps('j1', { strokeWidth: 12 });
      expect(stubOf(engine.getSymbol('j1')!.node, 0).strokeWidth).toBe(12);
      // body 同步加粗（经 applyCompositeProps 路由 strokeWidth→body）
      expect(childOf(engine.getSymbol('j1')!.node, 'body').strokeWidth).toBe(12);
      engine.destroy();
    });
  });

  // plan 2026-08-08-1121 HCA6 P2-1（HCA5 P3-2 复核升级）：
  // pipe-junction applyProps 调 applyCompositeProps 传 parts 无 extent/resize → width/height 静默丢弃。
  // setSymbolProps / width 绑定改尺寸时 body 不 resize、stubs 不重算 → 接头几何 stuck 在 create-time 尺寸。
  // 修复后 width/height 重算 body 尺寸 + 各 stub points（按 connection 归一化坐标 × 新尺寸派生）。
  describe('scada-pipe-junction width/height resize (plan 2026-08-08-1121 HCA6 P2-1)', () => {
    it('setSymbolProps width/height 重算 body 尺寸 + stubs points（非静默丢弃）', () => {
      const engine = ScadaCanvasEngine.create({ container: makeContainer() });
      engine.reset({
        version: 1,
        symbols: [
          junctionNode('j1', {
            width: 80,
            height: 40,
            custom: {
              connections: [
                { id: 'a', x: 0, y: 0.5, direction: 'in' },
                { id: 'b', x: 1, y: 0.5, direction: 'out' },
              ],
            },
          }),
        ],
      });
      // create-time baseline：centerX=40/centerY=20
      // stub a (x=0,y=0.5): points [0,0, 0*80-40, 0.5*40-20] = [0,0,-40,0]
      // stub b (x=1,y=0.5): points [0,0, 1*80-40, 0.5*40-20] = [0,0,40,0]
      expect(stubOf(engine.getSymbol('j1')!.node, 0).points).toEqual([0, 0, -40, 0]);
      expect(stubOf(engine.getSymbol('j1')!.node, 1).points).toEqual([0, 0, 40, 0]);
      expect(childOf(engine.getSymbol('j1')!.node, 'body').width).toBe(80);
      expect(childOf(engine.getSymbol('j1')!.node, 'body').height).toBe(40);

      // resize 160×80：centerX=80/centerY=40
      engine.setSymbolProps('j1', { width: 160, height: 80 });
      // body resize
      expect(childOf(engine.getSymbol('j1')!.node, 'body').width).toBe(160);
      expect(childOf(engine.getSymbol('j1')!.node, 'body').height).toBe(80);
      // stub a: points [0,0, 0*160-80, 0.5*80-40] = [0,0,-80,0]
      expect(stubOf(engine.getSymbol('j1')!.node, 0).points).toEqual([0, 0, -80, 0]);
      // stub b: points [0,0, 1*160-80, 0.5*80-40] = [0,0,80,0]
      expect(stubOf(engine.getSymbol('j1')!.node, 1).points).toEqual([0, 0, 80, 0]);
      engine.destroy();
    });

    it('单维 width 变更保留既有 height 重算 body + stubs', () => {
      const engine = ScadaCanvasEngine.create({ container: makeContainer() });
      engine.reset({
        version: 1,
        symbols: [
          junctionNode('j1', {
            width: 80,
            height: 40,
            custom: { connections: [{ id: 'a', x: 1, y: 0.5, direction: 'out' }] },
          }),
        ],
      });
      engine.setSymbolProps('j1', { width: 160 });
      expect(childOf(engine.getSymbol('j1')!.node, 'body').width).toBe(160);
      expect(childOf(engine.getSymbol('j1')!.node, 'body').height).toBe(40);
      // centerX=80/centerY=20；stub a (x=1,y=0.5): points [0,0, 1*160-80, 0.5*40-20] = [0,0,80,0]
      expect(stubOf(engine.getSymbol('j1')!.node, 0).points).toEqual([0, 0, 80, 0]);
      engine.destroy();
    });
  });

  it('should validate the flow parameter shape', () => {
    const base = { id: 'j1', type: 'scada-pipe-junction', x: 0, y: 0, custom: { connections: [] } };
    expect(validateScadaConfig({ version: 1, symbols: [base] })).toEqual({ ok: true });
    expect(
      validateScadaConfig({ version: 1, symbols: [{ ...base, flow: { enabled: true, speed: 1, dash: [6, 4] } }] }).ok,
    ).toBe(true);
    expect(validateScadaConfig({ version: 1, symbols: [{ ...base, flow: 'fast' }] }).ok).toBe(false);
    expect(
      validateScadaConfig({ version: 1, symbols: [{ ...base, flow: { enabled: 'yes', speed: 1 } }] }).ok,
    ).toBe(false);
    expect(
      validateScadaConfig({ version: 1, symbols: [{ ...base, flow: { enabled: true, speed: 'fast' } }] }).ok,
    ).toBe(false);
    expect(
      validateScadaConfig({ version: 1, symbols: [{ ...base, flow: { enabled: true, speed: 1, dash: [6] } }] }).ok,
    ).toBe(true);
  });

  it('should serialize the connection relationship declarations (custom passthrough)', () => {
    const config: ScadaConfig = {
      version: 1,
      symbols: [
        junctionNode('j1', {
          custom: {
            connections: [
              { id: 'a', x: 0, y: 0.5, direction: 'in' },
              { id: 'b', x: 1, y: 0.5, direction: 'out', target: 'motor-1' },
            ],
          },
        }),
      ],
    };
    expect(validateScadaConfig(config)).toEqual({ ok: true });
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(config);
    expect(engine.getSymbol('j1')?.definition?.type).toBe('scada-pipe-junction');
    engine.destroy();
    const serialized = JSON.parse(serializeScadaConfig(config)) as ScadaConfig;
    expect(serialized.symbols[0]).toEqual({
      id: 'j1',
      type: 'scada-pipe-junction',
      custom: {
        connections: [
          { id: 'a', x: 0, y: 0.5, direction: 'in' },
          { id: 'b', x: 1, y: 0.5, direction: 'out', target: 'motor-1' },
        ],
      },
    });
  });
});

// plan 2026-08-05-0653-2 Phase 2（open P1-1 集成层 proof）：
// diffScadaConfig 产出的 flow patch 经 engine.applyDiff → pipe-junction.applyProps 路径贯通，
// 管道流动动画按新 enabled 开/关（Failure Paths `flow-toggle-ignored`）。
describe('scada-pipe-junction flow diff→applyDiff 链路 (plan 2026-08-05-0653-2 Phase 2 integration)', () => {
  it('applyDiff 携带 flow patch 时，pipe-junction stub 的 dashPattern 按新 flow.enabled 切换', () => {
    const prev: ScadaConfig = {
      version: 1,
      symbols: [
        junctionNode('j1', {
          custom: { connections: [{ id: 'a', x: 0, y: 0.5, direction: 'in' }] },
          flow: { enabled: true, speed: 1, dash: [6, 4] },
        }),
      ],
    };
    const next: ScadaConfig = {
      version: 1,
      symbols: [
        junctionNode('j1', {
          custom: { connections: [{ id: 'a', x: 0, y: 0.5, direction: 'in' }] },
          flow: { enabled: false, speed: 1, dash: [6, 4] },
        }),
      ],
    };
    const diff = diffScadaConfig(prev, next);
    // 集成断言 1：diff 产出含 flow 的 patch（P1-1 修复点）
    expect(diff.updated).toEqual([
      { id: 'j1', patch: { flow: { enabled: false, speed: 1, dash: [6, 4] } } },
    ]);

    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(prev);
    // 初态：flow.enabled=true → stub dashPattern = [6, 4]
    expect(stubOf(engine.getSymbol('j1')!.node, 0).dashPattern).toEqual([6, 4]);

    // 集成断言 2：applyDiff 携带 flow patch → pipe-junction.applyProps 收到新 flow
    // → flowPatch(enabled:false) 写 dashPattern: []（流动关闭）
    engine.applyDiff(diff, next);
    expect(stubOf(engine.getSymbol('j1')!.node, 0).dashPattern).toEqual([]);
    engine.destroy();
  });

  it('applyDiff 携带 flow.dash 变更时，pipe-junction stub 的 dashPattern 切到新 dash 序列', () => {
    const prev: ScadaConfig = {
      version: 1,
      symbols: [
        junctionNode('j1', {
          custom: { connections: [{ id: 'a', x: 0, y: 0.5, direction: 'in' }] },
          flow: { enabled: true, speed: 1, dash: [6, 4] },
        }),
      ],
    };
    const next: ScadaConfig = {
      version: 1,
      symbols: [
        junctionNode('j1', {
          custom: { connections: [{ id: 'a', x: 0, y: 0.5, direction: 'in' }] },
          flow: { enabled: true, speed: 1, dash: [12, 8] },
        }),
      ],
    };
    const diff = diffScadaConfig(prev, next);
    expect(diff.updated[0]!.patch.flow).toEqual({ enabled: true, speed: 1, dash: [12, 8] });

    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset(prev);
    expect(stubOf(engine.getSymbol('j1')!.node, 0).dashPattern).toEqual([6, 4]);
    engine.applyDiff(diff, next);
    expect(stubOf(engine.getSymbol('j1')!.node, 0).dashPattern).toEqual([12, 8]);
    engine.destroy();
  });
});
