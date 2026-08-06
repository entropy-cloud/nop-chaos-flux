import { describe, it, expect, vi } from 'vitest';
import { PointStore } from './point-store.js';
import { ReverseIndex } from './reverse-index.js';
import { DirtyCollector, RefreshPipeline } from './dirty-collector.js';
import type { ApplyAttrs } from './dirty-collector.js';
import { Animator } from './animator.js';
import type {
  ScadaAnimation,
  ScadaStateDeclaration,
} from '../serialization/config-types.js';
import { expressionCompiler, env, evalContext } from './refresh-pipeline-fixtures.js';

describe('RefreshPipeline 状态→动画联动 (I6.3)', () => {
  const faultDeclaration = (): ScadaStateDeclaration => ({
    states: {
      run: { style: { fill: '#00ff00' } },
      fault: { style: { fill: '#ff0000' }, animations: [{ kind: 'blink', period: 500 }] },
    },
    ranges: [{ min: 80, state: 'fault' }],
  });

  interface StateHarness {
    pointStore: PointStore;
    pipeline: RefreshPipeline;
    applied: Array<Record<string, Record<string, unknown>>>;
    apply: (attrs: Record<string, Record<string, unknown>>) => void;
  }

  function createStateHarness(options: {
    animator: Animator;
    getAnimations?: (symbolId: string) => ScadaAnimation[] | undefined;
  }): StateHarness {
    const pointStore = new PointStore();
    pointStore.loadDeclarations([{ id: 'temp', source: 'static', value: 50 }]);
    const reverseIndex = new ReverseIndex(
      [
        {
          id: 'device-1',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { point: 'temp' } },
          states: faultDeclaration(),
        },
      ],
      evalContext,
    );
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
    const applied: Array<Record<string, Record<string, unknown>>> = [];
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      compiler: expressionCompiler,
      env,
      getStates: (symbolId) => (symbolId === 'device-1' ? faultDeclaration() : undefined),
      getAnimations: options.getAnimations,
      animator: options.animator,
    });
    return {
      pointStore,
      pipeline,
      applied,
      apply: (attrs: Record<string, Record<string, unknown>>) => {
        applied.push(attrs);
      },
    };
  }

  it('should auto-start fault-state blink on state entry and stop it on exit (fault 态自动 blink)', () => {
    const animator = new Animator({ now: () => 0, scheduleTick: () => () => {} });
    const harness = createStateHarness({ animator });
    harness.pipeline.flushFrame(harness.apply);
    expect(animator.isPlaying('device-1', 'blink')).toBe(false);

    harness.pointStore.setPointValue('temp', 90);
    harness.pipeline.flushFrame(harness.apply);
    expect(animator.isPlaying('device-1', 'blink')).toBe(true);

    harness.pointStore.setPointValue('temp', 10);
    harness.pipeline.flushFrame(harness.apply);
    expect(animator.isPlaying('device-1', 'blink')).toBe(false);
  });

  it('should start when:always and when:{state} symbol-level animations via linkage', () => {
    const animator = new Animator({ now: () => 0, scheduleTick: () => () => {} });
    const getAnimations = (): ScadaAnimation[] => [
      { kind: 'rotate', period: 1000, when: 'always' },
      { kind: 'flow', period: 1000, when: { state: 'fault' } },
    ];
    const harness = createStateHarness({ animator, getAnimations });
    harness.pipeline.flushFrame(harness.apply);
    expect(animator.isPlaying('device-1', 'rotate')).toBe(true);
    expect(animator.isPlaying('device-1', 'flow')).toBe(false);

    harness.pointStore.setPointValue('temp', 90);
    harness.pipeline.flushFrame(harness.apply);
    expect(animator.isPlaying('device-1', 'flow')).toBe(true);

    harness.pointStore.setPointValue('temp', 10);
    harness.pipeline.flushFrame(harness.apply);
    expect(animator.isPlaying('device-1', 'flow')).toBe(false);
    expect(animator.isPlaying('device-1', 'rotate')).toBe(true);
  });

  it('should emit state:change via the unified subscription exit (I6.4 数据层事件)', () => {
    const harness = createStateHarness({ animator: new Animator({ now: () => 0, scheduleTick: () => () => {} }) });
    const onStateChange = vi.fn();
    const unsubscribe = harness.pipeline.on('state:change', onStateChange);
    harness.pipeline.flushFrame(harness.apply);
    expect(onStateChange).toHaveBeenCalledTimes(1);
    expect(onStateChange).toHaveBeenCalledWith({ symbolId: 'device-1', state: 'run' });

    harness.pointStore.setPointValue('temp', 90);
    harness.pipeline.flushFrame(harness.apply);
    expect(onStateChange).toHaveBeenLastCalledWith({ symbolId: 'device-1', state: 'fault' });

    unsubscribe();
    harness.pointStore.setPointValue('temp', 10);
    harness.pipeline.flushFrame(harness.apply);
    expect(onStateChange).toHaveBeenCalledTimes(2);
  });
});

