import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ActionSchema, RendererComponentProps, RendererHelpers, ScopeRef } from '@nop-chaos/flux-core';
import { createNormalizedActionEvent, useCurrentComponentRegistry } from '@nop-chaos/flux-react';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import { parseScadaConfig } from '../serialization/parse.js';
import { validateScadaConfig } from '../serialization/validate.js';
import type { ScadaConfig } from '../serialization/config-types.js';
import type { ScadaEditorCanvasSchema, ScadaEditorCanvasEvents } from './schemas.js';
import { useEditorEngine } from './renderer/hooks/use-editor-engine.js';
import { useEditorHandles } from './renderer/hooks/use-editor-handles.js';
import { projectSessionChange, type ScadaEditorSession } from './editor-session.js';
import { EditorPalettePanel } from './palette/editor-palette.js';
import { EditorInspectorPanel } from './inspector/inspector-panel.js';

export type ScadaEditorCanvasStatus = 'loading' | 'ready' | 'error' | 'destroyed';

export interface ScadaEditorCanvasErrorInfo {
  code: string;
  message: string;
}

const EMPTY_EDITOR_CONFIG: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [],
};

function parseAndValidateConfig(
  raw: unknown,
): { config?: ScadaConfig; error?: ScadaEditorCanvasErrorInfo } {
  if (raw === undefined || raw === null || raw === '') {
    return { config: EMPTY_EDITOR_CONFIG };
  }
  try {
    const config = parseScadaConfig(raw as string | object);
    const result = validateScadaConfig(config);
    if (!result.ok) {
      return { error: { code: 'invalid-config', message: result.errors.join('; ') } };
    }
    return { config };
  } catch (error) {
    return {
      error: {
        code: 'config-parse',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function asReactNode(value: unknown): ReactNode {
  return value as ReactNode;
}

/**
 * `scada-editor-canvas` 编辑态画布渲染器（E5.1，design-renderer.md §4.1/§8/§10）。
 *
 * RendererComponentProps 契约装配；Editor 实例 + 编辑会话 + 适配层经 useEditorEngine hook 承接；
 * 双态切换（edit ↔ preview）经 `mode` prop + `switchMode`；测试句柄 `window.__flux_scada_editor_<cid>`
 * （§8.4 契约）经 hook 挂载/移除。
 *
 * **R5 双态隔离**：edit 模式适配层只更新 working copy + selection（不派发 symbol:* action）。
 */
export function ScadaEditorCanvasRenderer(props: RendererComponentProps<ScadaEditorCanvasSchema>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<ScadaEditorCanvasStatus>('loading');
  const [errorInfo, setErrorInfo] = useState<ScadaEditorCanvasErrorInfo | undefined>();
  const [selection, setSelection] = useState<string[]>([]);
  const idCounter = useRef(0);
  const { t } = useFluxTranslation();

  const events = props.props.events as ScadaEditorCanvasEvents | undefined;
  const helpersRef = useRef<RendererHelpers>(props.helpers);
  const scopeRef = useRef<ScopeRef | undefined>(props.node?.scope);
  const eventsRef = useRef<ScadaEditorCanvasEvents | undefined>(events);
  useEffect(() => {
    helpersRef.current = props.helpers;
    scopeRef.current = props.node?.scope;
    eventsRef.current = events;
  });

  const { config: parsedConfig, error: parseError } = useMemo(
    () => parseAndValidateConfig(props.props.config),
    [props.props.config],
  );

  const dispatchEvent = useCallback(
    (type: string, payload: Record<string, unknown>, action: unknown) => {
      const normalized = createNormalizedActionEvent({ type, ...payload });
      if (!action || typeof action !== 'object') return undefined;
      return helpersRef.current.dispatch(action as ActionSchema, {
        event: normalized,
        scope: scopeRef.current,
      });
    },
    [],
  );

  const handleReady = useCallback(() => {
    setStatus('ready');
    setErrorInfo(undefined);
    dispatchEvent('scada-editor:ready', { type: 'scada-editor:ready' }, eventsRef.current?.onReady);
  }, [dispatchEvent]);

  const handleError = useCallback(
    (code: string, message: string) => {
      setStatus('error');
      setErrorInfo({ code, message });
      dispatchEvent('scada-editor:error', { code, message }, eventsRef.current?.onError);
    },
    [dispatchEvent],
  );

  const handleSelectionChange = useCallback(
    (nodeIds: string[]) => {
      setSelection(nodeIds);
      dispatchEvent(
        'scada-editor:selectionChange',
        { listNodeIds: nodeIds },
        eventsRef.current?.onSelectionChange,
      );
    },
    [dispatchEvent],
  );

  const handleModeChange = useCallback(
    (mode: 'edit' | 'preview') => {
      dispatchEvent('scada-editor:modeChange', { mode }, eventsRef.current?.onModeChange);
    },
    [dispatchEvent],
  );

  const handleSessionChange = useCallback(
    (session: ScadaEditorSession) => {
      const payload = projectSessionChange(session);
      dispatchEvent(
        'scada-editor:sessionChange',
        {
          canUndo: payload.canUndo,
          canRedo: payload.canRedo,
          selection: payload.selection,
          mode: payload.mode,
        },
        eventsRef.current?.onSessionChange,
      );
    },
    [dispatchEvent],
  );

  const runtime = useEditorEngine({
    containerRef,
    cid: props.meta.cid,
    width: props.props.width,
    height: props.props.height,
    initialConfig: parsedConfig ?? EMPTY_EDITOR_CONFIG,
    initialMode: props.props.mode,
    onReady: handleReady,
    onError: handleError,
    onSelectionChange: handleSelectionChange,
    onModeChange: handleModeChange,
    onSessionChange: handleSessionChange,
  });

  useEditorHandles({
    componentRegistry: useCurrentComponentRegistry(),
    id: props.id,
    cid: props.meta.cid,
    runtime,
  });

  // canvas slot 落点（design-renderer.md §10）：leafer App 在 containerRef 内创建 <canvas>，
  // 标记 data-slot="scada-editor-canvas-canvas" + marker class。
  useEffect(() => {
    if (!runtime || !containerRef.current) return;
    const canvas = containerRef.current.querySelector('canvas');
    if (!canvas) return;
    canvas.setAttribute('data-slot', 'scada-editor-canvas-canvas');
    canvas.classList.add('nop-scada-editor-canvas-canvas');
  }, [runtime]);

  const effectiveStatus: ScadaEditorCanvasStatus = parseError ? 'error' : status;
  const { loading, empty, palette, inspector } = props.regions;
  const activeError = parseError ?? errorInfo;
  const errorText = activeError ? activeError.message : '';
  const errorCode = activeError?.code;

  const selectedNodeId = selection[0];
  const cidAttr = props.meta.cid !== undefined ? String(props.meta.cid) : undefined;

  return (
    <div
      ref={containerRef}
      data-testid={props.meta.testid || undefined}
      data-cid={cidAttr}
      data-slot="scada-editor-canvas"
      data-status={effectiveStatus}
      data-mode={props.props.mode ?? 'edit'}
      className={cn('nop-scada-editor-canvas', props.meta.className)}
    >
      {effectiveStatus === 'loading' ? (
        asReactNode(loading?.render()) ?? (
          <div data-slot="scada-editor-loading" className="nop-scada-editor-loading">
            {t('industrial.scada.editor.loading')}
          </div>
        )
      ) : effectiveStatus === 'error' ? (
        asReactNode(empty?.render({ bindings: { error: activeError } })) ?? (
          <div
            data-slot="scada-editor-error"
            className="nop-scada-editor-error"
            data-code={errorCode}
          >
            {errorText || t('industrial.scada.editor.canvasError')}
          </div>
        )
      ) : (
        <div className="nop-scada-editor-layout">
          {asReactNode(palette?.render()) ?? (
            <EditorPalettePanel runtime={runtime!} onError={handleError} />
          )}
          {/* eslint-disable jsx-a11y/no-static-element-interactions -- canvas drop target */}
          <div
            className="nop-scada-editor-layout-canvas"
            onDrop={(e) => {
              e.preventDefault();
              const type = e.dataTransfer.getData('application/x-scada-symbol-type');
              if (type && runtime) {
                idCounter.current += 1;
                const id = `${type}-${idCounter.current}`;
                runtime.addWorkingSymbol({ id, type, x: 50, y: 50, width: 100, height: 100 });
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }}
          />
          {asReactNode(
            inspector?.render({ bindings: { nodeId: selectedNodeId } }),
          ) ?? (
            <EditorInspectorPanel
              runtime={runtime!}
              selectedNodeId={selectedNodeId}
              onError={handleError}
            />
          )}
          {/* toolbox/statusBar regions reserved for M3/E9.1（design-renderer.md §4.4）；M1 无默认内容，host 经 region override 注入。 */}
        </div>
      )}
    </div>
  );
}

export const ScadaEditorCanvas = ScadaEditorCanvasRenderer;
