import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from './register-builtin.js';
import { clearScadaSymbolRegistry } from './symbol-registry.js';
import { ScadaCanvasEngine } from '../engine/scada-engine.js';
import { PointStore } from '../binding/point-store.js';
import { ReverseIndex } from '../binding/reverse-index.js';
import { DirtyCollector } from '../binding/dirty-collector.js';
import { RefreshPipeline } from '../binding/refresh-pipeline.js';
import { Animator } from '../binding/animator.js';
import { StateVisualApplier } from './visual-state.js';
import { InteractionOverlay, INTERACTION_STYLE_PRESETS } from '../engine/interaction-overlay.js';
import type { ScadaConfig, ScadaSymbolNode } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const makeContainer = () => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 600, configurable: true });
  return el;
};

const pumpNode = (): ScadaSymbolNode => ({
  id: 'pump',
  type: 'scada-rect',
  x: 10,
  y: 20,
  width: 60,
  height: 40,
  bindings: { rotation: { point: 'flag' } },
  states: {
    states: {
      run: { style: { fill: '#00aa00' } },
      fault: { style: { fill: '#ff0000' } },
      stop: {},
    },
    valueMap: { 0: 'run', 1: 'fault', 2: 'stop' },
  },
  animations: [{ kind: 'blink', period: 500, when: { state: 'fault' } }],
});

interface Harness {
  engine: ScadaCanvasEngine;
  pipeline: RefreshPipeline;
  animator: Animator;
  applier: StateVisualApplier;
  setFlag: (value: number) => void;
  flush: () => void;
}

function createHarness(config: ScadaConfig, options?: { attach?: boolean }): Harness {
  const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
  engine.reset(config);
  const pointStore = new PointStore();
  pointStore.loadDeclarations([{ id: 'flag', source: 'static', value: 0 }]);
  const reverseIndex = new ReverseIndex(config.symbols);
  const collector = new DirtyCollector({ scheduleTick: () => () => {} });
  const animator = new Animator({ now: () => 0, scheduleTick: () => () => {} });
  const pipeline = new RefreshPipeline({
    pointStore,
    reverseIndex,
    collector,
    animator,
    getStates: (id) => engine.getConfigNode(id)?.states,
    getAnimations: (id) => engine.getConfigNode(id)?.animations,
  });
  const applier = new StateVisualApplier(engine);
  if (options?.attach !== false) {
    applier.attachTo(pipeline);
  }
  return {
    engine,
    pipeline,
    animator,
    applier,
    setFlag: (value) => pointStore.setPointValues({ flag: value }),
    flush: () => pipeline.flushFrame((attrs) => engine.applyAttrs(attrs)),
  };
}

beforeEach(() => {
  resetLeaferMock();
  clearScadaSymbolRegistry();
  registerBuiltinScadaSymbols();
});

