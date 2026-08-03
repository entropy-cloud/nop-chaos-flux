import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { ScadaCanvasEngine } from '../../engine/scada-engine.js';
import { PointStore } from '../../binding/point-store.js';
import { ReverseIndex } from '../../binding/reverse-index.js';
import { DirtyCollector, RefreshPipeline, type ApplyAttrs } from '../../binding/dirty-collector.js';
import { Animator } from '../../binding/animator.js';
import type { ScadaSymbolEventName, ScadaSymbolEventPayload } from '../../engine/event-bridge.js';
import { errorMessage } from '../scada-errors.js';
import type { ScadaPointDeclaration, ScadaSymbolNode } from '../../serialization/config-types.js';

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
    animator,
  });
  frameRequest.current = () => pipeline.requestRender(applyAttrsOf(engine));
  return { pipeline, animator };
}

function applyAttrsOf(engine: ScadaCanvasEngine): ApplyAttrs {
  return (attrs) => engine.applyAttrs(attrs);
}

/**
 * 引擎实例生命周期（design-renderer.md §8.3）：mount 创建（幂等守卫防 React Compiler 重复执行，
 * Failure Paths `react-compiler-re-exec`）、unmount destroy（幂等）、ResizeObserver → setSize 防抖到帧。
 */
export function useScadaEngine(args: UseScadaEngineArgs) {
  const { containerRef } = args;
  const latest = useRef(args);
  useEffect(() => {
    latest.current = args;
  });
  const [runtime, setRuntime] = useState<ScadaCanvasRuntime | null>(null);
  const runtimeRef = useRef<ScadaCanvasRuntime | null>(null);

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

    let rafId = 0;
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const width = Math.round(entry.contentRect.width);
        const height = Math.round(entry.contentRect.height);
        if (rafId !== 0) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          if (runtimeRef.current?.engine) runtimeRef.current.engine.setSize(width, height);
        });
      });
      observer.observe(container);
    }

    return () => {
      if (rafId !== 0) cancelAnimationFrame(rafId);
      observer?.disconnect();
      pipeline.destroy();
      animator.destroy();
      collector.destroy();
      engine.destroy();
      runtimeRef.current = null;
      setRuntime(null);
    };
  }, [containerRef]);

  useEffect(() => {
    const current = runtimeRef.current;
    if (!current) return;
    const targetWidth = latest.current.width ?? containerRef.current?.clientWidth ?? 0;
    const targetHeight = latest.current.height ?? containerRef.current?.clientHeight ?? 0;
    if (targetWidth > 0 && targetHeight > 0) {
      current.engine.setSize(targetWidth, targetHeight);
    }
  }, [runtime, containerRef]);

  /** 绑定域整体重载（config 变更含点表/绑定变化时）：点表声明 + 反向索引 + 刷新流水线/动画时钟重建。 */
  const reloadBindings = useCallback(
    (variables: ScadaPointDeclaration[] | undefined, symbols: ScadaSymbolNode[]) => {
      const current = runtimeRef.current;
      if (!current) return;
      current.pointStore.reset();
      current.pointStore.loadDeclarations(variables ?? []);
      current.reverseIndex.build(symbols);
      current.pipeline.destroy();
      current.animator.destroy();
      const collector = new DirtyCollector();
      const { pipeline, animator } = createBindingDomain(current.engine, current.pointStore, current.reverseIndex, collector);
      const next: ScadaCanvasRuntime = { ...current, collector, pipeline, animator };
      runtimeRef.current = next;
      setRuntime(next);
    },
    [],
  );

  /** 命令式销毁（component:destroy 句柄）：引擎/流水线/动画时钟销毁，runtime 置空（后续句柄调用返回 not-mounted）。 */
  const destroy = useCallback(() => {
    const current = runtimeRef.current;
    if (!current) return;
    current.pipeline.destroy();
    current.animator.destroy();
    current.collector.destroy();
    current.engine.destroy();
    runtimeRef.current = null;
    setRuntime(null);
  }, []);

  return { runtime, reloadBindings, destroy };
}
