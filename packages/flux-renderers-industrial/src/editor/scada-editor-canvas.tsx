import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
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
import { EditorToolboxPanel } from './toolbox/toolbox-panel.js';

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
  // session 反应式通道（plan 2026-08-07-1835-1 Phase 1 / open P1-A）：
  // `runtime.session.*` 是 ref-held 可变对象（INV-4），不进 React 状态；notifySession 经 handleSessionChange
  // 派发 schema 事件外，还 bump 此计数器，触发本组件重渲染 → 子 panel（toolbox Undo/Redo disabled、
  // inspector fieldErrors）随之重渲染并读最新 session 状态。属性编辑后 Undo 按钮立即启用（无需重选）。
  const [, bumpSessionVersion] = useReducer((n: number) => n + 1, 0);
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
      // 反应式 tick：session 任意 mutator（属性编辑 / undo 入栈 / 移动联动）后 bump 计数器，
      // 触发本组件 + 子 panel 重渲染，使 toolbox Undo/Redo disabled、inspector fieldErrors
      // 从最新 session 派生（不再依赖 selection 变更才刷新）。
      bumpSessionVersion();
    },
    [dispatchEvent],
  );

  // plan 2026-08-07-1835-2 Phase 2 / multi P1-04：save 经 runtime-mutators save() → latest.onSave
  // 触发此处 → 派发 scada-editor:save schema 事件（payload=serializedConfig）。此前 schema 声明 onSave 但 0 dispatch。
  const handleSave = useCallback(
    (serializedConfig: string) => {
      dispatchEvent(
        'scada-editor:save',
        { serializedConfig },
        eventsRef.current?.onSave,
      );
    },
    [dispatchEvent],
  );

  // plan 2026-08-07-1835-2 Phase 2 / multi P1-04：load 经 runtime-mutators load() → latest.onLoad
  // 触发此处 → 派发 scada-editor:load schema 事件（payload=parsed config）。
  const handleLoad = useCallback(
    (config: ScadaConfig) => {
      dispatchEvent(
        'scada-editor:load',
        { config },
        eventsRef.current?.onLoad,
      );
    },
    [dispatchEvent],
  );

  // plan 2026-08-07-1835-2 Phase 2 / multi P1-06：component:destroy() 句柄触发 → 置 destroyed 态（§8.3 OP-4）。
  const handleDestroyed = useCallback(() => {
    setStatus('destroyed');
  }, []);

  const runtime = useEditorEngine({
    containerRef,
    cid: props.meta.cid,
    width: props.props.width,
    height: props.props.height,
    initialConfig: parsedConfig ?? EMPTY_EDITOR_CONFIG,
    initialMode: props.props.mode,
    commitPolicy: props.props.commitPolicy,
    onReady: handleReady,
    onError: handleError,
    onSelectionChange: handleSelectionChange,
    onModeChange: handleModeChange,
    onSessionChange: handleSessionChange,
    onSave: handleSave,
    onLoad: handleLoad,
  });

  useEditorHandles({
    componentRegistry: useCurrentComponentRegistry(),
    id: props.id,
    cid: props.meta.cid,
    runtime,
    onDestroyed: handleDestroyed,
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
  const { loading, empty, palette, inspector, toolbox, statusBar } = props.regions;
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
          {/* eslint-disable jsx-a11y/no-static-element-interactions -- canvas drop + keyboard target */}
          <div
            className="nop-scada-editor-layout-canvas"
            tabIndex={0}
            onDrop={(e) => {
              e.preventDefault();
              const type = e.dataTransfer.getData('application/x-scada-symbol-type');
              if (type && runtime) {
                idCounter.current += 1;
                const id = `${type}-${idCounter.current}`;
                // plan 2026-08-07-1835-2 Phase 3 / multi P1-11：palette drop 落在指针处
                // （此前硬编码 x:50,y:50 堆叠）。用 canvas rect + engine.getWorldPoint 换算世界坐标，
                // symbol 居中指针处（复用 connection 子系统的 getBoundingClientRect + getWorldPoint 管线）。
                const rect = e.currentTarget.getBoundingClientRect();
                const viewX = e.clientX - rect.left;
                const viewY = e.clientY - rect.top;
                const world = runtime.engine.getWorldPoint({ x: viewX, y: viewY });
                runtime.addWorkingSymbol({
                  id,
                  type,
                  x: Math.round(world.x - 50),
                  y: Math.round(world.y - 50),
                  width: 100,
                  height: 100,
                });
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }}
            // plan 2026-08-07-1835-2 Phase 3 / open P1-B：键盘层——Delete/Ctrl+Z/Y/Ctrl+G/Ctrl+Shift+G/arrows
            // （此前 grep keydown 0 hits，delete/group/ungroup 仅 component:* handle 可达）。
            onKeyDown={(e) => {
              if (!runtime) return;
              const sel = selection;
              const ctrl = e.ctrlKey || e.metaKey;
              const key = e.key.toLowerCase();
              if (key === 'delete' || key === 'backspace') {
                if (sel.length === 0) return;
                e.preventDefault();
                for (const id of sel) runtime.removeWorkingSymbol(id);
              } else if (ctrl && !e.shiftKey && key === 'z') {
                e.preventDefault();
                runtime.undo();
              } else if ((ctrl && !e.shiftKey && key === 'y') || (ctrl && e.shiftKey && key === 'z')) {
                e.preventDefault();
                runtime.redo();
              } else if (ctrl && !e.shiftKey && key === 'g') {
                if (sel.length >= 2) {
                  e.preventDefault();
                  runtime.groupSymbols(sel);
                }
              } else if (ctrl && e.shiftKey && key === 'g') {
                e.preventDefault();
                for (const id of sel) {
                  const node = runtime.session.workingConfig.symbols.find((s) => s.id === id);
                  if (node?.type === 'scada-group') runtime.ungroupSymbols(id);
                }
              } else if (key === 'arrowleft' || key === 'arrowright' || key === 'arrowup' || key === 'arrowdown') {
                if (sel.length === 0) return;
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1;
                const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0;
                const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;
                for (const id of sel) {
                  const node = runtime.session.workingConfig.symbols.find((s) => s.id === id);
                  if (node) runtime.updateWorkingNode(id, { x: (node.x ?? 0) + dx, y: (node.y ?? 0) + dy });
                }
              }
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
          {asReactNode(toolbox?.render({ bindings: { selection } })) ?? (
            <EditorToolboxPanel runtime={runtime!} selection={selection} onError={handleError} />
          )}
          {asReactNode(statusBar?.render()) ?? null}
        </div>
      )}
    </div>
  );
}

export const ScadaEditorCanvas = ScadaEditorCanvasRenderer;
