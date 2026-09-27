/**
 * 页面设计器组装页（S1 §4.1 三栏壳：palette/大纲 + canvas + inspector/JSON）。
 *
 * 宿主（本组件）保持 transient 意图（hover/dropHint）与命令通道装拆：
 * 所有文档变更经 `session.dispatch` 走树命令（S1 §7.2 粒度表）；inspector
 * 编辑会话以 editor-core 事务收口为 1 条 undo 步（S1 §8.3）。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Separator, Tabs, TabsContent, TabsList, TabsTrigger, toast } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { createDefaultEnv } from '@nop-chaos/flux-react';
import type { RendererEnv, SchemaInput } from '@nop-chaos/flux-core';
import { isSchema } from '@nop-chaos/flux-core';
import type { SessionNodeId } from '@nop-chaos/page-designer-core';
import {
  createSeededRandom,
  findNodeById,
  getDropRegionKeys,
  getRegionChildren,
  getSessionId,
  locateNode,
} from '@nop-chaos/page-designer-core';
import { buildMvpPaletteItems, createPageDesignerRegistry, resolvePaletteScaffold } from './designer-registry.js';
import { useDesignerSession } from './use-designer-session.js';
import { PageDesignerCanvas } from './canvas-bridge.js';
import { PalettePanel } from './palette-panel.js';
import { InspectorPanel } from './inspector-panel.js';
import { StructureTree } from './structure-tree.js';
import { JsonSourceView } from './json-source-view.js';
import type { DesignerDragPayload, DesignerDropHint } from './types.js';

export interface PageDesignerProps {
  /** 宿主 env（编辑态预览数据源等）；缺省 `createDefaultEnv()`。 */
  env?: RendererEnv;
  onBack?: () => void;
}

function cloneNode(node: SchemaInput): SchemaInput {
  return JSON.parse(JSON.stringify(node)) as SchemaInput;
}

// 模块级会话种子计数器（与 page-designer-core 同构；多实例间保证种子不重复）。
let sessionSeedCounter = 0;

function nextSessionSeed(): number {
  sessionSeedCounter = (sessionSeedCounter + 1) % 0x7fffffff;
  return (Date.now() ^ (sessionSeedCounter * 0x9e3779b9)) >>> 0;
}

