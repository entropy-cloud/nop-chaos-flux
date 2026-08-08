import { describe, it, expect, vi } from 'vitest';
import { PointStore } from './point-store.js';
import { ReverseIndex } from './reverse-index.js';
import { DirtyCollector } from './dirty-collector.js';
import { RefreshPipeline } from './refresh-pipeline.js';
import type {
  ScadaPointDeclaration,
  ScadaSymbolNode,
} from '../serialization/config-types.js';
import {
  expressionCompiler,
  env,
  evalContext,
  createHarness,
  harnessApply,
} from './refresh-pipeline-fixtures.js';

describe('RefreshPipeline 端到端刷新流水线 (I6.2)', () => {
  it('setPointValues → 绑定求值 → 帧尾单次批量写全链路收敛', () => {
    const harness = createHarness();
    harness.pointStore.setPointValues({ level: 60, speed: 200 });
    const result = harness.pipeline.flushFrame(harnessApply(harness));
    expect(result).toBe(true);
    expect(harness.applied).toHaveLength(1);
    expect(harness.applied[0]).toEqual({
      'pump-1': { fill: '#ff0000', rotation: 20 },
    });
  });

  it('should batch multiple changed points into one applyAttrs call (1 帧内多属性合并为单次批量写)', () => {
    const symbols: ScadaSymbolNode[] = [];
    const declarations: ScadaPointDeclaration[] = [];
    for (let i = 0; i < 1000; i++) {
      declarations.push({ id: `p${i}`, source: 'static', value: i });
      symbols.push({
        id: `s${i}`,
        type: 'scada-rect',
        x: 0,
        y: 0,
        bindings: { opacity: { point: `p${i}` } },
      });
    }
    const harness = createHarness({ declarations, symbols });
    const values: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) values[`p${i}`] = i + 1;
    harness.pointStore.setPointValues(values);
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied).toHaveLength(1);
    expect(Object.keys(harness.applied[0])).toHaveLength(1000);
    expect(harness.applied[0].s42).toEqual({ opacity: 43 });
  });

  it('should recompute dependent expression points and propagate to bindings (依赖链)', () => {
    const harness = createHarness({
      declarations: [
        { id: 'v1', source: 'static', value: 2 },
        { id: 'v2', source: 'expression', expression: '${v1 * 10}' },
      ],
      symbols: [
        {
          id: 'meter',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { point: 'v2' } },
        },
      ],
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied).toHaveLength(1);
    expect(harness.applied[0].meter).toEqual({ text: 20 });
    expect(harness.pointStore.getPointValue('v2')).toBe(20);

    harness.applied.length = 0;
    harness.pointStore.setPointValue('v1', 5);
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied).toHaveLength(1);
    expect(harness.applied[0].meter).toEqual({ text: 50 });
  });

  it('should recompute transitive expression chains in one frame', () => {
    const harness = createHarness({
      declarations: [
        { id: 'a', source: 'static', value: 2 },
        { id: 'b', source: 'expression', expression: '${a * 2}' },
        { id: 'c', source: 'expression', expression: '${b + 1}' },
      ],
      symbols: [
        {
          id: 'sym',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { point: 'c' } },
        },
      ],
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied[0].sym).toEqual({ text: 5 });

    harness.applied.length = 0;
    harness.pointStore.setPointValue('a', 10);
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied[0].sym).toEqual({ text: 21 });
  });

  // plan 2026-08-09-0121-2 Workstream A F8：反向索引 O(扇出) 查找替代 lastDeps O(n²) 线性扫描。
  // 4 级深链 a→b→c→d + 并存大量无关表达式点；改 a 后只链上 b/c/d 重算并传播到绑定，无关点不受影响。
  it('F8: deep (>=3 level) expression chain recompute propagates correctly via reverse index', () => {
    const unrelated: ScadaPointDeclaration[] = [];
    const unrelatedSyms: ScadaSymbolNode[] = [];
    for (let i = 0; i < 50; i++) {
      unrelated.push({ id: `u${i}`, source: 'static', value: i });
      unrelated.push({ id: `ue${i}`, source: 'expression', expression: '${u' + i + ' + 1}' });
      unrelatedSyms.push({
        id: `usym${i}`,
        type: 'scada-rect',
        x: 0,
        y: 0,
        bindings: { text: { point: `ue${i}` } },
      });
    }
    const harness = createHarness({
      declarations: [
        { id: 'a', source: 'static', value: 1 },
        { id: 'b', source: 'expression', expression: '${a * 2}' },
        { id: 'c', source: 'expression', expression: '${b * 3}' },
        { id: 'd', source: 'expression', expression: '${c + 1}' },
        ...unrelated,
      ],
      symbols: [
        { id: 'chain', type: 'scada-rect', x: 0, y: 0, bindings: { text: { point: 'd' } } },
        ...unrelatedSyms,
      ],
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    // a=1 → b=2 → c=6 → d=7
    expect(harness.pointStore.getPointValue('d')).toBe(7);
    expect(harness.applied[0].chain).toEqual({ text: 7 });

    harness.applied.length = 0;
    harness.pointStore.setPointValue('a', 5);
    harness.pipeline.flushFrame(harnessApply(harness));
    // a=5 → b=10 → c=30 → d=31，反向索引正确传播 4 级链
    expect(harness.pointStore.getPointValue('d')).toBe(31);
    expect(harness.applied[0].chain).toEqual({ text: 31 });
    // 无关表达式点 ue0..ue49 不应被改 a 影响（仍 u+1）
    expect(harness.pointStore.getPointValue('ue0')).toBe(1);
    expect(harness.pointStore.getPointValue('ue49')).toBe(50);
  });

  it('should detect binding cycles and keep last valid values (binding-cycle Failure Path)', () => {
    const onError = vi.fn();
    const harness = createHarness({
      declarations: [
        { id: 'v1', source: 'expression', expression: '${v2 * 2}' },
        { id: 'v2', source: 'expression', expression: '${v1 + 1}' },
      ],
      symbols: [
        {
          id: 'sym',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { point: 'v1' } },
        },
      ],
      onError,
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    // plan 2026-08-05-2129-3 Phase 3：onError 签名 (code, message, error?)——cycle 经求值期抛出 →
    // flux-evaluate-failed，message 含 'circular dependency'。call[1] 为 message。
    const circular = onError.mock.calls.filter((call) => String(call[1]).includes('circular dependency'));
    expect(circular).toHaveLength(2);
    expect(harness.pipeline.flushFrame(harnessApply(harness))).toBe(false);
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('should skip unknown point bindings and continue with the rest (point-id-unknown)', () => {
    const harness = createHarness({
      symbols: [
        {
          id: 'sym',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: {
            fill: { point: 'ghost' },
            opacity: { point: 'level' },
          },
        },
      ],
    });
    harness.pointStore.setPointValues({ level: 30 });
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied).toHaveLength(1);
    expect(harness.applied[0].sym).toEqual({ opacity: 30 });
  });

  it('should keep last valid value when an expression errors and report via onError once', () => {
    const onError = vi.fn();
    const harness = createHarness({
      declarations: [
        { id: 'v1', source: 'static', value: 1 },
        // I18 flux 一元化：成员访问 undefined 标识符（ghost 未声明）经 flux-formula evaluate 抛
        // 'Expression evaluation failed for: ${ghost.foo}' → evaluateFlux catch 吞为 undefined →
        // syncExpressionPoint 上报 'expression evaluation failed' 并保留 init=42。
        { id: 'v2', source: 'expression', expression: '${ghost.foo}', init: 42 },
      ],
      symbols: [
        {
          id: 'sym',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { point: 'v2' } },
        },
      ],
      onError,
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    // plan 2026-08-05-2129-3 Phase 3：onError(code, message, error?)——${ghost.foo} 求值期失败 →
    // flux-evaluate-failed + message 'expression evaluation failed'。
    expect(onError).toHaveBeenCalledWith('flux-evaluate-failed', 'expression evaluation failed', expect.anything());
    expect(harness.pointStore.getPointValue('v2')).toBe(42);
    harness.pointStore.setPointValue('v1', 2);
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(harness.pointStore.getPointValue('v2')).toBe(42);
  });

  it('should not write anything when nothing changed', () => {
    const harness = createHarness();
    harness.pipeline.flushFrame(harnessApply(harness));
    harness.applied.length = 0;
    expect(harness.pipeline.flushFrame(harnessApply(harness))).toBe(false);
    expect(harness.applied).toHaveLength(0);
  });

  it('should flush pending collector entries even without point changes (动画合帧入口)', () => {
    const harness = createHarness();
    harness.collector.collect({ symbolId: 'pump-1', property: 'opacity', value: 0.5 });
    expect(harness.pipeline.flushFrame(harnessApply(harness))).toBe(true);
    expect(harness.applied).toHaveLength(1);
    expect(harness.applied[0]['pump-1']).toEqual(expect.objectContaining({ opacity: 0.5 }));
    harness.applied.length = 0;
    harness.collector.collect({ symbolId: 'pump-1', property: 'opacity', value: 0.6 });
    expect(harness.pipeline.flushFrame(harnessApply(harness))).toBe(true);
    expect(harness.applied).toHaveLength(1);
    expect(harness.applied[0]).toEqual({ 'pump-1': { opacity: 0.6 } });
  });

  it('requestRender should flush at frame tick with merged writes', () => {
    let tick: (() => void) | undefined;
    const reverseIndex = new ReverseIndex(
      [
        { id: 'pump-1', type: 'scada-rect', x: 0, y: 0, bindings: { rotation: { point: 'speed' } } },
      ],
      evalContext,
    );
    const pointStore = new PointStore();
    pointStore.loadDeclarations([{ id: 'speed', source: 'static', value: 1 }]);
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
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
    pointStore.setPointValue('speed', 2);
    pipeline.requestRender((attrs) => applied.push(attrs as Record<string, Record<string, unknown>>));
    pointStore.setPointValue('speed', 3);
    pipeline.requestRender((attrs) => applied.push(attrs as Record<string, Record<string, unknown>>));
    expect(tick).toBeDefined();
    tick?.();
    expect(applied).toHaveLength(1);
    expect(applied[0]).toEqual({ 'pump-1': { rotation: 3 } });
  });

  it('destroy should cancel scheduled frames and drop pipeline state', () => {
    const cancel = vi.fn();
    const reverseIndex = new ReverseIndex([], evalContext);
    const pointStore = new PointStore();
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      compiler: expressionCompiler,
      env,
      scheduleTick: (cb) => {
        void cb;
        return cancel;
      },
    });
    pipeline.requestRender(() => {});
    expect(cancel).toHaveBeenCalledTimes(0);
    pipeline.destroy();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(collector.hasPending()).toBe(false);
  });

  it('should report when expression recompute exceeds the iteration budget', () => {
    const onError = vi.fn();
    const declarations: ScadaPointDeclaration[] = [{ id: 'p0', source: 'static', value: 0 }];
    for (let i = 1; i <= 4; i++) {
      declarations.push({
        id: `e${i}`,
        source: 'expression',
        expression: i === 1 ? '${p0 + 1}' : `\${e${i - 1} + 1}`,
        init: 0,
      });
    }
    const pointStore = new PointStore();
    pointStore.loadDeclarations(declarations);
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex: new ReverseIndex([], evalContext),
      collector,
      compiler: expressionCompiler,
      env,
      onError,
      maxExpressionIterations: 2,
    });
    pipeline.flushFrame(() => {});
    // plan 2026-08-05-2129-3 Phase 3：迭代预算超限 → flux-evaluate-failed（求值期安全网，对称码）。
    expect(onError).toHaveBeenCalledWith('flux-evaluate-failed', 'expression recompute exceeded iteration budget');
  });
});
