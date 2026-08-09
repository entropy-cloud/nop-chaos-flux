import React, { useEffect, useRef, useState } from 'react';
import {
  createNormalizedActionEvent,
  useCurrentComponentRegistry,
  useRenderScope,
  useRendererRuntime,
} from '@nop-chaos/flux-react';
import { createEditorCore, type EditorCore, type EditorMode } from '@nop-chaos/editor-core';
import { WorkbenchShell } from '@nop-chaos/flux-react';
import { Button, cn } from '@nop-chaos/ui';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { Eye, Pencil, Redo2, Save, Trash2, Undo2 } from 'lucide-react';
import type { ActionSchema, BaseSchema, RendererComponentProps, RendererRenderOutput, SchemaValue } from '@nop-chaos/flux-core';
import {
  createDashboardDomainAdapter,
  diffDashboardDocument,
  emptyDashboardDocument,
  type DashboardDocument,
} from './dashboard-domain-adapter.js';
import { EditorCanvas } from './editor-canvas.js';
import { EditorInspector } from './editor-inspector.js';
import { EditorPalette } from './editor-palette.js';
import { useDashboardEditorHandles } from './use-dashboard-editor-handles.js';
import { useEditorCoreSession } from './editor-session-hook.js';
import { resolveCols, resolveGapPx, resolveRowHeight } from '../layout-math.js';

export interface DashboardEditorSchema extends BaseSchema {
  type: 'dashboard-editor';
  /** 初始布局（对象或 JSON 字符串；表达式可用）。 */
  layout?: SchemaValue;
  /** 网格列数（缺省 12）。 */
  cols?: number;
  /** 行高 px（缺省 40）。 */
  rowHeight?: number;
  /** 面板间距 px（缺省 8）。 */
  gap?: number;
  /** 画布高度 px（缺省 600）。 */
  height?: number;
  /** 初始模式（缺省 edit）。 */
  mode?: 'edit' | 'preview';
  /** 提交策略（缺省 manual）。 */
  commitPolicy?: 'manual' | 'auto';
  onSave?: ActionSchema;
  onError?: ActionSchema;
}

function asReactNode(value: RendererRenderOutput): React.ReactNode {
  return value as React.ReactNode;
}

function resolveInitialDocument(layout: unknown): DashboardDocument {
  if (layout === null || layout === undefined) return emptyDashboardDocument();
  if (typeof layout === 'string') {
    try {
      const parsed = JSON.parse(layout);
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as DashboardDocument).panels)) {
        return parsed as DashboardDocument;
      }
    } catch {
      // fall through to empty document
    }
    return emptyDashboardDocument();
  }
  if (typeof layout === 'object' && Array.isArray((layout as DashboardDocument).panels)) {
    return layout as DashboardDocument;
  }
  return emptyDashboardDocument();
}

function buildSession(
  initialDocument: DashboardDocument,
  commitPolicy: 'manual' | 'auto',
  initialMode: EditorMode,
  onCommitted: (serialized: string) => void,
): EditorCore<DashboardDocument, unknown> {
  return createEditorCore(createDashboardDomainAdapter(), {
    initialDocument,
    policy: commitPolicy,
    mode: initialMode,
    onCommitted: (result) => {
      if (result.ok && result.serialized !== undefined) {
        onCommitted(result.serialized);
      }
    },
  });
}

/**
 * dashboard editor renderer（design: docs/components/dashboard-editor/design.md）。
 *
 * 三段式外壳复用 WorkbenchShell（header + palette + canvas + inspector）；
 * 编辑会话由 editor-core 持有（working/committed 双态 + undo 栈 + 提交策略 manual）。
 * 保存链路：commit → serialize → `dashboard-editor:save` schema 事件（下游同步归 host）。
 */
