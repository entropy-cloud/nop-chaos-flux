import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useCurrentComponentRegistry, useRendererRuntime } from '@nop-chaos/flux-react';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import { parseScadaConfig } from '../serialization/parse.js';
import { validateScadaConfig } from '../serialization/validate.js';
import type { ScadaConfig } from '../serialization/config-types.js';
import type { ScadaCanvasSchema, ScadaCanvasEvents } from '../schemas.js';
import type { ScadaCanvasEngine } from '../engine/scada-engine.js';
import { useScadaEngine, type ScadaCanvasRuntime } from './hooks/use-scada-engine.js';
import { errorMessage, useScadaErrorText } from './scada-errors.js';
import { useScadaConfigSync } from './hooks/use-scada-config-sync.js';
import { useScadaPointsBridge } from './hooks/use-scada-points-bridge.js';
import { useScadaEvents } from './hooks/use-scada-events.js';
import { useScadaHandles } from './hooks/use-scada-handles.js';

export type ScadaCanvasStatus = 'loading' | 'ready' | 'error' | 'destroyed';

export interface ScadaCanvasErrorInfo {
  code: string;
  message: string;
}

/**
 * 最小合法空场景（plan 2026-08-04-1558-1 Phase 3 author-less schema 兜底）：
 * author 未提供 config 时 renderer 兜底构造空场景，使画布进入 ready（不再永久 loading）。
 * 经 `validateScadaConfig` 通过；与 `renderer-definitions.ts` defaultSchema 的 config 一致。
 */
export const EMPTY_SCADA_CONFIG: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [],
};

function parseAndValidateConfig(
  raw: unknown,
): { config?: ScadaConfig; error?: ScadaCanvasErrorInfo } {
  if (raw === undefined || raw === null || raw === '') {
    return { config: EMPTY_SCADA_CONFIG };
  }
  try {
    const config = parseScadaConfig(raw as string | object);
    const result = validateScadaConfig(config);
    if (!result.ok) {
      return { error: { code: 'config-invalid', message: result.errors.join('; ') } };
    }
    return { config };
  } catch (error) {
    return {
      error: {
        code: 'config-parse',
        message: errorMessage(error),
      },
    };
  }
}

function asReactNode(value: unknown): ReactNode {
  return value as ReactNode;
}

/**
 * `scada-canvas` 主渲染器（I10.1，design-renderer.md §1/§8/§10）：
 * RendererComponentProps 契约装配（props.props/meta/regions/events/helpers + cid）；
 * 引擎/绑定域生命周期与 config 同步由 hooks 承接；render path 无副作用（INV-5）；
 * 错误面：config 校验失败/引擎创建失败 → empty region + onError（Failure Paths config-invalid/engine-create-failure）。
 */