describe('StateVisualApplier (I8.2 视觉状态应用，消费 I6.3 状态机输出)', () => {
  it('should apply the state style patch computed via resolveSymbolStyle onto the engine node', () => {
    const { engine, setFlag, flush } = createHarness({ version: 1, symbols: [pumpNode()] });
    setFlag(1);
    flush();
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ff0000');
    engine.destroy();
  });

  it('should restore the normal style when exiting a state', () => {
    const { engine, setFlag, flush } = createHarness({ version: 1, symbols: [pumpNode()] });
    setFlag(1);
    flush();
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ff0000');
    setFlag(0);
    flush();
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#00aa00');
    engine.destroy();
  });

  it('should restore instance/default styles when entering a state without a style patch', () => {
    const { engine, setFlag, flush } = createHarness({ version: 1, symbols: [pumpNode()] });
    setFlag(1);
    flush();
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ff0000');
    setFlag(2);
    flush();
    // stop 状态无 style → 恢复 base（defaults fill #ffffff）
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ffffff');
    engine.destroy();
  });

  it('visible:false from a state style should set node visible instead of removing the node', () => {
    const node: ScadaSymbolNode = {
      ...pumpNode(),
      states: {
        states: { run: { style: { visible: false } }, fault: {} },
        valueMap: { 0: 'run', 1: 'fault' },
      },
    };
    const { engine, setFlag, flush } = createHarness({ version: 1, symbols: [node] });
    setFlag(0);
    flush();
    expect((engine.getSymbolProps('pump') as { visible?: boolean }).visible).toBe(false);
    expect(engine.registry.has('pump')).toBe(true);
    setFlag(1);
    flush();
    expect((engine.getSymbolProps('pump') as { visible?: boolean }).visible).toBe(true);
    engine.destroy();
  });

  it('should stop applying after unsubscribe', () => {
    const { engine, pipeline, setFlag, flush } = createHarness({ version: 1, symbols: [pumpNode()] }, { attach: false });
    const applier = new StateVisualApplier(engine);
    const unsubscribe = applier.attachTo(pipeline);
    setFlag(1);
    flush();
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ff0000');
    unsubscribe();
    setFlag(2);
    flush();
    // 退订后不跟随：stop 状态无 style → 联动层无 patch 且本层退订 → fill 保持 fault 红（无 revert）
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ff0000');
    engine.destroy();
  });

  it('should run fault→blink linkage end-to-end and stop on exit (消费 I6.3 animator，不重复实现)', () => {
    const { engine, animator, setFlag, flush } = createHarness({ version: 1, symbols: [pumpNode()] });
    setFlag(0);
    flush();
    expect(animator.isPlaying('pump', 'blink')).toBe(false);
    setFlag(1);
    flush();
    expect(animator.isPlaying('pump', 'blink')).toBe(true);
    setFlag(0);
    flush();
    expect(animator.isPlaying('pump', 'blink')).toBe(false);
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#00aa00');
    engine.destroy();
  });

  it('should keep interaction states (hover/press/selected/disabled) layered apart from business states', () => {
    const { engine, setFlag, flush } = createHarness({ version: 1, symbols: [pumpNode()] });
    const overlay = engine.interactionOverlay as InteractionOverlay;
    expect(overlay).toBeDefined();
    overlay.highlight('pump', INTERACTION_STYLE_PRESETS.selected);
    expect(overlay.activeCount).toBe(1);
    setFlag(1);
    flush();
    // 业务状态写图元节点（fill 红），交互覆盖物独立在 sky 层（高亮描边）——互不冲突
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ff0000');
    expect(overlay.activeCount).toBe(1);
    overlay.clear();
    expect(overlay.activeCount).toBe(0);
    engine.destroy();
  });

  it('should no-op for unknown or definition-less (group) symbols', () => {
    const { engine, applier, setFlag, flush } = createHarness({
      version: 1,
      symbols: [
        pumpNode(),
        { id: 'g', type: 'scada-group', x: 0, y: 0, children: [{ id: 'inner', type: 'scada-rect', x: 0, y: 0 }] },
      ],
    });
    applier.applyState('nope', 'fault');
    applier.applyState('g', 'fault');
    setFlag(1);
    flush();
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ff0000');
    engine.destroy();
  });

  it('should revert shadow on state exit (reset default covers fields without a base value)', () => {
    // plan 2026-08-05-2129-3 Phase 4（open P1-1）：翻转既有缺陷测试。修复前 STYLE_RESET_DEFAULTS 缺 shadow
    // → base 无 shadow 时 revert=undefined → 既不 collect 也不 applied.delete → 报警辉光永久残留 + applied 泄漏。
    // 该测试此前把缺陷断言为预期（退出 fault 后 shadow 残留）。翻转后：退出 fault → shadow 被清除（reset default）。
    const node: ScadaSymbolNode = {
      ...pumpNode(),
      states: {
        states: {
          run: {},
          fault: { style: { shadow: { x: 0, y: 0, blur: 4, color: '#ff0000' } } },
        },
        valueMap: { 0: 'run', 1: 'fault' },
      },
    };
    const { engine, setFlag, flush } = createHarness({ version: 1, symbols: [node] });
    setFlag(1);
    flush();
    expect((engine.getSymbolProps('pump') as { shadow?: unknown }).shadow).toEqual({
      x: 0,
      y: 0,
      blur: 4,
      color: '#ff0000',
    });
    setFlag(0);
    flush();
    // 修复后：退出 fault → shadow 清除为 reset default（零效 shadow：blur:0 + transparent），非永久残留
    expect((engine.getSymbolProps('pump') as { shadow?: unknown }).shadow).toEqual({
      x: 0,
      y: 0,
      blur: 0,
      color: 'transparent',
    });
    setFlag(1);
    flush();
    // 重入 fault → shadow 再次应用（applied 集未泄漏，revert 后可重新覆盖）
    expect((engine.getSymbolProps('pump') as { shadow?: unknown }).shadow).toEqual({
      x: 0,
      y: 0,
      blur: 4,
      color: '#ff0000',
    });
    engine.destroy();
  });
});