const SHARED_SID_RANDOM = createSeededRandom(nextSessionSeed());

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function PageDesigner(props: PageDesignerProps) {
  const registry = useMemo(() => createPageDesignerRegistry(), []);
  const env = useMemo(() => props.env ?? createDefaultEnv(), [props.env]);
  const { session, state } = useDesignerSession(
    useMemo(() => ({ registry, env, sidRandom: SHARED_SID_RANDOM }), [registry, env]),
  );

  const [hoverNodeId, setHoverNodeId] = useState<SessionNodeId | null>(null);
  const [dropHint, setDropHint] = useState<DesignerDropHint | null>(null);
  const inspectorTxActiveRef = useRef(false);

  const paletteItems = useMemo(() => buildMvpPaletteItems(registry), [registry]);

  const selectedNodeId = state.selection.length > 0 ? state.selection[state.selection.length - 1] : null;
  const selectedNode = useMemo(
    () => (selectedNodeId ? findNodeById(state.working, selectedNodeId, registry) ?? null : null),
    [state.working, selectedNodeId, registry],
  );
  const selectedType = selectedNode ? ((selectedNode as unknown as Record<string, unknown>).type as string) : null;
  const selectedDefinition = selectedType ? registry.get(selectedType) : undefined;

  const rootSchemaNode = Array.isArray(state.working) ? state.working[0] : state.working;
  const canvasEmpty = useMemo(() => {
    if (!isSchema(rootSchemaNode)) return true;
    const regions = getDropRegionKeys(registry.get((rootSchemaNode as unknown as Record<string, unknown>).type as string));
    return regions.every((key) => getRegionChildren(rootSchemaNode, key).length === 0);
  }, [rootSchemaNode, registry]);

  const clearTransient = useCallback(() => {
    setHoverNodeId(null);
    setDropHint(null);
  }, []);

  const endInspectorTransaction = useCallback(() => {
    if (inspectorTxActiveRef.current) {
      inspectorTxActiveRef.current = false;
      session.core.endTransaction();
    }
  }, [session]);

  const handleUpdateProps = useCallback(
    (mutation: Record<string, unknown>, stage: 'transient' | 'commit') => {
      if (stage === 'transient') {
        if (!inspectorTxActiveRef.current) {
          inspectorTxActiveRef.current = true;
          session.core.beginTransaction();
        }
        if (Object.keys(mutation).length > 0 && selectedNodeId) {
          session.dispatch({ kind: 'updateProps', nodeId: selectedNodeId, props: mutation });
        }
        return;
      }
      if (inspectorTxActiveRef.current) {
        inspectorTxActiveRef.current = false;
        session.core.endTransaction();
      }
    },
    [session, selectedNodeId],
  );

  const insertNode = useCallback(
    (type: string, parentId: SessionNodeId, regionKey: string, index?: number): SessionNodeId | null => {
      const scaffold = resolvePaletteScaffold(type, registry);
      if (!scaffold) {
        toast.error(t('flux.pageDesigner.dropRejected'));
        return null;
      }
      const result = session.dispatch({
        kind: 'insertNode',
        parentId,
        regionKey,
        index,
        node: cloneNode(scaffold),
      });
      /* v8 ignore next -- 白名单脚手架 + 合法 hint 下 insertNode 恒成功 */
      if (!result.ok || !result.nodeId) {
        toast.error(t('flux.pageDesigner.dropRejected'));
        return null;
      }
      return result.nodeId;
    },
    [registry, session],
  );

  const insertIntoContext = useCallback(
    (type: string) => {
      const root = rootSchemaNode;
      const rootSid = isSchema(root) ? getSessionId(root) ?? null : null;
      let targetParent = rootSid;
      let targetRegion: string | null = null;
      if (selectedNodeId && selectedNode) {
        const regions = getDropRegionKeys(selectedDefinition);
        if (regions.length > 0) {
          targetParent = selectedNodeId;
          targetRegion = regions[0];
        } else {
          const location = locateNode(state.working, selectedNodeId, registry);
          if (location?.parent && location.containerKey) {
            targetParent = getSessionId(location.parent) ?? null;
            targetRegion = location.containerKey;
          }
        }
      }
      /* v8 ignore next -- 选中上下文恒可解析（根节点载入时已注入 sid） */
      if (!targetParent) return;
      if (!targetRegion) {
        const rootRegions = isSchema(root)
          ? getDropRegionKeys(registry.get((root as unknown as Record<string, unknown>).type as string))
          : [];
        /* v8 ignore next -- 根 page 恒含 region（registry 契约面） */
        if (rootRegions.length === 0) return;
        targetRegion = rootRegions[0];
      }
      const inserted = insertNode(type, targetParent, targetRegion);
      if (inserted) {
        session.core.setSelection([inserted]);
      }
    },
    [insertNode, registry, selectedDefinition, selectedNode, selectedNodeId, rootSchemaNode, session, state.working],
  );

  const handleDrop = useCallback(
    (payload: DesignerDragPayload, hint: DesignerDropHint) => {
      setDropHint(null);
      /* v8 ignore next -- 几何 hint 对合法 registry 恒非 invalid */
      if (hint.kind === 'invalid') {
        toast.error(t('flux.pageDesigner.dropRejected'));
        return;
      }
      if (payload.source !== 'palette' || !payload.type) return;
      const inserted = insertNode(payload.type, hint.parentId, hint.regionKey, hint.index);
      if (inserted) {
        session.core.setSelection([inserted]);
      }
    },
    [insertNode, session],
  );

  const handleDelete = useCallback(() => {
    endInspectorTransaction();
    /* v8 ignore next -- 删除按钮仅在有选中时渲染 */
    if (!selectedNodeId) return;
    const result = session.dispatch({ kind: 'removeNode', nodeId: selectedNodeId });
    if (result.ok) {
      session.core.setSelection([]);
    } else {
      toast.error(t('flux.pageDesigner.deleteRejected'));
    }
  }, [endInspectorTransaction, selectedNodeId, session]);

  const handleDuplicate = useCallback(() => {
    /* v8 ignore next -- 复制按钮仅在有选中时渲染 */
    if (!selectedNodeId || !selectedNode) return;
    const location = locateNode(state.working, selectedNodeId, registry);
    if (!location?.parent || !location.containerKey) return;
    const parentSid = getSessionId(location.parent);
    /* v8 ignore next -- 有 parent 即有 sid（载入注入不变式） */
    if (!parentSid) return;
    // 复制即新 sid（INV-D）：克隆子树经 insertNode 重新注入。
    const result = session.dispatch({
      kind: 'insertNode',
      parentId: parentSid,
      regionKey: location.containerKey,
      index: location.index + 1,
      node: cloneNode(selectedNode),
    });
    if (result.ok && result.nodeId) {
      session.core.setSelection([result.nodeId]);
    } else {
      toast.error(t('flux.pageDesigner.dropRejected'));
    }
  }, [registry, selectedNode, selectedNodeId, session, state.working]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTextEntryTarget(event.target)) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          session.core.redo();
        } else {
          session.core.undo();
        }
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        session.core.redo();
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeId) {
        event.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDelete, selectedNodeId, session]);

  const exportedJson = useMemo(
    () => session.core.adapter.serialize(state.working),
    [session, state.working],
  );

  return (
    <div className="flex h-screen flex-col bg-[var(--nop-hero-bg,#f8fafc)]" data-testid="page-designer-root">
      <header className="flex items-center gap-3 border-b px-4 py-2">
        {props.onBack ? (
          <Button type="button" variant="ghost" size="sm" data-testid="page-designer-back" onClick={props.onBack}>
            ← {t('flux.pageDesigner.back')}
          </Button>
        ) : null}
        <h1 className="text-lg font-bold">{t('flux.pageDesigner.title')}</h1>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="page-designer-undo"
            disabled={!state.canUndo}
            onClick={() => session.core.undo()}
          >
            {t('flux.pageDesigner.undo')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="page-designer-redo"
            disabled={!state.canRedo}
            onClick={() => session.core.redo()}
          >
            {t('flux.pageDesigner.redo')}
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {state.dirty ? (
            <span className="text-xs text-[var(--nop-eyebrow,#9ca3af)]" data-testid="page-designer-dirty">
              {t('flux.pageDesigner.dirty')}
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="page-designer-mode-toggle"
            onClick={() => {
              clearTransient();
              endInspectorTransaction();
              session.core.setMode(state.mode === 'edit' ? 'preview' : 'edit');
            }}
          >
            {state.mode === 'edit' ? t('flux.pageDesigner.modePreview') : t('flux.pageDesigner.modeEdit')}
          </Button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1">
        <aside className="flex w-64 shrink-0 flex-col border-r p-2">
          <Tabs defaultValue="palette" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mb-2 w-full">
              <TabsTrigger value="palette" className="flex-1">
                {t('flux.pageDesigner.paletteTitle')}
              </TabsTrigger>
              <TabsTrigger value="structure" className="flex-1">
                {t('flux.pageDesigner.structureTitle')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="palette" className="min-h-0 flex-1 overflow-hidden">
              <PalettePanel items={paletteItems} onItemClick={insertIntoContext} />
            </TabsContent>
            <TabsContent value="structure" className="min-h-0 flex-1 overflow-hidden">
              <StructureTree
                document={state.working}
                registry={registry}
                selection={state.selection}
                onSelect={(nodeId) => session.core.setSelection([nodeId])}
              />
            </TabsContent>
          </Tabs>
        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col">
          <PageDesignerCanvas
            document={state.working}
            registry={registry}
            env={env}
            mode={state.mode}
            selection={state.selection}
            hoverNodeId={hoverNodeId}
            dropHint={dropHint}
            onNodePointerDown={(nodeId) => {
              endInspectorTransaction();
              clearTransient();
              session.core.setSelection([nodeId]);
            }}
            onNodeHover={(nodeId) => setHoverNodeId(nodeId)}
            onPaneClick={() => {
              endInspectorTransaction();
              session.core.setSelection([]);
            }}
            onDragOver={(hint) => setDropHint(hint)}
            onDragLeave={() => setDropHint(null)}
            onDrop={handleDrop}
            onRequestDelete={handleDelete}
            onRequestDuplicate={handleDuplicate}
          />
          {canvasEmpty && state.mode === 'edit' ? (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              data-testid="page-designer-canvas-empty"
            >
              <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-[var(--nop-body-copy,#6b7280)]">
                {t('flux.pageDesigner.canvasEmpty')}
              </p>
            </div>
          ) : null}
        </div>

        <aside className="flex w-80 shrink-0 flex-col border-l p-2">
          <Tabs defaultValue="inspector" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mb-2 w-full">
              <TabsTrigger value="inspector" className="flex-1">
                {t('flux.pageDesigner.inspectorTitle')}
              </TabsTrigger>
              <TabsTrigger value="source" className="flex-1">
                {t('flux.pageDesigner.sourceTitle')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="inspector" className="min-h-0 flex-1 overflow-hidden">
              <InspectorPanel
                nodeId={selectedNodeId}
                node={selectedNode}
                definition={selectedDefinition}
                onUpdateProps={handleUpdateProps}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            </TabsContent>
            <TabsContent value="source" className="min-h-0 flex-1 overflow-hidden">
              <JsonSourceView
                exportedJson={exportedJson}
                onImport={(doc) => {
                  const result = session.dispatch({ kind: 'importDocument', doc: doc as SchemaInput });
                  if (result.ok) {
                    session.core.setSelection([]);
                  }
                  return result;
                }}
              />
            </TabsContent>
          </Tabs>
        </aside>
      </main>
    </div>
  );
}
