import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { ScadaCanvasEngine } from '../../engine/scada-engine.js';
import { PointStore } from '../../binding/point-store.js';
import { ReverseIndex } from '../../binding/reverse-index.js';
import { DirtyCollector, RefreshPipeline, type ApplyAttrs } from '../../binding/dirty-collector.js';
import { Animator } from '../../binding/animator.js';
import { StateVisualApplier } from '../../symbols/visual-state.js';
import type { ScadaSymbolEventName, ScadaSymbolEventPayload } from '../../engine/event-bridge.js';
import { scadaTestHandleKey, type ScadaTestHandle } from '../../engine/test-handle.js';
import { errorMessage } from '../scada-errors.js';
import type { ScadaPointDeclaration, ScadaPrimitive, ScadaSymbolNode } from '../../serialization/config-types.js';

/**
 * 引擎 + 绑定域运行时（I10.1/I10.3）：引擎实例与点表/反向索引/刷新流水线/动画时钟同生命周期。
 * 全部为域内部 state（design-renderer.md §7），不进 schema-visible scope（INV-4）。
 */
export interface ScadaCanvasRuntime {
  engine: ScadaCanvasEngine;
  pointStore: PointStore;
  reverseIndex: ReverseIndex;
  collector: DirtyCollector;
  pipeline: RefreshPipeline;
  animator: Animator;
  applyAttrs: ApplyAttrs;
}

export interface UseScadaEngineArgs {
  containerRef: RefObject<HTMLElement | null>;
  cid?: number;
  exposeTestHandle?: boolean;
  interactionLayer?: boolean;
  width?: number;
  height?: number;
  onSymbolEvent?: (name: ScadaSymbolEventName, payload: ScadaSymbolEventPayload) => void;
  getPointValuesFor?: (symbolId: string) => Record<string, unknown> | undefined;
  onEngineError?: (code: string, message: string) => void;
  /**
   * 用户侧图元事件处理器异常隔离上报消费者（plan 2026-08-04-2242-1 Phase 2）：
   * engine `EventBridge.safeRun` 顶层 try/catch + `reportHandlerError` 去重后的上报出口，
   * 经 `latest` ref 转发（对齐 `onSymbolEvent`/`getPointValuesFor` 转发模式）。不升级画布 status（§8.1）。
   */
  onHandlerError?: (error: unknown) => void;
}

function createBindingDomain(
  engine: ScadaCanvasEngine,
  pointStore: PointStore,
  reverseIndex: ReverseIndex,
  collector: DirtyCollector,
): { pipeline: RefreshPipeline; animator: Animator } {
  const frameRequest = { current: () => undefined as void };
  const animator = new Animator({
    collect: (entry) => collector.collect(entry),
    requestFrame: () => frameRequest.current(),
  });
  const pipeline = new RefreshPipeline({
    pointStore,
    reverseIndex,
    collector,
    getStates: (symbolId) => engine.getSymbolDeclarations(symbolId)?.states,
    getAnimations: (symbolId) => engine.getSymbolDeclarations(symbolId)?.animations,
    // plan 2026-08-04-1558-2 Phase 2：首次同步遍历全部图元启动 when:'always' 动画
    // （覆盖无 states/无绑定图元，SL-1/m1）。
    getSymbolIds: () => engine.getSymbols().map((leaf) => leaf.id),
    animator,
  });
  // I8.2 视觉状态应用（open-audit P1-B 接线）：消费 `state:change` 事件应用/恢复状态样式；
  // pipeline 每次重建（mount / reloadBindings）都必须重新 attach（attachTo 返回的退订句柄
  // 随 pipeline 一起被丢弃，无需显式退订）。
  // plan 2026-08-04-2243-1 Phase 3 W3：传 collector 使 revert 经脏收集合帧（单一 applyAttrs owner），
  // active-state 样式由 collectStates 写入、revert 由本层汇入同一帧尾 flush。
  new StateVisualApplier(engine, collector).attachTo(pipeline);
  frameRequest.current = () => pipeline.requestRender(applyAttrsOf(engine));
  return { pipeline, animator };
}

function applyAttrsOf(engine: ScadaCanvasEngine): ApplyAttrs {
  return (attrs) => engine.applyAttrs(attrs);
}