describe('RefreshPipeline 销毁门控 + collector 单一 owner (plan 2026-08-04-2243-1 Phase 1 L1/L3)', () => {
  it('destroy 后 requestRender/flushFrame 均为 no-op（L1：阻断陈旧 runtime 闭包重激活）', () => {
    const reverseIndex = new ReverseIndex(
      [
        { id: 'sym', type: 'scada-rect', x: 0, y: 0, bindings: { text: { point: 'p' } } },
      ],
      evalContext,
    );
    const pointStore = new PointStore();
    pointStore.loadDeclarations([{ id: 'p', source: 'static', value: 1 }]);
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
    let tick: (() => void) | undefined;
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      compiler: expressionCompiler,
      env,
      scheduleTick: (cb) => {
        tick = cb;
        return () => {
          tick = undefined;
        };
      },
    });
    const applied: Array<Record<string, Record<string, unknown>>> = [];
    const applyAttrs = (attrs: Record<string, Record<string, unknown>>) => applied.push(attrs);

    pipeline.destroy();

    // destroy 后 requestRender 不调度帧（不设 tick）
    pointStore.setPointValue('p', 99);
    pipeline.requestRender(applyAttrs as ApplyAttrs);
    expect(tick).toBeUndefined();
    if (tick) tick();
    // destroy 后 flushFrame no-op 返 false，不写 applyAttrs
    expect(pipeline.flushFrame(applyAttrs as ApplyAttrs)).toBe(false);
    expect(applied).toHaveLength(0);
  });

  it('pipeline.destroy() 是 collector 销毁的单一 owner，仅销毁一次（L3 single-owner）', () => {
    const reverseIndex = new ReverseIndex([], evalContext);
    const pointStore = new PointStore();
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      compiler: expressionCompiler,
      env,
    });
    const destroySpy = vi.spyOn(collector, 'destroy');

    pipeline.destroy();
    // 单一 owner：pipeline.destroy() 内部销毁 collector 恰好一次
    expect(destroySpy).toHaveBeenCalledTimes(1);
    // 二次调用 pipeline.destroy() 幂等 no-op（不重复销毁 collector）
    pipeline.destroy();
    expect(destroySpy).toHaveBeenCalledTimes(1);
    destroySpy.mockRestore();
  });
});

