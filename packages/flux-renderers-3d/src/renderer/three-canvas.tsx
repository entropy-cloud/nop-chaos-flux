import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@nop-chaos/ui';
import {
  createNormalizedActionEvent,
  useRendererEnv,
  useRendererRuntime,
  useRenderScope,
} from '@nop-chaos/flux-react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { DataBinding, ThreeCanvasSchema, ThreeSceneConfig } from '../schemas.js';
import type { SceneManager } from '../engine/scene-manager.js';
import { useSceneManager } from './hooks/use-scene-manager.js';
import { useBindingBridge } from './hooks/use-binding-bridge.js';
import { useThreeEvents } from './hooks/use-three-events.js';

type SceneLifecycleState = 'empty' | 'loading' | 'ready' | 'error';

/**
 * three-canvas 渲染器（design-renderer.md §3，D1：React 壳 + 裸 three 命令式引擎）。
 * 状态埋点 `data-three-scene-state`（empty|loading|ready|error）供 e2e 断言；
 * loading/empty region 分别在加载中/无模型时渲染。
 */
export function ThreeCanvasRenderer(props: RendererComponentProps<ThreeCanvasSchema>) {
  const { scene, bindings, events } = props.props;
  const { visible, className } = props.meta;
  const testid = props.meta.testid as string | undefined;
  const runtime = useRendererRuntime();
  const scope = useRenderScope();
  const env = useRendererEnv();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sceneState, setSceneState] = useState<SceneLifecycleState>('loading');

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
    onError: (event) => {
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
  });

  useBindingBridge({
    bindings: bindings as DataBinding[] | undefined,
    sceneManager: engine,
    expressionCompiler: runtime.expressionCompiler,
    env,
  });

  useThreeEvents({ events, helpers: props.helpers, scope, engine });

  useEffect(() => {
    if (!engine) return;
    // error 是挂载周期终态（组件不卸载不恢复），ready 不覆盖
    return engine.onReady(() => setSceneState((current) => (current === 'error' ? current : 'ready')));
  }, [engine]);

  if (visible === false) return null;

  return (
    <div
      ref={containerRef}
      className={cn('three-canvas', className)}
      data-testid={testid}
      data-three-scene-state={isEmpty ? 'empty' : sceneState}
      style={{ width: '100%', height: '400px', position: 'relative' }}
    >
      {!isEmpty && sceneState === 'loading' && props.regions.loading
        ? (props.regions.loading.render() as React.ReactNode)
        : null}
      {isEmpty && props.regions.empty
        ? (props.regions.empty.render() as React.ReactNode)
        : null}
    </div>
  );
}