// plan 2026-08-04-2243-1 Phase 3 W3：状态样式写入单一合帧 owner。
// 裁定：active-state 样式 owner = collectStates（脏收集批量写）；revert owner = StateVisualApplier
// （经 collector.collect 汇入同一帧尾 flush）。两模块对同字段同帧不再并发写。
// Proof：alarm-storm（多图元同帧状态切换）engine.applyAttrs 调用次数 ≤ 帧数（合帧），而非 N+1。
describe('StateVisualApplier 状态样式合帧 owner (plan 2026-08-04-2243-1 Phase 3 W3)', () => {
  it('alarm-storm：多图元同帧切换状态 → engine.applyAttrs 恰好 1 次/帧（active 由 collectStates 合帧，revert 经 collector 合帧）', () => {
    const N = 6;
    const symbols: ScadaSymbolNode[] = [];
    for (let i = 0; i < N; i++) {
      symbols.push({
        id: `s${i}`,
        type: 'scada-rect',
        x: 0,
        y: 0,
        bindings: { fill: { point: `flag-${i}` } },
        states: {
          states: {
            run: { style: { fill: '#00aa00' } },
            fault: { style: { fill: '#ff0000' } },
            off: {},
          },
          valueMap: { 0: 'run', 1: 'fault', 2: 'off' },
        },
      });
    }
    const config: ScadaConfig = { version: 1, symbols };
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset(config);
    const pointStore = new PointStore();
    const declarations = symbols.map((_, i) => ({ id: `flag-${i}`, source: 'static' as const, value: 0 }));
    pointStore.loadDeclarations(declarations);
    const reverseIndex = new ReverseIndex(config.symbols);
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      getStates: (id) => engine.getConfigNode(id)?.states,
      getAnimations: (id) => engine.getConfigNode(id)?.animations,
    });
    // W3 关键：visual-state 传入 collector → revert 经脏收集合帧（非 immediate applyAttrs）
    new StateVisualApplier(engine, collector).attachTo(pipeline);

    const applyAttrsSpy = vi.spyOn(engine, 'applyAttrs');
    const flush = () => pipeline.flushFrame((attrs) => engine.applyAttrs(attrs));

    // 帧 1：全量首同步，N 个图元进入 run（active-state 样式由 collectStates 批量写）
    flush();
    // 单一合帧 owner：N 个图元的状态切换收敛为 1 次 engine.applyAttrs（而非 N+1：N immediate + 1 flush）
    expect(applyAttrsSpy).toHaveBeenCalledTimes(1);
    const frame1Arg = applyAttrsSpy.mock.calls[0][0] as Record<string, Record<string, unknown>>;
    expect(Object.keys(frame1Arg).length).toBe(N);
    for (let i = 0; i < N; i++) {
      expect(frame1Arg[`s${i}`]?.fill).toBe('#00aa00');
    }
    applyAttrsSpy.mockClear();

    // 帧 2：全部 run → fault（active 切换，仍由 collectStates 合帧）
    for (let i = 0; i < N; i++) pointStore.setPointValue(`flag-${i}`, 1);
    flush();
    expect(applyAttrsSpy).toHaveBeenCalledTimes(1);
    const frame2Arg = applyAttrsSpy.mock.calls[0][0] as Record<string, Record<string, unknown>>;
    for (let i = 0; i < N; i++) {
      expect(frame2Arg[`s${i}`]?.fill).toBe('#ff0000');
    }
    applyAttrsSpy.mockClear();

    // 帧 3：全部 fault → off（off 无 style，revert 由 visual-state 经 collector 合帧，仍 1 次 applyAttrs）
    for (let i = 0; i < N; i++) pointStore.setPointValue(`flag-${i}`, 2);
    flush();
    // revert 也合帧：N 个退出恢复收敛为 1 次 engine.applyAttrs（修复前 visual-state 会 N 次 immediate）
    expect(applyAttrsSpy).toHaveBeenCalledTimes(1);
    // plan 2026-08-05-0653-2 Phase 4（multi P1-1 failing-first）：binding+state-style 同字段图元
    // alarm→unstyled 退出时，引擎应停在 binding 解析值（如同帧 collectBindings 写入值）。
    // 修复前：revert 经 collector.collect 覆盖同帧 collectBindings 写入的 binding 值
    // （pending Map last-write-wins），引擎停在 base/reset 空值（''）。修复后：revert 跳过有 binding
    // 的字段，binding 值胜出。每个 symbol 的 binding `fill: { point: 'flag-i' }` 解析为 flag-i 的原值 2。
    const frame3Arg = applyAttrsSpy.mock.calls[0][0] as Record<string, Record<string, unknown>>;
    for (let i = 0; i < N; i++) {
      expect(frame3Arg[`s${i}`]?.fill).toBe(2);
    }
    applyAttrsSpy.mockRestore();
    engine.destroy();
  });

  it('collectStates 仍是 active-state 样式 owner（visual-state 不再 immediate 写 active）', () => {
    // visual-state 不传 collector（回退路径）时也不写 active——active 始终由 collectStates 经 flush 写。
    // 断言：仅 attach visual-state（无 collector）后，active 样式仍出现在 flush 批量写中（来自 collectStates）。
    const { engine, setFlag, flush } = createHarness({ version: 1, symbols: [pumpNode()] });
    setFlag(1);
    flush();
    // active-state fill 来自 collectStates 批量写（visual-state 仅追踪/恢复，不写 active）
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ff0000');
    engine.destroy();
  });
});