/**
 * 引擎实例生命周期（design-renderer.md §8.3）：mount 创建（幂等守卫防 React Compiler 重复执行，
 * Failure Paths `react-compiler-re-exec`）、unmount destroy（幂等）、ResizeObserver → setSize 防抖到帧。
 *
 * plan 2026-08-04-1558-2 Phase 1 收口：
 * - observer/rafId 提为 ref，mount cleanup 与 `destroy` 共用断开逻辑（SL-2：destroy 后容器不再被观察）；
 * - 绑定域（pipeline/animator/collector）释放始终针对 `runtimeRef.current` 的最新实例（M1：reload 后 unmount
 *   不再泄漏最新 animator 时钟——mount cleanup 闭包不再持有 mount 期域对象）；
 * - `setPointValues` 注入闭包经 `runtimeRef.current` 取最新 pipeline 写入（SL-3：reload 后注入不再写向已销毁 pipeline）。
 */
export function useScadaEngine(args: UseScadaEngineArgs) {
  const { containerRef } = args;
  const latest = useRef(args);
  useEffect(() => {
    latest.current = args;
  });
  const [runtime, setRuntime] = useState<ScadaCanvasRuntime | null>(null);
  const runtimeRef = useRef<ScadaCanvasRuntime | null>(null);
  // observer/rafId 提为 ref：mount cleanup 与命令式 destroy 共用断开逻辑（SL-2）。
  const observerRef = useRef<ResizeObserver | undefined>(undefined);
  const rafIdRef = useRef(0);

  const cancelPendingResize = useCallback(() => {
    if (rafIdRef.current !== 0) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
  }, []);

  /**
   * 释放当前绑定域 + 引擎 + 观察器/rAF（幂等）。mount cleanup 与 `destroy` 共用：
   * 始终针对 `runtimeRef.current` 的最新域实例（M1：reload 后释放的是最新 animator 时钟，非 mount 期旧域）。
   */
  const releaseRuntime = useCallback(() => {
    cancelPendingResize();
    observerRef.current?.disconnect();
    observerRef.current = undefined;
    const current = runtimeRef.current;
    if (!current) return;
    // plan 2026-08-04-2243-1 Phase 1 L3：collector 销毁单一 owner——pipeline.destroy() 内部销毁 collector
    // 为唯一路径，此处不再显式 collector.destroy()（消除双销毁依赖幂等）。pipeline/animator/engine 各自独立销毁。
    current.pipeline.destroy();
    current.animator.destroy();
    current.engine.destroy();
    runtimeRef.current = null;
    setRuntime(null);
  }, [cancelPendingResize]);

  useEffect(() => {
    if (runtimeRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    const pointStore = new PointStore();
    const reverseIndex = new ReverseIndex();
    const collector = new DirtyCollector();
    let engine: ScadaCanvasEngine;
    try {
      engine = ScadaCanvasEngine.create({
        container,
        cid: latest.current.cid,
        exposeTestHandle: latest.current.exposeTestHandle,
        interactionLayer: latest.current.interactionLayer,
        width: latest.current.width,
        height: latest.current.height,
        pointStore,
        onSymbolEvent: (name, payload) => latest.current.onSymbolEvent?.(name, payload),
        getPointValuesFor: (symbolId) => latest.current.getPointValuesFor?.(symbolId),
        // plan 2026-08-04-2242-1 Phase 2：转发 handler-error 去重上报消费者（经 latest ref 取最新）。
        onHandlerError: (error) => latest.current.onHandlerError?.(error),
      });
    } catch (error) {
      latest.current.onEngineError?.('engine-create-failed', errorMessage(error));
      return;
    }
    const { pipeline, animator } = createBindingDomain(engine, pointStore, reverseIndex, collector);
    const applyAttrs: ApplyAttrs = (attrs) => engine.applyAttrs(attrs);
    const next: ScadaCanvasRuntime = { engine, pointStore, reverseIndex, collector, pipeline, animator, applyAttrs };
    runtimeRef.current = next;
    setRuntime(next);

    // I14.1 `perf-injection-channel` 裁定：dev/test 专用批量注入通道挂测试句柄
    // （`window.__flux_scada_<cid>.setPointValues`）——与 scope-bridge 同写入路径
    // （pointStore.setPointValues + pipeline.requestRender），但剔除 1 万 flux 变量
    // 订阅/求值开销，非 `scada-canvas` 公共契约变更（仅 exposeTestHandle 时存在）。
    // SL-3 fix：注入闭包经 runtimeRef.current 取最新 pipeline（reload 后写向新域，不写已销毁 pipeline）。
    if (latest.current.exposeTestHandle && latest.current.cid !== undefined) {
      const handle = (window as unknown as Record<string, unknown>)[
        scadaTestHandleKey(latest.current.cid)
      ] as ScadaTestHandle | undefined;
      if (handle) {
        handle.setPointValues = (values: Record<string, ScadaPrimitive>) => {
          const current = runtimeRef.current;
          if (!current) return;
          current.pointStore.setPointValues(values);
          current.pipeline.requestRender(applyAttrsOf(current.engine));
        };
      }
    }

    if (typeof ResizeObserver !== 'undefined') {
      observerRef.current = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const width = Math.round(entry.contentRect.width);
        const height = Math.round(entry.contentRect.height);
        cancelPendingResize();
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = 0;
          if (runtimeRef.current?.engine) runtimeRef.current.engine.setSize(width, height);
        });
      });
      observerRef.current.observe(container);
    }

    return () => {
      releaseRuntime();
    };
  }, [containerRef, cancelPendingResize, releaseRuntime]);

  useEffect(() => {
    const current = runtimeRef.current;
    if (!current) return;
    // plan 2026-08-04-1558-2 Phase 4 WD-1/m10：width/height props 变更触发 engine.setSize
    // （补全 width/height effect deps——design-renderer.md §8.3 声称「width/height 变化 → 引擎命令式 API」）
    const targetWidth = latest.current.width ?? containerRef.current?.clientWidth ?? 0;
    const targetHeight = latest.current.height ?? containerRef.current?.clientHeight ?? 0;
    if (targetWidth > 0 && targetHeight > 0) {
      current.engine.setSize(targetWidth, targetHeight);
    }
  }, [runtime, containerRef, args.width, args.height]);

  /**
   * 绑定域整体重载（config 变更含点表/绑定变化时）：点表声明 + 反向索引 + 刷新流水线/动画时钟重建。
   * plan 2026-08-04-1558-2 Phase 1：props full/diff 路径按 id 保留 live 点值（OP-1：静态/表达式运行期值
   * 不静默丢失）；importConfig 全量替换路径重置为 init（Decision：author 意图是换画面）。
   * 保留路径经 PointStore.snapshotValues + restoreValues 直接回填（绕过 convert，防二次 scale，m2）。
   */
  const reloadBindings = useCallback(
    (
      variables: ScadaPointDeclaration[] | undefined,
      symbols: ScadaSymbolNode[],
      options?: { preserveValues?: boolean },
    ) => {
      const current = runtimeRef.current;
      if (!current) return;
      const preserve = options?.preserveValues ?? true;
      const snapshot = preserve ? current.pointStore.snapshotValues() : new Map<string, ScadaPrimitive>();
      current.pointStore.reset();
      current.pointStore.loadDeclarations(variables ?? []);
      if (snapshot.size > 0) current.pointStore.restoreValues(snapshot);
      current.reverseIndex.build(symbols);
      current.pipeline.destroy();
      current.animator.destroy();
      const collector = new DirtyCollector();
      const { pipeline, animator } = createBindingDomain(current.engine, current.pointStore, current.reverseIndex, collector);
      // P1-2 首帧刷新：绑定域重建后无条件立即触发一次首同步（`synced=false` 全量路径，
      // 静态/表达式点绑定/状态色/when:'always' 动画首帧即应用）。触发点内置在重建之后、
      // setRuntime 之前——config-sync 闭包持有的 runtime 是旧对象，外部触发会打到已销毁的
      // pipeline；此处对新 pipeline 直接 requestRender 保证"重建后即首同步"。full 与非空 diff
      // 两条路径都经 reloadBindings（diff 新增的静态绑定图元同样需要首同步，不做策略门控）。
      pipeline.requestRender(applyAttrsOf(current.engine));
      const next: ScadaCanvasRuntime = { ...current, collector, pipeline, animator };
      runtimeRef.current = next;
      setRuntime(next);
    },
    [],
  );

  /** 命令式销毁（component:destroy 句柄）：释放当前域 + 断开 observer/取消 rAF，runtime 置空（后续句柄返回 not-mounted）。 */
  const destroy = useCallback(() => {
    releaseRuntime();
  }, [releaseRuntime]);

  return { runtime, reloadBindings, destroy };
}
