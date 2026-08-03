import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useCurrentComponentRegistry, useRendererRuntime } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import { parseScadaConfig } from '../serialization/parse.js';
import { validateScadaConfig } from '../serialization/validate.js';
import type { ScadaConfig } from '../serialization/config-types.js';
import type { ScadaCanvasSchema, ScadaCanvasEvents } from '../schemas.js';
import { useScadaEngine, type ScadaCanvasRuntime } from './hooks/use-scada-engine.js';
import { errorMessage } from './scada-errors.js';
import { useScadaConfigSync } from './hooks/use-scada-config-sync.js';
import { useScadaPointsBridge } from './hooks/use-scada-points-bridge.js';
import { useScadaEvents } from './hooks/use-scada-events.js';
import { useScadaHandles } from './hooks/use-scada-handles.js';

export type ScadaCanvasStatus = 'loading' | 'ready' | 'error';

export interface ScadaCanvasErrorInfo {
  code: string;
  message: string;
}

function parseAndValidateConfig(
  raw: unknown,
): { config?: ScadaConfig; error?: ScadaCanvasErrorInfo } {
  if (raw === undefined || raw === null || raw === '') {
    return {};
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

  const { config: parsedConfig, error: parseError } = useMemo(
    () => parseAndValidateConfig(props.props.config),
    [props.props.config],
  );

  const eventsApi = useScadaEvents({
    events: props.props.events as ScadaCanvasEvents | undefined,
    helpers: props.helpers,
    scope: props.node?.scope,
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
    width: props.props.width,
    height: props.props.height,
    onSymbolEvent: (name, payload) => eventsApi.onSymbolEvent(name, payload),
    getPointValuesFor: getPointValuesForLatest,
    onEngineError: handleError,
  });

  useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime]);

  useEffect(() => {
    if (parseError) {
      void eventsApi.notifyError(parseError);
    }
  }, [parseError, eventsApi]);

  useScadaConfigSync({
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
    onError: handleError,
  });

  useScadaHandles({
    componentRegistry: useCurrentComponentRegistry(),
    id: props.id,
    cid: props.meta.cid,
    runtime,
    destroy,
    reloadConfig: (config) => {
      const current = runtimeRef.current;
      if (!current) return;
      current.engine.reset(config);
      reloadBindings(config.variables, config.symbols);
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
            {(parseError ?? errorInfo)?.message ?? 'Scada canvas error'}
          </div>
        )
      ) : (
        <div data-slot="scada-canvas-canvas" className="nop-scada-canvas-canvas" />
      )}
    </div>
  );
}

export const ScadaCanvas = ScadaCanvasRenderer;