// plan 2026-08-05-0653-2 Phase 4（multi P1-1）：binding-vs-revert 三路裁定聚焦回归。
// 配置：单图元 fill 字段同时有 binding + state-style（alarm 红色）。
// 失败用例（修复前）：alarm→unstyled 退出时 revert 覆盖 binding 值，fill 落到 base/reset 空值 ''
// （持续到下次点变化）。修复后：revert 跳过有 binding 的字段，binding 值胜出（Failure Paths `revert-shadows-binding`）。
describe('StateVisualApplier binding-vs-revert 三路裁定 (plan 2026-08-05-0653-2 Phase 4 multi P1-1)', () => {
  it('binding+state-style 同字段图元 alarm→unstyled 退出时引擎停在 binding 解析值（非 base/reset 空值）', () => {
    const node: ScadaSymbolNode = {
      id: 'bind-state',
      type: 'scada-rect',
      x: 0,
      y: 0,
      bindings: { fill: { point: 'flag' } },
      states: {
        states: {
          alarm: { style: { fill: '#ff0000' } },
          normal: {},
        },
        valueMap: { 0: 'normal', 1: 'alarm' },
      },
    };
    const { engine, setFlag, flush } = createHarness({ version: 1, symbols: [node] });
    // 进入 alarm 态：state-style fill=#ff0000 胜出（collectStates 同帧后写覆盖 binding 值）
    setFlag(1);
    flush();
    expect((engine.getSymbolProps('bind-state') as { fill?: unknown }).fill).toBe('#ff0000');
    // 退出 alarm → normal（无 style）：binding 值胜出（flag=0），revert 跳过有 binding 的 fill 字段。
    // 修复前此处失败：fill='' （base/reset 空值，revert 覆盖 binding 值）。
    setFlag(0);
    flush();
    expect((engine.getSymbolProps('bind-state') as { fill?: unknown }).fill).toBe(0);
    engine.destroy();
  });

  it('无 binding 的同字段 revert 行为不变（既有 revert 单测语义保留）', () => {
    // pumpNode bindings 是 rotation（非 fill），fill 仅由 state-style 驱动 → revert 行为不变。
    const { engine, setFlag, flush } = createHarness({ version: 1, symbols: [pumpNode()] });
    setFlag(1);
    flush();
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ff0000');
    setFlag(2);
    flush();
    // stop 状态无 style → 恢复 base（defaults fill #ffffff），revert 正常执行（无 binding 跳过）
    expect((engine.getSymbolProps('pump') as { fill?: string }).fill).toBe('#ffffff');
    engine.destroy();
  });

  it('binding+state-style 同字段保持 alarm 态时，state-style 仍胜出（active 路径不受影响）', () => {
    const node: ScadaSymbolNode = {
      id: 'bind-state',
      type: 'scada-rect',
      x: 0,
      y: 0,
      bindings: { fill: { point: 'flag' } },
      states: {
        states: {
          alarm: { style: { fill: '#ff0000' } },
          normal: {},
        },
        valueMap: { 0: 'normal', 1: 'alarm' },
      },
    };
    const { engine, setFlag, flush } = createHarness({ version: 1, symbols: [node] });
    setFlag(1);
    flush();
    // active 态：state-style fill=#ff0000 胜出（即使 binding 值 = 1 也在同帧被 collectStates 覆盖）
    expect((engine.getSymbolProps('bind-state') as { fill?: unknown }).fill).toBe('#ff0000');
    setFlag(1);
    flush();
    // 保持 alarm 态：state-style 仍胜出（binding-vs-revert 仅影响 revert 路径，active 不变）
    expect((engine.getSymbolProps('bind-state') as { fill?: unknown }).fill).toBe('#ff0000');
    engine.destroy();
  });
});

