import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
import { scadaEditorErrorI18nKey } from './renderer/editor-errors.js';
import { projectSessionChange, type ScadaEditorSession } from './editor-session.js';
import { EditorPalettePanel } from './palette/editor-palette.js';
import { EditorInspectorPanel } from './inspector/inspector-panel.js';
import { EditorToolboxPanel } from './toolbox/toolbox-panel.js';
import { collectWorldBounds } from './editor-working-helpers.js';
import { hasScadaSymbol } from '../symbols/symbol-registry.js';
import type { Bounds } from '../engine/viewport.js';

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
      return { error: { code: 'config-invalid', message: result.errors.join('; ') } };
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

  // plan 2026-08-08-0900-2 Phase 4 / #20：移除冗余 useCallback（React Compiler + latest-ref 模式处理）。
  // useMemo 保留：parsedConfig 经 useEditorEngine useEffect identity check（args.initialConfig === loadedConfigRef.current），
  // 移除会导致每次渲染新对象 → load 循环（load-bearing，非冗余）。
  const { config: parsedConfig, error: parseError } = useMemo(
    () => parseAndValidateConfig(props.props.config),
    [props.props.config],
  );

  const dispatchEvent = (type: string, payload: Record<string, unknown>, action: unknown) => {
    const normalized = createNormalizedActionEvent({ type, ...payload });
    if (!action || typeof action !== 'object') return undefined;
    return helpersRef.current.dispatch(action as ActionSchema, {
      event: normalized,
      scope: scopeRef.current,
    });
  };

  const handleReady = () => {
    setStatus('ready');
    setErrorInfo(undefined);
    dispatchEvent('scada-editor:ready', { type: 'scada-editor:ready' }, eventsRef.current?.onReady);
  };

  const handleError = (code: string, message: string) => {
    setStatus('error');
    setErrorInfo({ code, message });
    dispatchEvent('scada-editor:error', { code, message }, eventsRef.current?.onError);
  };

  const handleSelectionChange = (nodeIds: string[]) => {
    setSelection(nodeIds);
    dispatchEvent(
      'scada-editor:selectionChange',
      { listNodeIds: nodeIds },
      eventsRef.current?.onSelectionChange,
    );
  };

  const handleModeChange = (mode: 'edit' | 'preview') => {
    dispatchEvent('scada-editor:modeChange', { mode }, eventsRef.current?.onModeChange);
  };

  const handleSessionChange = (session: ScadaEditorSession) => {
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
  };

  // plan 2026-08-07-1835-2 Phase 2 / multi P1-04：save 经 runtime-mutators save() → latest.onSave
  // 触发此处 → 派发 scada-editor:save schema 事件（payload=serializedConfig）。此前 schema 声明 onSave 但 0 dispatch。
  const handleSave = (serializedConfig: string) => {
    dispatchEvent(
      'scada-editor:save',
      { serializedConfig },
      eventsRef.current?.onSave,
    );
  };

  // plan 2026-08-07-1835-2 Phase 2 / multi P1-04：load 经 runtime-mutators load() → latest.onLoad
  // 触发此处 → 派发 scada-editor:load schema 事件（payload=parsed config）。
  const handleLoad = (config: ScadaConfig) => {
    dispatchEvent(
      'scada-editor:load',
      { config },
      eventsRef.current?.onLoad,
    );
  };

  // plan 2026-08-07-1835-2 Phase 2 / multi P1-06：component:destroy() 句柄触发 → 置 destroyed 态（§8.3 OP-4）。
  const handleDestroyed = () => {
    setStatus('destroyed');
  };

  const { runtime, setResizeRefit } = useEditorEngine({
    containerRef,
    cid: props.meta.cid,
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
  const { loading, empty, palette, inspector, toolbox, statusBar, error: errorRegion } = props.regions;
  const activeError = parseError ?? errorInfo;
  const errorText = activeError ? activeError.message : '';
  const errorCode = activeError?.code;

  const selectedNodeId = selection[0];
  const cidAttr = props.meta.cid !== undefined ? String(props.meta.cid) : undefined;
  const disabled = props.meta.disabled === true;

  // plan 2026-08-08-0900-1 Phase 4 / P2 #40：width/height props 尺寸化根容器（编辑器足迹），
  // canvas 区由 layout-canvas div（flex:1）+ ResizeObserver 驱动 engine.setSize（不再 width/height→canvas 拉伸）。
  const rootStyle: CSSProperties = {};
  if (props.props.width !== undefined) rootStyle.width = props.props.width;
  if (props.props.height !== undefined) rootStyle.height = props.props.height;

  // plan 2026-08-08-0900-1 Phase 3 / P2 #9：消费 viewport prop（fit/center policy）→ mount 后应用到 engine。
  // plan 2026-08-08-0900-1 Phase 5 / P2 #30：接线 ScadaEditorViewportPolicy 类型（不再 inline 重复）。
  const viewportPolicy = props.props.viewport;
  const viewportAppliedRef = useRef(false);
  useEffect(() => {
    if (!runtime || !viewportPolicy) return;
    if (!viewportAppliedRef.current) {
      viewportAppliedRef.current = true;
      const bounds = computeAggregateViewportBounds(runtime.session.workingConfig.symbols);
      if (bounds) {
        if (viewportPolicy.fit === 'contain') runtime.engine.fit(bounds, 0);
        if (viewportPolicy.center) runtime.engine.center(bounds);
      }
    }
    // plan 2026-08-08-1809-3 Phase 3 / P1-5：装配 resize refit 回调（与 runtime scada-canvas 同型修复）。
    // 旧实现 mount-once 后 ResizeObserver 仅 setSize 不 refit → 响应式容器下 viewport 失真。
    // 经 setResizeRefit 稳定 setter 注册 refit 闭包（不 mutate 传入 ref，react-compiler/immutability 友好）；
    // use-editor-engine 的 ResizeObserver handler 经 runtime.refitViewportOnResize（稳定闭包读 refitRef）调用。
    // 复用本组件既有的 computeAggregateViewportBounds + engine.fit/center（无双实现漂移）。
    setResizeRefit(() => {
      if (!viewportPolicy) return;
      const bounds = computeAggregateViewportBounds(runtime.session.workingConfig.symbols);
      if (!bounds) return;
      if (viewportPolicy.fit === 'contain') runtime.engine.fit(bounds, 0);
      if (viewportPolicy.center) runtime.engine.center(bounds);
    });
    return () => setResizeRefit(undefined);
  }, [runtime, viewportPolicy, setResizeRefit]);

  // plan 2026-08-08-0900-1 Phase 4 / P2 #40：canvas containment——data-slot 落在 canvas-area div
  // （containerRef），palette/inspector 为其兄弟（外层 flex layout）。leafer <canvas> inset:0 填充 canvas 区，
  // 不再覆盖兄弟 panel。loading/error 经 absolute overlay 覆盖 canvas 区。
  const showLayoutBody = runtime !== null && effectiveStatus !== 'loading' && effectiveStatus !== 'error';

  return (
    <div
      data-testid={props.meta.testid || undefined}
      className={cn('nop-scada-editor-layout', props.meta.className)}
      style={rootStyle}
    >
      {showLayoutBody
        ? asReactNode(toolbox?.render({ bindings: { selection } })) ?? (
            <EditorToolboxPanel runtime={runtime} selection={selection} onError={handleError} />
          )
        : null}
      {/* plan 2026-08-08-0900-1 Phase 4 / P2 #40：body 行含 palette | canvas | inspector 三栏，
          toolbox（顶）/ statusBar（底）为列方向兄弟——避免 toolbox 宽按钮挤压缩 canvas 到 0。 */}
      <div className="nop-scada-editor-body">
        {showLayoutBody
          ? asReactNode(palette?.render()) ?? <EditorPalettePanel runtime={runtime} onError={handleError} />
          : null}
        <div
          ref={containerRef}
          data-cid={cidAttr}
          data-slot="scada-editor-canvas"
          data-status={effectiveStatus}
          data-mode={props.props.mode ?? 'edit'}
          className="nop-scada-editor-canvas nop-scada-editor-layout-canvas"
          tabIndex={0}
          role="application"
          aria-label={t('industrial.scada.editor.canvasLabel')}
          aria-disabled={disabled || undefined}
          inert={disabled || undefined}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          const type = e.dataTransfer.getData('application/x-scada-symbol-type');
          if (type && runtime) {
            // plan 2026-08-08-1931-1 Phase 1 / F11：drop 入口符号类型校验——
            // 未注册 / 拼写错误 / 已注销的 type 不进入 working copy/engine（静默忽略 + onError 上报
            // invalid-node，code 已在 SCADA_EDITOR_ERROR_CODES 注册）。不调 handleError（避免置 status='error'
            // 破坏整个编辑器；drop 被忽略是 non-fatal）。与 group/connection id 纪律一致：未知 type 早退。
            // plan 2026-08-09-1300-1 Phase 2 / 1931-P2-6（Option A wire-in）：code→i18n-key 解析经
            // scadaEditorErrorI18nKey（editor-errors.ts 中心映射），不再硬编码 'industrial.scada.editor.error.<code>'。
            // 使 .unknown fallback 成为真实安全网（未注册码不再渲染 raw dotted key）+ 给 editor-errors.ts
            // 一个生产 importer（消除「带测试的零-importer 死代码」）。
            if (!hasScadaSymbol(type)) {
              dispatchEvent(
                'scada-editor:error',
                { code: 'invalid-node', message: t(scadaEditorErrorI18nKey('invalid-node')) },
                eventsRef.current?.onError,
              );
              return;
            }
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
          if (!runtime || disabled) return;
          const sel = selection;
          const ctrl = e.ctrlKey || e.metaKey;
          const key = e.key.toLowerCase();
          if (key === 'delete' || key === 'backspace') {
            if (sel.length === 0) return;
            e.preventDefault();
            // plan 2026-08-08-1931-1 Phase 3 / P2-4：批量单 diff——传完整 selection，产 1 undo entry。
            runtime.removeWorkingSymbol(sel);
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
            // plan 2026-08-08-1931-1 Phase 3 / P2-4：批量单 diff——传完整 selection，产 1 undo entry。
            runtime.ungroupSymbols(sel);
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
      >
        {/* plan 2026-08-08-0900-1 Phase 3 / P2 #12：empty region 正确归所——ready 但无图元时显示空场景提示（canvas 区内 overlay）。 */}
        {showLayoutBody && runtime.session.workingConfig.symbols.length === 0
          ? asReactNode(empty?.render()) ?? (
              <div data-slot="scada-editor-empty" className="nop-scada-editor-empty">
                {t('industrial.scada.editor.emptyScene')}
              </div>
            )
          : null}

        {effectiveStatus === 'loading'
          ? asReactNode(loading?.render()) ?? (
              <div data-slot="scada-editor-loading" className="nop-scada-editor-loading">
                {t('industrial.scada.editor.loading')}
              </div>
            )
          : null}
        {effectiveStatus === 'error'
          ? // plan 2026-08-08-0900-1 Phase 3 / P2 #13：error 分支用 error region（非 empty region），消除语义错配。
            asReactNode(errorRegion?.render({ bindings: { error: activeError } })) ?? (
              <div data-slot="scada-editor-error" className="nop-scada-editor-error" data-code={errorCode}>
                {errorText || t('industrial.scada.editor.canvasError')}
              </div>
            )
          : null}
      </div>
      {showLayoutBody
        ? asReactNode(inspector?.render({ bindings: { nodeId: selectedNodeId } })) ?? (
            <EditorInspectorPanel runtime={runtime} selectedNodeId={selectedNodeId} onError={handleError} />
          )
        : null}
      </div>
      {showLayoutBody
        ? asReactNode(statusBar?.render()) ?? (
            // plan 2026-08-08-0900-1 Phase 3 / P2 #11：statusBar 内置 fallback（发射 marker），不再恒 null。
            <div data-slot="scada-editor-status-bar" className="nop-scada-editor-status-bar" />
          )
        : null}
    </div>
  );
}

export const ScadaEditorCanvas = ScadaEditorCanvasRenderer;

/**
 * 计算全部图元（含 group 嵌套）的聚合世界包围盒（plan 2026-08-08-0900-1 Phase 3 / P2 #9 viewport policy 消费用）。
 * 复用 collectWorldBounds（与 toolbox-runtime computeBounds 同语义）；跳过零尺寸节点。
 */
function computeAggregateViewportBounds(symbols: ScadaConfig['symbols']): Bounds | undefined {
  const worldBounds = collectWorldBounds(symbols, 0, 0);
  let out: Bounds | undefined;
  for (const b of worldBounds) {
    if (b.width <= 0 || b.height <= 0) continue;
    if (out === undefined) {
      out = { x: b.x, y: b.y, width: b.width, height: b.height };
    } else {
      const minX = Math.min(out.x, b.x);
      const minY = Math.min(out.y, b.y);
      const maxX = Math.max(out.x + out.width, b.x + b.width);
      const maxY = Math.max(out.y + out.height, b.y + b.height);
      out = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
  }
  return out;
}
