import { describe, expect, it, vi, type Mock } from 'vitest';
import { EventBridge, type EventBridgeOptions } from '../engine/event-bridge.js';
import { HitResolver } from '../engine/hit.js';
import { MockApp, MockLeafer, MockRect, resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { Animator } from '../binding/animator.js';
import { PointStore } from '../binding/point-store.js';
import { ReverseIndex } from '../binding/reverse-index.js';
import { DirtyCollector, RefreshPipeline } from '../binding/dirty-collector.js';

function createBridge(options?: {
  onSymbolEvent?: Mock;
  onHandlerError?: (error: unknown) => void;
  hitLeaf?: MockRect | null;
}) {
  const tree = new MockLeafer();
  const app = new MockApp({ ground: {}, sky: {} });
  const leaf = options?.hitLeaf ?? new MockRect({ id: 'pump-1' });
  tree.selector.getByPoint = () =>
    options?.hitLeaf === null ? { target: null, path: [] } : { target: leaf, path: [leaf] };
  const resolver = new HitResolver({
    getByPoint: (point) => tree.selector.getByPoint(point),
    idOf: (hit) => (hit as { id?: string })?.id,
  });
  const onSymbolEvent = (options?.onSymbolEvent ?? vi.fn()) as Mock;
  const bridge = new EventBridge({
    tree,
    moveTarget: app,
    resolver,
    viewportToWorld: (point) => ({ x: point.x / 2, y: point.y / 2 }),
    onSymbolEvent: onSymbolEvent as unknown as EventBridgeOptions['onSymbolEvent'],
    onHandlerError: options?.onHandlerError,
  });
  return { tree, app, bridge, onSymbolEvent };
}

describe('event-bridge robustness (plan 2026-08-04-1558-2 Phase 2)', () => {
  it('isolates a throwing onSymbolEvent: error caught + deduped report, status untouched, subsequent events still fire (SL-5/m3)', () => {
    resetLeaferMock();
    const errors: unknown[] = [];
    const throwingFn = (): never => {
      throw new Error('bad action schema');
    };
    const onSymbolEvent = vi.fn(throwingFn) as unknown as Mock;
    const { tree, bridge } = createBridge({ onSymbolEvent, onHandlerError: (e) => errors.push(e) });
    bridge.attach();

    // double_tap 直发（无 tap 合并延迟）：触发 throw → 经 safeRun 捕获 + onHandlerError 上报，不冒泡进 leafer
    tree.emit('double_tap', { x: 10, y: 20 });
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('bad action schema');

    // 同一异常去重（再 double_tap 不重复上报）
    tree.emit('double_tap', { x: 10, y: 20 });
    expect(errors).toHaveLength(1);

    // 后续事件仍可达（leafer 管线无污染）：dblclick 经同一处理器路径仍触发 onSymbolEvent
    onSymbolEvent.mockImplementation(() => undefined);
    tree.emit('double_tap', { x: 10, y: 20 });
    expect(onSymbolEvent).toHaveBeenCalled();
    bridge.destroy();
  });

  it('handles non-Error throws via String() fallback (reportHandlerError branch coverage)', () => {
    resetLeaferMock();
    const errors: unknown[] = [];
    // 抛非 Error 值（字符串/null/对象）——reportHandlerError 走 String(error) 分支
    const throwingString = (): never => {
      throw 'string error';
    };
    const onSymbolEvent = vi.fn(throwingString) as unknown as Mock;
    const { tree, bridge } = createBridge({ onSymbolEvent, onHandlerError: (e) => errors.push(e) });
    bridge.attach();
    tree.emit('double_tap', { x: 10, y: 20 });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe('string error');
    bridge.destroy();
  });

  it('dedupes hover on the same symbol (one symbol:hover per entered symbol), re-emits after a miss (WD-4)', () => {
    resetLeaferMock();
    const { tree, app, bridge, onSymbolEvent } = createBridge();
    bridge.attach();

    // 同一符号多次 pointer.move → 仅发射一次 symbol:hover
    app.emit('pointer.move', { x: 10, y: 20 });
    app.emit('pointer.move', { x: 11, y: 21 });
    app.emit('pointer.move', { x: 12, y: 22 });
    const hovers = onSymbolEvent.mock.calls.filter((c) => c[0] === 'symbol:hover');
    expect(hovers).toHaveLength(1);

    // 离开（命中空）→ hover-miss，lastHovered 重置
    tree.selector.getByPoint = () => ({ target: null, path: [] });
    app.emit('pointer.move', { x: 500, y: 500 });
    expect(onSymbolEvent).toHaveBeenLastCalledWith('symbol:hover-miss', expect.objectContaining({ symbolId: 'pump-1' }));

    // 重入同符号 → 再发射（去重已重置）
    tree.selector.getByPoint = () => ({ target: new MockRect({ id: 'pump-1' }), path: [] });
    app.emit('pointer.move', { x: 10, y: 20 });
    const hoversAfterReentry = onSymbolEvent.mock.calls.filter((c) => c[0] === 'symbol:hover');
    expect(hoversAfterReentry).toHaveLength(2);
    bridge.destroy();
  });
});

describe('point-store subscriber isolation (plan 2026-08-04-1558-2 Phase 2 OP-3)', () => {
  it('a throwing point:change subscriber does not break other subscribers or the write loop', () => {
    const errors: Array<{ pointId: string; error: unknown }> = [];
    const store = new PointStore({
      onSubscriberError: (pointId, error) => errors.push({ pointId, error }),
    });
    store.loadDeclarations([
      { id: 'a', source: 'static', value: 0 },
      { id: 'b', source: 'static', value: 0 },
    ]);

    const throwing = vi.fn(() => {
      throw new Error('subscriber boom');
    });
    const surviving = vi.fn();
    // 订阅者 1 throw，订阅者 2 应仍被调用（同 pointId 隔离）
    store.subscribe(['a'], throwing);
    store.subscribe(['a'], surviving);
    store.subscribe(['b'], surviving);

    // 写入 a（第一个订阅者 throw）→ 第二个仍执行，写入循环继续到 b
    store.setPointValues({ a: 1, b: 2 });

    expect(throwing).toHaveBeenCalledWith(expect.objectContaining({ pointId: 'a', value: 1 }));
    expect(surviving).toHaveBeenCalledTimes(2);
    expect(store.getPointValue('b')).toBe(2);

    // 异常去重上报（同 pointId 同 message 仅一次）
    expect(errors).toHaveLength(1);
    expect(errors[0].pointId).toBe('a');
    // 再次同异常不重复上报
    store.setPointValues({ a: 5 });
    expect(errors).toHaveLength(1);
    // 但 b 仍正常写入（循环未中断）
    expect(store.getPointValue('a')).toBe(5);
  });

  it('isolates a throwing point:change EventHub listener (subscribe-via-on path, OP-3)', () => {
    const errors: Array<{ pointId: string; error: unknown }> = [];
    const store = new PointStore({
      onSubscriberError: (pointId, error) => errors.push({ pointId, error }),
    });
    store.loadDeclarations([{ id: 'a', source: 'static', value: 0 }]);

    const throwing = vi.fn(() => {
      throw new Error('hub listener boom');
    });
    const surviving = vi.fn();
    // 经 EventHub 订阅（store.on('point:change', cb)）——与 subscribe() API 不同路径，
    // 经 EventHub.emit 的 try/catch 隔离 + onListenerError 回调（point-store.ts:60/121）
    store.on('point:change', throwing);
    store.on('point:change', surviving);

    store.setPointValue('a', 7);
    expect(throwing).toHaveBeenCalled();
    expect(surviving).toHaveBeenCalled();
    // EventHub onListenerError → reportSubscriberError → onSubscriberError 去重上报
    expect(errors).toHaveLength(1);
    expect(errors[0].pointId).toBe('a');
  });
});

describe('always-animation startup for stateless/unbound symbols (plan 2026-08-04-1558-2 Phase 2 SL-1/m1)', () => {
  it('starts a when:always animation on a symbol with no states and no bindings after the first sync', () => {
    const pointStore = new PointStore();
    // 图元 'spinner' 无绑定（reverseIndex 空）+ 无 states，仅声明 always 动画
    const reverseIndex = new ReverseIndex([]);
    const collector = new DirtyCollector({ scheduleTick: () => () => undefined });
    const animator = new Animator({
      now: () => 0,
      scheduleTick: () => () => undefined,
      collect: () => undefined,
      requestFrame: () => undefined,
    });
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      getAnimations: (id) => (id === 'spinner' ? [{ kind: 'rotate', when: 'always', period: 500 }] : undefined),
      getSymbolIds: () => ['spinner'],
      animator,
      scheduleTick: () => () => undefined,
    });
    // 首次同步：startAlwaysAnimations 遍历 getSymbolIds → spinner 的 always 动画启动
    pipeline.flushFrame(() => undefined);
    expect(animator.isPlaying('spinner', 'rotate')).toBe(true);
    pipeline.destroy();
  });

  it('is a no-op when animator/getSymbolIds/getAnimations are absent (defensive early returns)', () => {
    const pointStore = new PointStore();
    const reverseIndex = new ReverseIndex([]);
    const collector = new DirtyCollector({ scheduleTick: () => () => undefined });
    // 无 animator + 无 getSymbolIds + 无 getAnimations：startAlwaysAnimations 各早退路径均不抛错
    const pipelineNoAnimator = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      getSymbolIds: () => ['x'],
      getAnimations: () => [{ kind: 'rotate', when: 'always', period: 100 }],
      scheduleTick: () => () => undefined,
    });
    expect(() => pipelineNoAnimator.flushFrame(() => undefined)).not.toThrow();
    pipelineNoAnimator.destroy();

    const pipelineNoSymbolIds = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector: new DirtyCollector({ scheduleTick: () => () => undefined }),
      getAnimations: () => [{ kind: 'rotate', when: 'always', period: 100 }],
      animator: new Animator({
        now: () => 0,
        scheduleTick: () => () => undefined,
        collect: () => undefined,
        requestFrame: () => undefined,
      }),
      scheduleTick: () => () => undefined,
    });
    expect(() => pipelineNoSymbolIds.flushFrame(() => undefined)).not.toThrow();
    pipelineNoSymbolIds.destroy();

    const pipelineNoGetAnimations = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector: new DirtyCollector({ scheduleTick: () => () => undefined }),
      getSymbolIds: () => ['x'],
      animator: new Animator({
        now: () => 0,
        scheduleTick: () => () => undefined,
        collect: () => undefined,
        requestFrame: () => undefined,
      }),
      scheduleTick: () => () => undefined,
    });
    expect(() => pipelineNoGetAnimations.flushFrame(() => undefined)).not.toThrow();
    pipelineNoGetAnimations.destroy();
  });

  it('skips symbols whose animations list is undefined and starts only when:always entries', () => {
    const pointStore = new PointStore();
    const reverseIndex = new ReverseIndex([]);
    const collector = new DirtyCollector({ scheduleTick: () => () => undefined });
    const animator = new Animator({
      now: () => 0,
      scheduleTick: () => () => undefined,
      collect: () => undefined,
      requestFrame: () => undefined,
    });
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      // 'has-anim' 返回含 state-conditional 动画的列表（when 非 always），'no-anim' 返回 undefined
      getAnimations: (id) =>
        id === 'has-anim'
          ? [{ kind: 'rotate', when: { state: 'run' }, period: 500 }]
          : id === 'always-only'
            ? [{ kind: 'rotate', when: 'always', period: 500 }]
            : undefined,
      getSymbolIds: () => ['has-anim', 'always-only', 'no-anim'],
      animator,
      scheduleTick: () => () => undefined,
    });
    pipeline.flushFrame(() => undefined);
    // always-only 启动；has-anim 的 state-conditional 不在 startAlwaysAnimations 启动；no-anim 跳过
    expect(animator.isPlaying('always-only', 'rotate')).toBe(true);
    expect(animator.isPlaying('has-anim', 'rotate')).toBe(false);
    pipeline.destroy();
  });

  it('reports expression evaluation errors through onError (dirty-collector error path coverage)', () => {
    // 表达式点求值失败 → BindResolver.evaluate 进 !result.ok 分支 → reportError 上报（去重）
    const errors: string[] = [];
    const pointStore = new PointStore();
    // malformed `@{` 表达式触发 ExpressionEvaluator 解析失败（unclosed @{} point reference）
    pointStore.loadDeclarations([
      { id: 'expr', source: 'expression', expression: '@{unclosed' },
    ]);
    const reverseIndex = new ReverseIndex([
      { id: 'sym', type: 'scada-rect', x: 0, y: 0, bindings: { fill: { point: 'expr' } } },
    ]);
    const collector = new DirtyCollector({ scheduleTick: () => () => undefined });
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      onError: (msg) => errors.push(msg),
      scheduleTick: () => () => undefined,
    });
    pipeline.flushFrame(() => undefined);
    // 表达式求值失败上报（去重：同表达式同错误只一次）
    expect(errors.length).toBeGreaterThan(0);
    const firstCount = errors.length;
    pipeline.flushFrame(() => undefined);
    expect(errors.length).toBe(firstCount); // 去重生效
    pipeline.destroy();
  });
});
