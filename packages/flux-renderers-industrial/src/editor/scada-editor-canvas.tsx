import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
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
import { useHostScope, useStatusPathPublication, WorkbenchShell } from '@nop-chaos/flux-react';
import { EditorInspectorPanel } from './inspector/inspector-panel.js';
import { EditorToolboxPanel } from './toolbox/toolbox-panel.js';
import { EditorStatusBar } from './renderer/editor-status-bar.js';
import { LayoutGrid } from 'lucide-react';
import { hasScadaSymbol } from '../symbols/symbol-registry.js';
import { computeMoveSnap, type SnapRect } from './snap/transform-snap.js';
import { pickSymbolAtPoint } from './context-menu-hit.js';
import { asReactNode, collectSiblingRects, computeAggregateViewportBounds } from './canvas-view-helpers.js';
import { ScadaEditorContextMenu, type ScadaEditorContextMenuAction, type ScadaEditorContextMenuState } from './context-menu.js';

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
  // plan 531 S2 Phase 2：drop 落点指示（snapped 世界坐标预览框）；dragleave/drop 清除，invalid type 早退不残留。
  const [dropPreview, setDropPreview] = useState<SnapRect | null>(null);
  // plan 531 S2 Phase 3：拖拽对齐辅助线（runtime-factories 拖拽帧上报线世界坐标，transformEnd 清 null）。
  const [moveGuides, setMoveGuides] = useState<{ vertical: number | null; horizontal: number | null } | null>(null);
  // plan 532 S3：右键上下文菜单态（client 坐标 + 命中图元 id，null = 空白态）。
  const [contextMenu, setContextMenu] = useState<ScadaEditorContextMenuState | null>(null);
  // plan 532 S3：左右面板宽度（WorkbenchShell 受控回调；本地 useState 会话内，528 裁决口径）。
  const [leftWidth, setLeftWidth] = useState<number | undefined>(undefined);
  const [rightWidth, setRightWidth] = useState<number | undefined>(undefined);
  // session 反应式通道（plan 2026-08-07-1835-1 Phase 1 / open P1-A）：
  // `runtime.session.*` 是 ref-held 可变对象（INV-4），不进 React 状态；notifySession 经 handleSessionChange
  // 派发 schema 事件外，还 bump 此计数器，触发本组件重渲染 → 子 panel（toolbox Undo/Redo disabled、
  // inspector fieldErrors）随之重渲染并读最新 session 状态。属性编辑后 Undo 按钮立即启用（无需重选）。
  const [, bumpSessionVersion] = useReducer((n: number) => n + 1, 0);
  const idCounter = useRef(0);
  const { t } = useFluxTranslation();

  // plan 521 / W2：events 字段在 renderer definition 中为 kind:'ignored'（echarts 同型）——
  // 保持 raw schema，args 里的 `${event.*}` 模板在 dispatch 期结合 normalized event 求值。
  // raw schema 优先；props 通道兜底（单测直构 props.props.events 的既有用法不受影响）。
  // plan 522 / L5.4/L5.5：templateStorage/stationStorage（函数成员对象，D-1 同型 'ignored'）与
  // previewMock 沿用同一 raw-schema 优先 + props 通道兜底读取纪律。
  const schemaRaw = props.schema as ScadaEditorCanvasSchema;
  const events = schemaRaw.events ?? (props.props.events as ScadaEditorCanvasEvents | undefined);
  const templateStorage =
    schemaRaw.templateStorage ?? (props.props.templateStorage as import('./template/template-model.js').ScadaTemplateStorage | undefined);
  const stationStorage =
    schemaRaw.stationStorage ?? (props.props.stationStorage as import('./station/station-model.js').ScadaStationStorage | undefined);
  const previewMock =
    schemaRaw.previewMock ?? (props.props.previewMock as ScadaEditorCanvasSchema['previewMock'] | undefined);
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
  // P3.3（plan 554）：保存深度追踪——dirty 派生基座（workingConfig/committedBaseline 永不引用相等，
  // 引用比较不可用；undoDepthAtSave 在 save/load 时写入，dirty = 当前深度 !== 保存时深度）。
  // state 而非 ref：render-time 读取（React Compiler 禁 render 读 ref），写点在事件处理器（合法）。
  const [undoDepthAtSave, setUndoDepthAtSave] = useState(0);
  const handleSave = (serializedConfig: string) => {
    // P3.2（plan 553）：save payload 统一 `{ serialized }`（裁决③）；serializedConfig 旧键一版兼容读。
    setUndoDepthAtSave(runtime ? runtime.session.undoStack.undoStackDepth : 0);
    dispatchEvent(
      'scada-editor:save',
      { serialized: serializedConfig, serializedConfig },
      eventsRef.current?.onSave,
    );
  };

  // plan 2026-08-07-1835-2 Phase 2 / multi P1-04：load 经 runtime-mutators load() → latest.onLoad
  // 触发此处 → 派发 scada-editor:load schema 事件（payload=parsed config）。
  const handleLoad = (config: ScadaConfig) => {
    // load 清栈（resetSession）→ 保存深度基线归零。
    setUndoDepthAtSave(0);
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
    // plan 522 / L5.5：preview 模拟源开关 + expression 绑定求值回调（helpers.evaluate 平台求值，
    // `${...}` 形态直传、裸表达式包一层——完整求值语义复用平台，不复制 flux-eval 管线）。
    previewMock,
    evaluateExpression: (expression) => {
      const target = expression.includes('${') ? expression : `\${${expression}}`;
      try {
        return props.helpers.evaluate(target, scopeRef.current) as import('../serialization/config-types.js').ScadaPrimitive | undefined;
      } catch {
        return undefined;
      }
    },
    onMoveGuides: setMoveGuides,
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
  // plan 521 / W7 稳健化：leafer canvas 元素可晚于本 effect（或被 leafer 内部重建）——
  // 用 MutationObserver 兜底重标记，消除「effect 先于 canvas 创建 → marker 永不落地」竞态。
  // 只标记**第一个** canvas（主 view 层）——leafer 含多 canvas 层，marker 契约保持唯一
  // （host/e2e 以该 marker 定位画布几何）。
  useEffect(() => {
    if (!runtime || !containerRef.current) return;
    const container = containerRef.current;
    const tagFirst = () => {
      const canvas = container.querySelector('canvas');
      if (canvas && !canvas.hasAttribute('data-slot')) {
        canvas.setAttribute('data-slot', 'scada-editor-canvas-canvas');
        canvas.classList.add('nop-scada-editor-canvas-canvas');
      }
    };
    tagFirst();
    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(() => tagFirst());
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
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

  // P3.3（plan 554）：family 只读投影（形状 = P3.1 manifest projection）+ statusPath 发布。
  // INV-4：投影只读快照（selection 浅拷贝），域 state 不进 scope 可写面；session 为 ref-held
  // 可变对象，sessionVersion bump 驱动重渲染，render-time 直读即最新值——投影对象每次渲染重建
  //（useHostScope replace 逐键 diff，等值 no-op，无循环风险）。dirty = 保存深度追踪（见 undoDepthAtSave 注）。
  const scadaSession = runtime?.session;
  // dirty 为 statusPath summary 键（§2.4），不进 useHostScope 投影——投影键集 == P3.1 manifest
  // projection fields（parity 测试锁定），域脏标记走 statusPath 通道。
  const scadaDirty =
    (scadaSession?.undoStack.undoStackDepth ?? 0) !== undoDepthAtSave;
  const scadaScopeData = {
    config: scadaSession?.workingConfig,
    selection: scadaSession ? [...scadaSession.selection] : [],
    mode: scadaSession?.mode ?? (props.props.mode ?? 'edit'),
    runtime: {
      canUndo: scadaSession?.undoStack.canUndo ?? false,
      canRedo: scadaSession?.undoStack.canRedo ?? false,
    },
  };
  useHostScope(scadaScopeData, props.path, 'scada-editor');
  const statusPath =
    typeof props.props.statusPath === 'string' ? props.props.statusPath : undefined;
  useStatusPathPublication(props.node?.scope?.parent ?? props.node?.scope, statusPath, {
    kind: 'scada-editor',
    dirty: scadaDirty,
    busy: effectiveStatus === 'loading',
    error: effectiveStatus === 'error' ? (errorCode ?? 'error') : null,
    canUndo: scadaScopeData.runtime.canUndo,
    canRedo: scadaScopeData.runtime.canRedo,
    selectionCount: scadaScopeData.selection.length,
    mode: scadaScopeData.mode,
    status: effectiveStatus,
  });

  // P2.2（plan 550）：五槽位映射——header=toolbox / leftPanel=palette / canvas=leafer 画布 /
  // rightPanel=inspector / footer=statusBar。隐藏态（loading/error）槽位传 undefined（shell 门
  // 为 !== undefined，传 null 会渲染空卡片）。canvas 槽 flex 包装（M1）：canvas div 的 flex:1
  // 在 PANEL_CARD block 容器内需 flex 父级，否则生产布局塌缩（jsdom 无布局不报）。
  // plan 532 S3：菜单动作分发（全部映射既有 runtime 面，无新增事务语义）；动作后关菜单。
  const handleMenuAction = (action: ScadaEditorContextMenuAction, _nodeId: string | null) => {
    if (!runtime) return;
    const selected = runtime.session.selection;
    switch (action) {
      case 'duplicate':
        // copySelection（纯 clipboard，无 undo entry）+ paste（新 id 偏移 +20/+20 并成为新选区）。
        if (selected.length > 0) {
          runtime.copySelection();
          runtime.paste();
        }
        break;
      case 'delete':
        if (selected.length > 0) runtime.removeWorkingSymbol(selected);
        break;
      case 'toTop':
      case 'moveUp':
      case 'moveDown':
      case 'toBottom':
        runtime.reorderZOrder(action);
        break;
      case 'paste':
        runtime.paste();
        break;
      case 'selectAll':
        runtime.setSelection(runtime.session.workingConfig.symbols.map((s) => s.id));
        break;
      case 'fitCanvas':
        runtime.fitView();
        break;
    }
    setContextMenu(null);
  };

  const toolboxSlot = showLayoutBody
    ? asReactNode(toolbox?.render({ bindings: { selection } })) ?? (
        <EditorToolboxPanel
          runtime={runtime}
          selection={selection}
          onError={handleError}
          disabled={disabled}
          templateStorage={templateStorage}
          stationStorage={stationStorage}
        />
      )
    : undefined;
  const paletteSlot = showLayoutBody
    ? asReactNode(palette?.render()) ?? <EditorPalettePanel runtime={runtime} onError={handleError} disabled={disabled} />
    : undefined;
  const inspectorSlot = showLayoutBody
    ? asReactNode(inspector?.render({ bindings: { nodeId: selectedNodeId } })) ?? (
        <EditorInspectorPanel runtime={runtime} selectedNodeId={selectedNodeId} onError={handleError} disabled={disabled} />
      )
    : undefined;
  const statusBarSlot = showLayoutBody
    ? asReactNode(statusBar?.render()) ?? (
        // plan 2026-08-08-0900-1 Phase 3 / P2 #11：statusBar 内置 fallback（发射 marker），不再恒 null。
        // plan 521 / U4：fallback 换真实 statusBar（viewport/mode/selection/undo-redo 摘要，数据已在 runtime）。
        <EditorStatusBar runtime={runtime} selection={selection} />
      )
    : undefined;

  return (
    <div
      data-testid={props.meta.testid || undefined}
      className={cn('nop-scada-editor-layout', props.meta.className)}
      style={rootStyle}
    >
      <WorkbenchShell
        density="flush"
        header={toolboxSlot}
        leftPanel={paletteSlot}
        leftResizable
        leftWidth={leftWidth}
        onLeftWidthChange={setLeftWidth}
        rightPanel={inspectorSlot}
        rightResizable
        rightWidth={rightWidth}
        onRightWidthChange={setRightWidth}
        footer={statusBarSlot}
        canvas={
          <div className="flex h-full min-h-0 w-full" data-testid="scada-editor-canvas-wrap">
        <div
          ref={containerRef}
          data-cid={cidAttr}
          data-slot="scada-editor-canvas"
          data-status={effectiveStatus}
          // V12e 族2 (G5-R2-视角3-03)：data-mode 必须反映 LIVE 会话模式——此前
          // 绑定 schema prop（静态），switchMode 后 emitted 状态滞留 edit。
          data-mode={runtime ? runtime.session.mode : (props.props.mode ?? 'edit')}
          className="nop-scada-editor-canvas nop-scada-editor-layout-canvas"
          tabIndex={0}
          role="application"
          aria-label={t('industrial.scada.editor.canvasLabel')}
          aria-disabled={disabled || undefined}
          inert={disabled || undefined}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDropPreview(null);
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
            // plan 531 S2 Phase 2：落点吸附（对齐优先、网格兜底；x/y round 与既有纪律一致）。
            const freeX = world.x - 50;
            const freeY = world.y - 50;
            const snap = computeMoveSnap({
              dragged: { x: freeX, y: freeY, width: 100, height: 100 },
              siblings: collectSiblingRects(runtime),
            });
            const resolvedId = runtime.addWorkingSymbol({
              id,
              type,
              x: Math.round(freeX + snap.dx),
              y: Math.round(freeY + snap.dy),
              width: 100,
              height: 100,
            });
            // plan 531 S2 Phase 2：drop 后自动选中（addWorkingSymbol 返回 resolveUniqueNodeId 产物 id；
            // preview 门控早退返回空串 → 不选中）。
            if (resolvedId) runtime.setSelection([resolvedId]);
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          // plan 531 S2 Phase 2：落点指示——snapped 世界坐标预览框（world→viewport 定位由渲染层换算）。
          if (!runtime) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const world = runtime.engine.getWorldPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          const free = { x: world.x - 50, y: world.y - 50, width: 100, height: 100 };
          const snap = computeMoveSnap({ dragged: free, siblings: collectSiblingRects(runtime) });
          setDropPreview({ x: free.x + snap.dx, y: free.y + snap.dy, width: 100, height: 100 });
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDropPreview(null);
        }}
        // plan 2026-08-07-1835-2 Phase 3 / open P1-B：键盘层——Delete/Ctrl+Z/Y/Ctrl+G/Ctrl+Shift+G/arrows
        // （此前 grep keydown 0 hits，delete/group/ungroup 仅 component:* handle 可达）。
        // plan 521 / U5：Ctrl+C/X/V 剪贴板快捷键（接内部 clipboard copy/cut/paste，OS clipboard 归 L5.8 O3）；
        // isEditable 守卫沿用仓库键盘层既有模式（flow-designer/kanban：INPUT/TEXTAREA/SELECT/contentEditable
        // 焦点不劫持）——failure path u5-shortcut-in-input。
        onContextMenu={(e) => {
          // plan 532 S3：右键菜单（readOnly 收敛——disabled 门控早退不弹出）。
          if (!runtime || disabled) return;
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const world = runtime.engine.getWorldPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          const hit = pickSymbolAtPoint(runtime.session.workingConfig.symbols, world);
          // 右键选区契约：命中 ∈ selection 保留多选；命中 ∉ selection 先同步单选；空白保留选区。
          if (hit && !selection.includes(hit)) runtime.setSelection([hit]);
          setContextMenu({ x: e.clientX, y: e.clientY, nodeId: hit });
        }}
        onKeyDown={(e) => {
          if (!runtime || disabled) return;
          const target = e.target as HTMLElement | null;
          const isEditable =
            !!target &&
            (target.tagName === 'INPUT' ||
              target.tagName === 'TEXTAREA' ||
              target.tagName === 'SELECT' ||
              target.isContentEditable === true);
          if (isEditable) return;
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
          } else if (ctrl && !e.shiftKey && key === 'c') {
            if (sel.length === 0) return;
            e.preventDefault();
            runtime.copySelection();
          } else if (ctrl && !e.shiftKey && key === 'x') {
            if (sel.length === 0) return;
            e.preventDefault();
            runtime.cutSelection();
          } else if (ctrl && !e.shiftKey && key === 'v') {
            e.preventDefault();
            runtime.paste();
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
            // plan 531 S2 Phase 3：批量单 undo entry（此前逐 id updateWorkingNode 产 N entry）。
            runtime.nudgeWorkingSymbols(sel, dx, dy);
          }
        }}
      >
        {/* plan 531 S2 Phase 3：拖拽对齐辅助线（世界坐标 → viewport 换算定位，transformEnd 清除）。 */}
        {showLayoutBody && runtime && moveGuides?.vertical != null
          ? (() => {
              const viewX = runtime.engine.getViewportPoint({ x: moveGuides.vertical, y: 0 }).x;
              return <div data-testid="scada-editor-move-guide-vertical" aria-hidden="true" className="nop-scada-editor-alignment-guide nop-scada-editor-alignment-guide-vertical" style={{ left: viewX }} />;
            })()
          : null}
        {showLayoutBody && runtime && moveGuides?.horizontal != null
          ? (() => {
              const viewY = runtime.engine.getViewportPoint({ x: 0, y: moveGuides.horizontal }).y;
              return <div data-testid="scada-editor-move-guide-horizontal" aria-hidden="true" className="nop-scada-editor-alignment-guide nop-scada-editor-alignment-guide-horizontal" style={{ top: viewY }} />;
            })()
          : null}
        {/* plan 531 S2 Phase 2：drop 落点指示（snapped 世界坐标预览框，world→viewport 换算定位）。 */}
        {showLayoutBody && runtime && dropPreview
          ? (() => {
              const viewPoint = runtime.engine.getViewportPoint({ x: dropPreview.x, y: dropPreview.y });
              const scale = runtime.engine.getViewport().scale;
              return (
                <div
                  data-testid="scada-editor-drop-preview"
                  aria-hidden="true"
                  className="pointer-events-none absolute"
                  style={{
                    left: viewPoint.x,
                    top: viewPoint.y,
                    width: dropPreview.width * scale,
                    height: dropPreview.height * scale,
                    border: '1px dashed hsl(var(--primary))',
                    borderRadius: 4,
                    background: 'hsl(var(--primary) / 0.06)',
                  }}
                />
              );
            })()
          : null}
        {/* plan 2026-08-08-0900-1 Phase 3 / P2 #12：empty region 正确归所——ready 但无图元时显示空场景提示（canvas 区内 overlay）。 */}
        {showLayoutBody && runtime.session.workingConfig.symbols.length === 0
          ? asReactNode(empty?.render()) ?? (
              <div data-slot="scada-editor-empty" className="nop-scada-editor-empty">
                <div className="flex flex-col items-center gap-2">
                  <LayoutGrid className="size-8 opacity-60" aria-hidden="true" />
                  <p className="text-sm font-medium">{t('industrial.scada.editor.emptySceneTitle')}</p>
                  <p className="text-xs opacity-80">{t('industrial.scada.editor.emptyScene')}</p>
                </div>
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
        {/* plan 532 S3：菜单挂载为 keydown 容器兄弟（canvas-wrap 内），规避容器 nudge 冒泡。 */}
        {contextMenu && runtime ? (
          <ScadaEditorContextMenu
            menu={contextMenu}
            hasClipboard={runtime.getClipboard() !== null}
            hasSymbols={runtime.session.workingConfig.symbols.length > 0}
            onAction={handleMenuAction}
            onClose={() => setContextMenu(null)}
          />
        ) : null}
          </div>
        }
      />
    </div>
  );
}
