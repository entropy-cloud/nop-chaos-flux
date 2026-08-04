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

  const rendererRuntime = useRendererRuntime();
  useScadaPointsBridge({
    config: parsedConfig,
    runtime,
    enabled: runtime !== null && parsedConfig !== undefined,
    expressionCompiler: rendererRuntime.expressionCompiler,
    env: rendererRuntime.env,
    // P1-8 降级契约：flux 数据错误（编译/求值失败）按声明跳过 + 单次去重上报（hook 内 onError），
    // 不直通 handleError——数据错误不升级画布级 error（§8.1 onError 仅限 config 校验/构建失败），
    // scope 数据修复后点值自动回流，画面保持 ready。
  });

  useScadaHandles({
    componentRegistry: useCurrentComponentRegistry(),
    id: props.id,
    cid: props.meta.cid,
    runtime,
    destroy,
    onDestroyed: handleDestroyed,
    reloadConfig: (config) => {
      const current = runtimeRef.current;
      if (!current) return;
      syncImported(config);
    },
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
        <div data-slot="scada-canvas-canvas" className="nop-scada-canvas-canvas" />
      )}
    </div>
  );
}

export const ScadaCanvas = ScadaCanvasRenderer;
