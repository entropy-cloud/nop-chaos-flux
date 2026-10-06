import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MonitorX } from 'lucide-react';
import { cn, Spinner } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import {
  createNormalizedActionEvent,
  useRendererEnv,
  useRendererRuntime,
  useRenderScope,
} from '@nop-chaos/flux-react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { AnimationConfig, DataBinding, ThreeCanvasSchema, ThreeSceneConfig } from '../schemas.js';
import type { SceneManager } from '../engine/scene-manager.js';
import { useSceneManager } from './hooks/use-scene-manager.js';
import { useBindingBridge } from './hooks/use-binding-bridge.js';
import { useThreeEvents } from './hooks/use-three-events.js';
import { useAnimationClips } from './hooks/use-animation-clips.js';
import { DEFAULT_COMPONENT_HEIGHT } from '../engine/three-defaults.js';

type SceneLifecycleState = 'empty' | 'loading' | 'ready' | 'error';

/**
 * three-canvas 渲染器（design-renderer.md §3，D1：React 壳 + 裸 three 命令式引擎）。
 * 状态埋点 `data-three-scene-state`（empty|loading|ready|error）供 e2e 断言；
 * loading/empty region 分别在加载中/无模型时渲染。
 */
export function ThreeCanvasRenderer(props: RendererComponentProps<ThreeCanvasSchema>) {
  const { scene, bindings, events, animations } = props.props;
  const { visible, className } = props.meta;
  const testid = props.meta.testid as string | undefined;
  const runtime = useRendererRuntime();
  const scope = useRenderScope();
  const env = useRendererEnv();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [sceneState, setSceneState] = useState<SceneLifecycleState>('loading');
  // plan 533 D1 Phase 2：错误码（webgl-unavailable 与加载失败差异化降级）；retry 清理。
  const [errorCode, setErrorCode] = useState<string | null>(null);
  // plan 473 (V3-F4): GLTF 加载进度（0..1 | null 不确定态），rAF 合流防 onProgress 高频重渲
  const [progress, setProgress] = useState<number | null>(null);
  const progressRef = useRef<number | null>(null);
  const progressFrameRef = useRef<number | null>(null);

  const models = (scene as ThreeSceneConfig | undefined)?.models;
  const isEmpty = !Array.isArray(models) || models.length === 0;

  const engineOptions = useMemo(
    () => ({} as ConstructorParameters<typeof SceneManager>[1]),
    [],
  );

  const engine = useSceneManager({
    config: scene as ThreeSceneConfig | undefined,
    containerRef,
    visible: visible !== false,
    options: engineOptions,
    reloadKey: retryKey,
    debugHandleKey: testid,
    onError: (event) => {
      setErrorCode(event.code);
      setSceneState('error');
      if (events?.onError && typeof events.onError === 'object') {
        void props.helpers.dispatch(events.onError, {
          event: createNormalizedActionEvent({
            type: 'scene:error',
            code: event.code,
            message: event.message,
          }),
        });
      }
    },
    onStateChange: (state) => {
      setSceneState((current) => (current === 'error' ? current : state));
    },
    onProgress: (ratio) => {
      progressRef.current = ratio;
      if (progressFrameRef.current !== null) return;
      progressFrameRef.current = requestAnimationFrame(() => {
        progressFrameRef.current = null;
        setProgress(progressRef.current);
      });
    },
  });

  useBindingBridge({
    bindings: bindings as DataBinding[] | undefined,
    sceneManager: engine,
    expressionCompiler: runtime.expressionCompiler,
    env,
  });

  useThreeEvents({
    events,
    helpers: props.helpers,
    scope,
    engine,
    onEvent: (type) => engine?.notifyEvent(type),
  });

  useAnimationClips({
    animations: animations as AnimationConfig[] | undefined,
    engine,
  });

  useEffect(() => {
    if (!engine) return;
    // error 是挂载周期终态（组件不卸载不恢复），ready 不覆盖
    return engine.onReady(() => setSceneState((current) => (current === 'error' ? current : 'ready')));
  }, [engine]);

  // plan 533 D1 Phase 2：domElement aria-label 后置设置（engine 侧 role/tabIndex 已在 init 落地）。
  useEffect(() => {
    // mock engine（lifecycle-ui harness）无 getRenderer → 可选调用（真实 manager 恒有）。
    const domElement = engine?.getRenderer?.()?.domElement as HTMLElement | undefined;
    if (!domElement || typeof domElement.setAttribute !== 'function') return;
    domElement.setAttribute('aria-label', t('flux.three.canvasLabel'));
  }, [engine, sceneState]);

  if (visible === false) return null;

  const height = (props.props as { height?: string }).height ?? DEFAULT_COMPONENT_HEIGHT;
  const hasHostLoading = props.regions.loading != null;
  const hasHostEmpty = props.regions.empty != null;

  return (
    <div
      ref={containerRef}
      className={cn('three-canvas', className)}
      data-testid={testid}
      data-three-scene-state={isEmpty ? 'empty' : sceneState}
      aria-busy={!isEmpty && sceneState === 'loading'}
      style={{ width: '100%', height, position: 'relative' }}
    >
      {!isEmpty && sceneState === 'loading' && hasHostLoading
        ? (props.regions.loading!.render() as React.ReactNode)
        : null}
      {isEmpty && hasHostEmpty
        ? (props.regions.empty!.render() as React.ReactNode)
        : null}
      {/* plan 473 (V3-F4): built-in lifecycle defaults — host regions take precedence */}
      {!isEmpty && sceneState === 'loading' && !hasHostLoading ? (
        <div
          data-slot="three-canvas-loading"
          aria-busy="true"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground"
        >
          <Spinner className="size-5" />
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div
              className="h-full w-1/2 animate-pulse rounded-full bg-foreground/20"
              style={progress !== null ? { width: `${Math.round(progress * 100)}%`, animation: 'none' } : undefined}
            />
          </div>
          <span>
            {progress === null
              ? t('flux.three.loading')
              : t('flux.three.loadingProgress', { percent: String(Math.round(progress * 100)) })}
          </span>
        </div>
      ) : null}
      {!isEmpty && sceneState === 'error' ? (
        <div
          data-slot="three-canvas-error"
          data-three-error-code={errorCode ?? undefined}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-destructive"
        >
          {errorCode === 'webgl-unavailable' ? (
            <>
              <MonitorX className="size-6" aria-hidden="true" />
              <span>{t('flux.three.errorWebgl')}</span>
            </>
          ) : (
            <span>{t('flux.three.error')}</span>
          )}
          {errorCode === 'webgl-unavailable' ? null : (
            <button
              type="button"
              data-slot="three-canvas-retry"
              className="rounded-md border px-3 py-1 text-xs hover:bg-muted"
              onClick={() => {
                setSceneState('loading');
                setProgress(null);
                setErrorCode(null);
                setRetryKey((k) => k + 1);
              }}
            >
              {t('flux.three.retry')}
            </button>
          )}
        </div>
      ) : null}
      {isEmpty && !hasHostEmpty ? (
        <div
          data-slot="three-canvas-empty"
          className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
        >
          {t('flux.three.empty')}
        </div>
      ) : null}
    </div>
  );
}