// plan 2026-08-06-0900-3 Phase 3（open-audit P2-1）：flushFrame {binding,state} > animation 同属性优先级
// 行为锁定。precedence 事实源：animator 经 collect 写入同一 pending Map（last-write-wins per (symbolId,property)），
// flushFrame collectBindings/collectStates 先于 collector.flush → 脏帧 binding/state 条目覆盖同属性 animator 条目。
// 三组刻画现状（绿），作为 precedence 契约的回归守护——消除「未文档化未测试」的不确定性。
describe('RefreshPipeline flushFrame {binding,state} > animation precedence (plan 2026-08-06-0900-3 Phase 3 / open P2-1)', () => {
  interface PrecedenceHarness {
    pointStore: PointStore;
    pipeline: RefreshPipeline;
    animator: Animator;
    applied: Array<Record<string, Record<string, unknown>>>;
    apply: (attrs: Record<string, Record<string, unknown>>) => void;
    nowRef: { value: number };
    driveAnimator: () => void;
  }

  function createPrecedenceHarness(options: {
    symbols?: unknown;
    declarations?: Array<{ id: string; source: 'static'; value: number }>;
    getAnimations?: (symbolId: string) => ScadaAnimation[] | undefined;
  }): PrecedenceHarness {
    const pointStore = new PointStore();
    pointStore.loadDeclarations(options.declarations ?? [{ id: 'angle', source: 'static', value: 45 }]);
    const reverseIndex = new ReverseIndex(
      (options.symbols ?? [
        { id: 'rotor', type: 'scada-rect', x: 0, y: 0, bindings: { rotation: { point: 'angle' } } },
        { id: 'pipe', type: 'scada-line', x: 0, y: 0 },
      ]) as unknown as Parameters<typeof ReverseIndex['prototype']['build']>[0],
      evalContext,
    );
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
    const applied: Array<Record<string, Record<string, unknown>>> = [];
    const apply = (attrs: Record<string, Record<string, unknown>>) => {
      applied.push(attrs);
    };
    const nowRef = { value: 0 };
    let tickCb: (() => void) | undefined;
    const frameRequest = { current: () => undefined as void };
    const animator = new Animator({
      now: () => nowRef.value,
      interval: 0,
      scheduleTick: (cb) => {
        tickCb = cb;
        return () => {
          tickCb = undefined;
        };
      },
      collect: (entry) => collector.collect(entry),
      requestFrame: () => frameRequest.current(),
    });
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      compiler: expressionCompiler,
      env,
      getAnimations: options.getAnimations,
      animator,
    });
    frameRequest.current = () => pipeline.requestRender(apply as ApplyAttrs);
    return {
      pointStore,
      pipeline,
      animator,
      applied,
      apply,
      nowRef,
      driveAnimator: () => {
        if (tickCb) tickCb();
      },
    };
  }

  it('(a) 同属性（rotation）：binding 与 rotate animation 同帧 → 脏帧 binding 覆盖 animation 增量', () => {
    const harness = createPrecedenceHarness({
      getAnimations: (id) => (id === 'rotor' ? [{ kind: 'rotate', period: 1000 }] : undefined),
    });
    // angle = 45 → rotation binding 求值 45；animator rotate 0→360，progress 0.5 → rotation 180。
    const rotateAnim: ScadaAnimation = { kind: 'rotate', period: 1000 };
    harness.animator.start('rotor', rotateAnim);
    harness.nowRef.value = 500; // progress 0.5 → animator rotation = 180
    harness.driveAnimator(); // animator collect rotation=180 → pending{rotor:{rotation:180}}
    harness.pipeline.flushFrame(harness.apply); // collectBindings 重算 binding rotation=45 覆盖 → flush

    expect(harness.applied.length).toBeGreaterThan(0);
    const last = harness.applied[harness.applied.length - 1];
    expect(last['rotor']).toBeDefined();
    // binding 求值（45）胜出，非 animator 增量（180）
    expect(last['rotor'].rotation).toBe(45);
    expect(last['rotor'].rotation).not.toBe(180);
  });

  it('(b) 无 binding 属性（dashOffset 仅 flow animation）：animation 增量正常推进，binding 不干扰', () => {
    const harness = createPrecedenceHarness({
      getAnimations: (id) =>
        id === 'pipe' ? [{ kind: 'flow', period: 1000, from: 0, to: 100 }] : undefined,
    });
    const flowAnim: ScadaAnimation = { kind: 'flow', period: 1000, from: 0, to: 100 };
    harness.animator.start('pipe', flowAnim);
    harness.nowRef.value = 500; // progress 0.5 → dashOffset = 0 + (100-0)*0.5 = 50
    harness.driveAnimator(); // animator collect dashOffset=50
    harness.pipeline.flushFrame(harness.apply); // 'pipe' 无 binding → collectBindings 不写 dashOffset → flush 应用 animation 增量

    expect(harness.applied.length).toBeGreaterThan(0);
    const last = harness.applied[harness.applied.length - 1];
    expect(last['pipe']).toBeDefined();
    // animation 增量正常生效（无 binding 覆盖）
    expect(last['pipe'].dashOffset).toBe(50);
  });

  it('(c) 多帧稳定性：连续多帧 flushFrame（binding 值不变 + animation 持续推进）→ 同属性每帧终值始终 === binding 求值', () => {
    const harness = createPrecedenceHarness({
      getAnimations: (id) => (id === 'rotor' ? [{ kind: 'rotate', period: 1000 }] : undefined),
    });
    const rotateAnim: ScadaAnimation = { kind: 'rotate', period: 1000 };
    harness.animator.start('rotor', rotateAnim);

    // 首帧：触发 first sync（collectBindings 全量重算 binding）
    harness.nowRef.value = 125;
    harness.driveAnimator();
    harness.pipeline.flushFrame(harness.apply);

    // 后续多帧：binding 值不变（angle=45），animation 持续推进；每帧 force-dirty angle 使 collectBindings 重算 binding
    const samples = [250, 500, 750]; // progress 0.25→90, 0.5→180, 0.75→270（均 !== binding 45）
    for (const t of samples) {
      harness.nowRef.value = t;
      harness.driveAnimator(); // animator collect rotation = 0 + 360 * (t/1000)
      // force-dirty angle（binding 值不变但需重算使 collectBindings 同帧覆盖 animator）
      harness.pointStore.restoreValues(new Map([['angle', 45]]));
      harness.pipeline.flushFrame(harness.apply);
      const last = harness.applied[harness.applied.length - 1];
      expect(last['rotor']).toBeDefined();
      // precedence 跨帧稳定：每帧终值始终 === binding 求值（45），非 animator 增量（90/180/270）
      expect(last['rotor'].rotation).toBe(45);
    }
  });
});