export function DashboardEditorRenderer(props: RendererComponentProps<DashboardEditorSchema>) {
  const runtime = useRendererRuntime();
  const { helpers } = props;
  const schemaProps = props.props;
  const { t } = useFluxTranslation();
  const componentRegistry = useCurrentComponentRegistry();
  const scopeRef = useRenderScope();

  const cols = resolveCols(schemaProps.cols as number | undefined);
  const rowHeight = resolveRowHeight(schemaProps.rowHeight as number | undefined);
  const gap = resolveGapPx(schemaProps.gap as number | undefined);
  const canvasHeight =
    typeof schemaProps.height === 'number' && schemaProps.height > 0 ? schemaProps.height : 600;

  const helpersRef = useRef(helpers);
  const eventsRef = useRef(props.events);
  const scopeRefRef = useRef(scopeRef);
  useEffect(() => {
    helpersRef.current = helpers;
  });
  useEffect(() => {
    eventsRef.current = props.events;
  });
  useEffect(() => {
    scopeRefRef.current = scopeRef;
  });

  const dispatchEventRef = useRef<
    (type: string, payload: Record<string, unknown>, action: unknown) => unknown
  >(() => undefined);
  useEffect(() => {
    dispatchEventRef.current = (type, payload, action) => {
      const normalized = createNormalizedActionEvent({ type, ...payload });
      if (typeof action !== 'function') return undefined;
      return action(normalized, { scope: scopeRefRef.current });
    };
  });
  const notifySave = (serialized: string): void => {
    dispatchEventRef.current('dashboard-editor:save', { serialized }, eventsRef.current?.onSave);
  };

  const commitPolicy: 'manual' | 'auto' = schemaProps.commitPolicy === 'auto' ? 'auto' : 'manual';
  const initialMode: EditorMode = schemaProps.mode === 'preview' ? 'preview' : 'edit';

  const [core, setCore] = useState<EditorCore<DashboardDocument, unknown> | null>(null);
  const coreRef = useRef<EditorCore<DashboardDocument, unknown> | null>(null);

  // 会话创建（mount）+ controlled push-back：host 经 layout prop 回推新布局且与
  // committed 不同 → dispose 旧会话并重建。ref 只在 effect 内读写（React Compiler 纪律）。
  const lastLayoutPropRef = useRef<unknown>(undefined);
  useEffect(() => {
    const incoming = resolveInitialDocument(schemaProps.layout);
    const current = coreRef.current;
    if (!current) {
      coreRef.current = buildSession(incoming, commitPolicy, initialMode, notifySave);
      lastLayoutPropRef.current = incoming;
      setCore(coreRef.current);
      return;
    }
    if (incoming === lastLayoutPropRef.current) return;
    lastLayoutPropRef.current = incoming;
    if (diffDashboardDocument(current.getState().committed, incoming) !== null) {
      current.dispose();
      coreRef.current = buildSession(incoming, commitPolicy, initialMode, notifySave);
      setCore(coreRef.current);
    }
  }, [schemaProps.layout, commitPolicy, initialMode]);

  const session = useEditorCoreSession(core);

  const addPanel = (type: string) => {
    if (!core) return;
    const working = core.getState().working;
    let index = working.panels.length + 1;
    const taken = new Set(working.panels.map((p) => p.id));
    let id = `panel-${index}`;
    while (taken.has(id)) {
      index += 1;
      id = `panel-${index}`;
    }
    const panel = { id, type, title: type, x: 0, y: 0, w: Math.min(4, cols), h: 2 };
    core.update((doc) => ({ panels: [...doc.panels, panel] }));
    core.setSelection([panel.id]);
  };

  useDashboardEditorHandles({
    componentRegistry,
    id: props.id,
    cid: props.meta.cid,
    core,
    onCommitted: notifySave,
  });

  const renderPanelContent = (panel: { type: string; props?: unknown; source?: unknown }) => {
    if (!runtime.registry.has(panel.type)) {
      console.warn(`[dashboard-editor] panel type "${panel.type}" is not registered, skipped`);
      return null;
    }
    const fragment: BaseSchema = {
      type: panel.type,
      ...(panel.props !== undefined && panel.props !== null && typeof panel.props === 'object'
        ? (panel.props as object)
        : {}),
      ...(panel.source !== undefined ? { data: panel.source, source: panel.source } : {}),
    } as unknown as BaseSchema;
    return asReactNode(helpers.render(fragment, { pathSuffix: 'editor-panel' }));
  };

  const mode: EditorMode = session.mode;
  const selection = session.selection;
  if (!core) {
    return <div className="h-full min-h-0 p-6 text-muted-foreground">…</div>;
  }

  const header = (
    <div
      data-slot="dashboard-editor-header"
      className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm"
    >
      <span className="mr-2 text-sm font-medium text-foreground">
        {t('flux.dashboard.editor.headerTitle')}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid="editor-undo"
        disabled={!session.canUndo}
        onClick={() => core.undo()}
      >
        <Undo2 className="size-3.5" />
        {t('flux.dashboard.editor.undo')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid="editor-redo"
        disabled={!session.canRedo}
        onClick={() => core.redo()}
      >
        <Redo2 className="size-3.5" />
        {t('flux.dashboard.editor.redo')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid="editor-delete"
        disabled={selection.length === 0}
        onClick={() => {
          const removed = new Set(selection);
          core.update((doc) => ({
            panels: doc.panels.filter((p) => !removed.has(p.id)),
          }));
          core.setSelection([]);
        }}
      >
        <Trash2 className="size-3.5" />
        {t('flux.dashboard.editor.delete')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid="editor-save"
        disabled={!session.dirty}
        onClick={() => {
          const result = core.commit();
          if (result && !result.ok) {
            dispatchEventRef.current(
              'dashboard-editor:error',
              {
                code: 'save-failed',
                message: result.error?.message ?? t('flux.dashboard.editor.commitFailed'),
              },
              eventsRef.current?.onError,
            );
          }
        }}
      >
        <Save className="size-3.5" />
        {t('flux.dashboard.editor.save')}
      </Button>
      <div className="ml-auto">
        <Button
          type="button"
          variant={mode === 'edit' ? 'default' : 'outline'}
          size="sm"
          data-testid="editor-mode-toggle"
          onClick={() => core.setMode(mode === 'edit' ? 'preview' : 'edit')}
        >
          {mode === 'edit' ? <Eye className="size-3.5" /> : <Pencil className="size-3.5" />}
          {mode === 'edit'
            ? t('flux.dashboard.editor.preview')
            : t('flux.dashboard.editor.edit')}
        </Button>
      </div>
    </div>
  );

  const canvas =
    mode === 'edit' ? (
      <EditorCanvas
        core={core}
        selection={selection}
        cols={cols}
        rowHeight={rowHeight}
        gap={gap}
        height={canvasHeight}
        renderPanelContent={(panel) =>
          renderPanelContent({ type: panel.type, props: panel.props, source: panel.source })
        }
      />
    ) : (
      <div
        data-slot="dashboard-editor-preview"
        className="h-full min-h-0 w-full overflow-auto p-4"
      >
        {runtime.registry.has('dashboard')
          ? asReactNode(
              helpers.render(
                {
                  type: 'dashboard',
                  panels: session.working.panels,
                  cols,
                  rowHeight,
                  gap,
                  height: canvasHeight,
                },
                { pathSuffix: 'preview' },
              ),
            )
          : null}
      </div>
    );

  return (
    <WorkbenchShell
      className={cn('nop-dashboard-editor', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
      header={header}
      leftPanel={<EditorPalette onAddPanel={addPanel} />}
      leftLabel="Collapse panel palette"
      leftResizable
      leftWidth={220}
      leftMinWidth={180}
      leftMaxWidth={360}
      canvas={canvas}
      rightPanel={<EditorInspector core={core} selection={selection} />}
      rightLabel="Collapse inspector"
      rightResizable
      rightWidth={280}
      rightMinWidth={220}
      rightMaxWidth={420}
    />
  );
}