export function ScadaCanvasRenderer(props: RendererComponentProps<ScadaCanvasSchema>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<ScadaCanvasStatus>('loading');
  const [errorInfo, setErrorInfo] = useState<ScadaCanvasErrorInfo | undefined>();
  const { t } = useFluxTranslation();
  // plan 2026-08-04-1558-2 Phase 4 WD-6：错误码经注册表 + i18n 映射为本地化文案（fallback 原文）
  const resolveErrorText = useScadaErrorText();

  const { config: parsedConfig, error: parseError } = useMemo(
    () => parseAndValidateConfig(props.props.config),
    [props.props.config],
  );

  // 引擎实例经 ref 传入事件桥（引擎创建于 useScadaEngine，事件仅用户交互期到达，ref 已就绪；I11.2 覆盖物驱动）
  const engineRef = useRef<ScadaCanvasEngine | undefined>(undefined);

  const eventsApi = useScadaEvents({
    events: props.props.events as ScadaCanvasEvents | undefined,
    helpers: props.helpers,
    scope: props.node?.scope,
    config: parsedConfig,
    engine: engineRef,
    interactionLayer: true,
  });

  const handleReady = useCallback(() => {
    setStatus('ready');
    setErrorInfo(undefined);
    void eventsApi.notifyReady();
  }, [eventsApi]);

  const handleError = useCallback(
    (code: string, message: string) => {
      setStatus('error');
      setErrorInfo({ code, message });
      void eventsApi.notifyError({ code, message });
    },
    [eventsApi],
  );

  const rendererRuntime = useRendererRuntime();

  // plan 2026-08-04-2242-1 Phase 1 Decision（诊断出口裁定）：flux 编译/求值失败 + 用户侧图元事件
  // 处理器 throw 走一条**非升级**诊断通道（option b）。出口实现：
  //  - `console.warn('[scada-canvas]', code, message)` 保底可见（dev+prod；去重已在上游
  //    `useScadaPointsBridge.reportOnce`/`EventBridge.reportHandlerError` 完成，故每唯一错误仅 fire 一次）；
  //  - flux 表达式错误（`flux-compile-failed`/`flux-evaluate-failed`/`flux-deps-empty`，plan 2026-08-05-0325-1）
  //    额外复用既有 host telemetry 钩子 `env.monitor.onError`（`ExpressionExecutionEnv.monitor`，
  //    phase:'expression'；handler-error 的 'action' phase 超出现 monitor 类型，host telemetry 后置，Follow-up）。
  //  不违反 §8.1：诊断 ≠ status 升级——此处不动 `setStatus`/`setErrorInfo`/`eventsApi.notifyError`，
  //  画布保持 ready，不派发 `scada:error`（§8.1 onError 仅 config 校验/构建失败）。
  //  出口整体 try/catch 自保护——通道自身 throw 不得回流 engine/hook（Failure Paths channel-outlet-throws）。
  //
  // plan 2026-08-05-0653-4 C3（multi-audit P2-4）：第三参 `error?` 透传——host 监控收到的 Error 经
  // `new Error(message, { cause: error })` 包装，保留原始 stack/cause 链，可定位 formula evaluator 源。
  // 旧实现 `new Error(message)`（无 cause）丢失原始 stack，host 无法归因。`error?` 可选 → 向后兼容
  // 现有 2-arg 调用方（`onHandlerError` 路径未提供原始 error，按 message-only 包装）。
  const reportDiagnostic = useCallback(
    (code: string, message: string, error?: unknown) => {
      try {
        console.warn('[scada-canvas]', code, message);
        if (
          code === 'flux-compile-failed' ||
          code === 'flux-evaluate-failed' ||
          code === 'flux-deps-empty'
        ) {
          const reportedError = error === undefined ? new Error(message) : new Error(message, { cause: error });
          rendererRuntime.env.monitor?.onError?.({
            phase: 'expression',
            error: reportedError,
            details: { code },
          });
        }
      } catch {
        // 诊断通道自身异常隔离：不得回流 engine/hook
      }
    },
    [rendererRuntime.env],
  );

  const runtimeRef = useRef<ScadaCanvasRuntime | null>(null);

  const getPointValuesForLatest = useCallback((symbolId: string) => {
    const current = runtimeRef.current;
    if (!current) return undefined;
    const values: Record<string, unknown> = {};
    for (const target of current.reverseIndex.lookupSymbol(symbolId)) {
      const value = current.pointStore.getPointValue(target.pointId);
      if (value !== undefined) values[target.pointId] = value;
    }
    return Object.keys(values).length > 0 ? values : undefined;
  }, []);

  const { runtime, reloadBindings, destroy } = useScadaEngine({
    containerRef,
    cid: props.meta.cid,
    exposeTestHandle: true,
    interactionLayer: true,
    width: props.props.width,
    height: props.props.height,
    onSymbolEvent: (name, payload) => eventsApi.onSymbolEvent(name, payload),
    getPointValuesFor: getPointValuesForLatest,
    onEngineError: handleError,
    // plan 2026-08-04-2242-1 Phase 2：接通用户侧图元事件处理器 throw 的去重上报通道
    // （engine `EventBridge.safeRun`/`reportHandlerError` 已去重，此处仅订阅消费者）。
    onHandlerError: (error) =>
      reportDiagnostic('handler-error', error instanceof Error ? error.message : String(error)),
  });

  // plan 2026-08-04-1558-2 Phase 1：component:destroy 后画布状态可见（OP-4）——
  // destroy 句柄回调置 destroyed，wrapper data-status 反映销毁态，e2e/tooling 不再把已销毁画布报为 healthy。
  const handleDestroyed = useCallback(() => {
    setStatus('destroyed');
  }, []);

  useEffect(() => {
    engineRef.current = runtime?.engine;
  }, [runtime]);

  useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime]);

  // plan 2026-08-04-1558-3 Phase 1：canvas slot 落点——把 data-slot 与 marker 语义落到真实 leafer
  // canvas DOM 元素（leafer App 在 containerRef 内创建 <canvas>）。wrapper 占位 div 仅保留 marker class
  // （styles.css 定位规则目标一致，F8）；mock 环境经 MockApp 同样挂 canvas 元素（mock↔真实对齐）。
  useEffect(() => {
    if (!runtime || !containerRef.current) return;
    const canvas = containerRef.current.querySelector('canvas');
    if (!canvas) return;
    canvas.setAttribute('data-slot', 'scada-canvas-canvas');
    canvas.classList.add('nop-scada-canvas-canvas');
  }, [runtime]);

  useEffect(() => {
    if (parseError) {
      void eventsApi.notifyError(parseError);
    }
  }, [parseError, eventsApi]);

  const { syncImported } = useScadaConfigSync({
    config: parsedConfig,
    runtime,
    reloadBindings,
    viewport: props.props.viewport,
    onBuilt: handleReady,
    onBuildError: handleError,
  });

  useScadaPointsBridge({
    config: parsedConfig,
    runtime,
    enabled: runtime !== null && parsedConfig !== undefined,
    expressionCompiler: rendererRuntime.expressionCompiler,
    env: rendererRuntime.env,
    // plan 2026-08-04-2242-1 Phase 1：接通 flux 编译/求值失败的去重上报通道（hook 内
    // `reportOnce` 已按同表达式同错误码去重，求值成功后清空记录）。走非升级诊断出口
    // `reportDiagnostic`（console.warn + env.monitor），不直通 handleError——数据错误不升级
    // 画布级 error（§8.1 onError 仅限 config 校验/构建失败），scope 数据修复后点值自动回流。
    onError: reportDiagnostic,
  });

  useScadaHandles({
    componentRegistry: useCurrentComponentRegistry(),
    id: props.id,
    cid: props.meta.cid,
    runtime,
    destroy,
    onDestroyed: handleDestroyed,
    // plan 2026-08-04-2243-1 Phase 3 L6：reloadConfig 稳定身份（依赖 runtime + syncImported），
    // 消除每渲染新内联箭头 → useScadaHandles effect 不每渲染重登/反注 handle。
    reloadConfig: useCallback(
      (config: ScadaConfig) => {
        const current = runtimeRef.current;
        if (!current) return;
        syncImported(config);
      },
      [syncImported],
    ),
  });

  const { loading, empty } = props.regions;
  const effectiveStatus: ScadaCanvasStatus = parseError ? 'error' : status;

  return (
    <div
      ref={containerRef}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid !== undefined ? String(props.meta.cid) : undefined}
      data-slot="scada-canvas"
      data-status={effectiveStatus}
      className={cn('nop-scada-canvas h-full w-full', props.meta.className)}
    >
      {effectiveStatus === 'loading' ? (
        asReactNode(loading?.render()) ?? <div data-slot="scada-canvas-loading" className="nop-scada-canvas-loading" />
      ) : effectiveStatus === 'error' ? (
        asReactNode(empty?.render({ bindings: { error: parseError ?? errorInfo } })) ?? (
          <div data-slot="scada-canvas-error" className="nop-scada-canvas-error" data-code={parseError?.code ?? errorInfo?.code}>
            {resolveErrorText(parseError ?? errorInfo) || t('industrial.scada.canvasError')}
          </div>
        )
      ) : (
        <div className="nop-scada-canvas-canvas" />
      )}
    </div>
  );
}

export const ScadaCanvas = ScadaCanvasRenderer;