describe('InteractionOverlay (I8.2 sky 交互覆盖层，leafer-state-primitive-drift 回退路径)', () => {
  it('should be lazily available only when the interactionLayer option is enabled', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    expect(engine.interactionOverlay).toBeUndefined();
    engine.destroy();
    const engine2 = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    expect(engine2.interactionOverlay).toBeDefined();
    engine2.destroy();
  });

  it('should highlight a symbol with an overlay rect matching its bounds and the preset style', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset({ version: 1, symbols: [{ id: 'r', type: 'scada-rect', x: 5, y: 7, width: 100, height: 50 }] });
    const overlay = engine.interactionOverlay as InteractionOverlay;
    overlay.highlight('r', INTERACTION_STYLE_PRESETS.hover);
    const sky = engine.sky as unknown as { children: Array<{ children: unknown[] }> };
    const group = sky.children[0] as unknown as { children: Array<Record<string, unknown>> };
    expect(group.children).toHaveLength(1);
    const rect = group.children[0] as unknown as Record<string, unknown>;
    expect(rect.x).toBe(5);
    expect(rect.y).toBe(7);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(50);
    expect(rect.stroke).toBe(INTERACTION_STYLE_PRESETS.hover.stroke);
    engine.destroy();
  });

  it('should update an existing overlay rect and clear per symbol or wholesale', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset({ version: 1, symbols: [{ id: 'r', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }] });
    const overlay = engine.interactionOverlay as InteractionOverlay;
    overlay.highlight('r', INTERACTION_STYLE_PRESETS.selected);
    overlay.highlight('r', INTERACTION_STYLE_PRESETS.disabled);
    const sky = engine.sky as unknown as { children: Array<{ children: unknown[] }> };
    expect(sky.children[0]?.children).toHaveLength(1);
    overlay.clear('r');
    expect(sky.children[0]?.children).toHaveLength(0);
    overlay.highlight('r');
    overlay.clear();
    expect(sky.children[0]?.children).toHaveLength(0);
    engine.destroy();
  });

  it('should no-op for unknown symbol ids in highlight/clear', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset({ version: 1, symbols: [{ id: 'r', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }] });
    const overlay = engine.interactionOverlay as InteractionOverlay;
    expect(() => overlay.highlight('missing')).not.toThrow();
    expect(() => overlay.clear('missing')).not.toThrow();
    expect(overlay.activeCount).toBe(0);
    engine.destroy();
  });

  it('should destroy the overlay group with the engine', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer(), interactionLayer: true });
    engine.reset({ version: 1, symbols: [{ id: 'r', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }] });
    (engine.interactionOverlay as InteractionOverlay).highlight('r');
    const sky = engine.sky as unknown as { children: unknown[] };
    expect(sky.children).toHaveLength(1);
    engine.destroy();
    expect(sky.children).toHaveLength(0);
  });

  it('engine.getConfigNode should find nested group children and miss on unknown ids', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    expect(engine.getConfigNode('r')).toBeUndefined();
    engine.reset({
      version: 1,
      symbols: [
        { id: 'g', type: 'scada-group', x: 0, y: 0, children: [{ id: 'inner', type: 'scada-rect', x: 1, y: 2 }] },
      ],
    });
    expect(engine.getConfigNode('g')?.id).toBe('g');
    expect(engine.getConfigNode('inner')?.x).toBe(1);
    expect(engine.getConfigNode('nope')).toBeUndefined();
    engine.destroy();
  });
});
