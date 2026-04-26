import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ActionNamespaceProvider, RendererComponentProps, SchemaValue } from '@nop-chaos/flux-core';
import type { DesignerHostStatusSummary } from '@nop-chaos/flow-designer-core';
import { hasRendererSlotContent, useCurrentActionScope, useRendererEnv, WorkbenchShell } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { publishOwnerStatus } from '@nop-chaos/flux-react';
import { createDesignerCore, layoutWithElk, layoutTreeWithElk } from '@nop-chaos/flow-designer-core';
import type { DesignerConfig, GraphDocument, TreeDocument } from '@nop-chaos/flow-designer-core';
import { Button, cn, DataViewer, Dialog, DialogContent, DialogHeader, DialogTitle } from '@nop-chaos/ui';
import { createDesignerCommandAdapter } from './designer-command-adapter';
import type { DesignerPageSchema } from './schemas';
import {
  DesignerContext,
  type DesignerContextValue,
  useDesignerSnapshot,
  useDesignerHostScope,
  notifyCommandFailure
} from './designer-context';
import { createDesignerActionProvider } from './designer-action-provider';
import {
  computeTreeModeDocument,
  confirmCreateDialog,
  createDesignerContextValue,
  createMergedDesignerProvider,
  matchesShortcut,
  renderDesignerSchema,
  type DesignerCreateDialogState
} from './designer-page-helpers';
import { DesignerPaletteContent } from './designer-palette';
import { DesignerCanvasContent, plusButtonHandlerHolder } from './designer-canvas';
import { DefaultInspector } from './designer-inspector';
import { DesignerToolbarContent } from './designer-toolbar';

function TreeModeLayoutWrapper(props: RendererComponentProps<DesignerPageSchema> & { config: DesignerConfig; rawSchemaProps: Record<string, SchemaValue> }) {
  const { config, rawSchemaProps } = props;
  const inputTreeDocument = rawSchemaProps.treeDocument as TreeDocument | undefined;
  const [treeDocument, setTreeDocument] = React.useState<TreeDocument | undefined>(inputTreeDocument);

  useEffect(() => {
    setTreeDocument(inputTreeDocument);
  }, [inputTreeDocument]);

  const document: GraphDocument = useMemo(
    () => treeDocument ? computeTreeModeDocument(treeDocument, config) : { id: '', kind: '', name: '', version: '', nodes: [], edges: [] },
    [config, treeDocument]
  );

  if (!treeDocument) {
    return <div>{t('flux.flowDesigner.treeDocumentRequired')}</div>;
  }

  return <DesignerPageInner rendererProps={props} document={document} config={config} treeDocument={treeDocument} setTreeDocument={setTreeDocument} />;
}

export function DesignerPageRenderer(props: RendererComponentProps<DesignerPageSchema>) {
  const rawSchemaProps = props.schema as Record<string, SchemaValue>;
  const config = rawSchemaProps.config as DesignerConfig | undefined;

  if (!config) {
    return <div>{t('flux.flowDesigner.configRequired')}</div>;
  }

  const documentMode = config.documentMode;

  if (documentMode === 'tree') {
    return <TreeModeLayoutWrapper {...props} config={config} rawSchemaProps={rawSchemaProps} />;
  }

  const document = rawSchemaProps.document as GraphDocument | undefined;
  if (!document) {
    return <div>{t('flux.flowDesigner.documentRequired')}</div>;
  }

  return <DesignerPageInner rendererProps={props} document={document} config={config} />;
}

interface DesignerPageBodyProps {
  rendererProps: RendererComponentProps<DesignerPageSchema>;
  core: ReturnType<typeof createDesignerCore>;
  commandAdapter: ReturnType<typeof createDesignerCommandAdapter>;
  dispatch: (command: import('./designer-command-adapter').DesignerCommand) => import('./designer-command-adapter').DesignerCommandResult;
  config: DesignerConfig;
}

function DesignerPageBody({ rendererProps: props, core, commandAdapter, dispatch, config }: DesignerPageBodyProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const snapshot = useDesignerSnapshot(core);
  const statusPath = typeof props.schema.statusPath === 'string' ? props.schema.statusPath : undefined;
  const [layoutBusy, setLayoutBusy] = React.useState(false);
  const layoutRequestRef = useRef(0);
  const initialTreeAutolayoutDoneRef = useRef(false);
  const handleAutoLayout = useCallback(async () => {
    const requestId = layoutRequestRef.current + 1;
    layoutRequestRef.current = requestId;
    setLayoutBusy(true);
    const doc = core.getDocument();
    if (doc.nodes.length === 0) {
      if (layoutRequestRef.current === requestId) {
        setLayoutBusy(false);
      }
      return;
    }

    try {
      if (config.documentMode === 'tree') {
        const normalizedCfg = core.getConfig();
        const treeConfig = normalizedCfg.treeConfig;
        if (!treeConfig) {
          return;
        }
        const layoutedNodes = await layoutTreeWithElk(doc.nodes, doc.edges, treeConfig, normalizedCfg.nodeTypes);
        if (layoutRequestRef.current !== requestId || core.getDocument() !== doc) {
          return;
        }
        const positions = new Map(layoutedNodes.map((n) => [n.id, n.position]));
        core.layoutNodes(positions);
        return;
      }

      const positions = await layoutWithElk(doc.nodes, doc.edges, core.getConfig().nodeTypes);
      if (layoutRequestRef.current !== requestId || core.getDocument() !== doc) {
        return;
      }
      core.layoutNodes(positions);
    } finally {
      if (layoutRequestRef.current === requestId) {
        setLayoutBusy(false);
      }
    }
  }, [core, config.documentMode]);

  useEffect(() => {
    if (config.documentMode !== 'tree') {
      return;
    }

    const normalizedCfg = core.getConfig();
    const treeConfig = normalizedCfg.treeConfig;
    if (!treeConfig || treeConfig.autoLayout === false || initialTreeAutolayoutDoneRef.current) {
      return;
    }

    const doc = core.getDocument();
    if (doc.nodes.length === 0) {
      initialTreeAutolayoutDoneRef.current = true;
      return;
    }

    initialTreeAutolayoutDoneRef.current = true;
    const requestId = layoutRequestRef.current + 1;
    layoutRequestRef.current = requestId;
    setLayoutBusy(true);

    void layoutTreeWithElk(doc.nodes, doc.edges, treeConfig, normalizedCfg.nodeTypes)
      .then((layoutedNodes) => {
        if (layoutRequestRef.current !== requestId || core.getDocument() !== doc) {
          return;
        }

        const positions = new Map(layoutedNodes.map((n) => [n.id, n.position]));
        core.layoutNodes(positions);
      })
      .finally(() => {
        if (layoutRequestRef.current === requestId) {
          setLayoutBusy(false);
        }
      });
  }, [core, config.documentMode]);

  const isTreeMode = config.documentMode === 'tree';
  const onPlusButtonClick = useCallback((sourceId: string, clientX: number, clientY: number, sourceKind?: 'node' | 'branch-group' | 'merge') => {
    if (isTreeMode) {
      plusButtonHandlerHolder.current?.(sourceId, clientX, clientY, sourceKind);
    }
  }, [isTreeMode]);

  const ctxOnPlusButtonClick = isTreeMode ? onPlusButtonClick : undefined;

  const actionScope = useCurrentActionScope();
  const designerProvider = useMemo(() => createDesignerActionProvider(core, commandAdapter), [core, commandAdapter]);
  const upstreamBackHandler = useMemo(() => actionScope?.resolve('designer:navigate-back'), [actionScope]);
  const mergedDesignerProvider = useMemo<ActionNamespaceProvider | undefined>(
    () => createMergedDesignerProvider({ designerProvider, upstreamBackHandler }),
    [designerProvider, upstreamBackHandler]
  );
  const designerScope = useDesignerHostScope({ snapshot, config, core, path: props.path });
  const [jsonOpen, setJsonOpen] = React.useState(false);
  const [pendingCreateDialog, setPendingCreateDialog] = React.useState<DesignerCreateDialogState | null>(null);
  const [creatingNode, setCreatingNode] = React.useState(false);
  const jsonOffsetRef = useRef({ x: 0, y: 0 });
  const jsonDocument = useMemo(() => {
    if (!jsonOpen) return null;
    try { return JSON.parse(core.exportDocument()); }
    catch { return null; }
  }, [core, jsonOpen]);

  const handleOpenCreateDialog = useCallback((nodeType: import('@nop-chaos/flow-designer-core').NodeTypeConfig, position: { x: number; y: number }) => {
    setPendingCreateDialog({ nodeType, position });
  }, []);

  const handleCloseCreateDialog = useCallback(() => {
    if (creatingNode) {
      return;
    }
    setPendingCreateDialog(null);
  }, [creatingNode]);

  const handleConfirmCreateDialog = useCallback(async () => {
    if (!pendingCreateDialog) {
      return;
    }

    setCreatingNode(true);
    try {
      const result = await confirmCreateDialog({
        pendingCreateDialog,
        helpers: props.helpers,
        designerScope,
        actionScope,
        dispatch,
      });

      if (result.ok && result.result.ok) {
        setPendingCreateDialog(null);
      }
    } finally {
      setCreatingNode(false);
    }
  }, [actionScope, designerScope, dispatch, pendingCreateDialog, props.helpers]);

  const ctxValue = useMemo<DesignerContextValue>(
    () => createDesignerContextValue({
      core,
      commandAdapter,
      dispatch,
      config,
      openCreateDialog: handleOpenCreateDialog,
      onPlusButtonClick: ctxOnPlusButtonClick,
    }),
    [commandAdapter, config, core, dispatch, handleOpenCreateDialog, ctxOnPlusButtonClick]
  );

  useLayoutEffect(() => {
    if (!actionScope || !mergedDesignerProvider) {
      return;
    }

    return actionScope.registerNamespace('designer', mergedDesignerProvider);
  }, [actionScope, mergedDesignerProvider]);

  useEffect(() => {
    if (!core.getConfig().features.shortcuts) {
      return;
    }

    const shortcuts = core.getConfig().shortcuts;
    const features = core.getConfig().features;
    const canUseClipboard = features.clipboard !== false;
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      const tag = target.tagName.toLowerCase();
      return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
    };

    const isInsideDesigner = (target: EventTarget | null) => {
      if (!(target instanceof Node)) {
        return false;
      }

      return rootRef.current?.contains(target) ?? false;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || !isInsideDesigner(event.target)) {
        return;
      }

      if (matchesShortcut(event, shortcuts.undo) && features.undo !== false) {
        event.preventDefault();
        dispatch({ type: 'undo' });
        return;
      }
      if (matchesShortcut(event, shortcuts.redo) && features.redo !== false) {
        event.preventDefault();
        dispatch({ type: 'redo' });
        return;
      }
      if (canUseClipboard && matchesShortcut(event, shortcuts.copy)) {
        event.preventDefault();
        dispatch({ type: 'copySelection' });
        return;
      }
      if (canUseClipboard && matchesShortcut(event, shortcuts.paste)) {
        event.preventDefault();
        dispatch({ type: 'pasteClipboard' });
        return;
      }
      if (matchesShortcut(event, shortcuts.delete)) {
        event.preventDefault();
        dispatch({ type: 'deleteSelection' });
        return;
      }
      if (matchesShortcut(event, shortcuts.save)) {
        event.preventDefault();
        dispatch({ type: 'save' });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [core, dispatch]);

  const toolbarSlot = props.regions.toolbar
    ? props.helpers.render(props.regions.toolbar.templateNode, { scope: designerScope, actionScope })
    : undefined;
  const inspectorSlot = props.regions.inspector
    ? props.helpers.render(props.regions.inspector.templateNode, { scope: designerScope, actionScope })
    : ((props.props as Record<string, unknown>).inspector as React.ReactNode);
  const dialogsSlot = props.regions.dialogs
    ? props.helpers.render(props.regions.dialogs.templateNode, { scope: designerScope, actionScope })
    : ((props.props as Record<string, unknown>).dialogs as React.ReactNode);
  const renderInspectorSchema = useCallback((schema: import('@nop-chaos/flux-core').SchemaInput) => {
    return renderDesignerSchema({ schema, helpers: props.helpers, designerScope, actionScope });
  }, [actionScope, designerScope, props.helpers]);

  useEffect(() => {
    if (!statusPath) {
      return;
    }

    const summary: DesignerHostStatusSummary = {
      kind: 'designer',
      dirty: snapshot.isDirty,
      busy: layoutBusy,
      canUndo: snapshot.canUndo,
      canRedo: snapshot.canRedo,
      selectionKind: snapshot.activeNode ? 'node' : snapshot.activeEdge ? 'edge' : 'none',
      selectionCount: snapshot.selection.selectedNodeIds.length + snapshot.selection.selectedEdgeIds.length
    };
    publishOwnerStatus(props.node.scope.parent ?? props.node.scope, statusPath, summary);
  }, [layoutBusy, props.node.scope, snapshot, statusPath]);

  return (
    <DesignerContext.Provider value={ctxValue}>
      <div ref={rootRef} className="contents">
        {config.themeStyles && <style>{config.themeStyles}</style>}
        <WorkbenchShell
          className={cn('nop-designer fd-theme-root text-foreground')}
          header={hasRendererSlotContent(toolbarSlot) ? toolbarSlot : <DesignerToolbarContent exportActive={jsonOpen} onExportToggle={() => setJsonOpen((value) => !value)} onAutoLayout={handleAutoLayout} autoLayoutBusy={layoutBusy} />}
          leftPanel={<DesignerPaletteContent />}
          leftCollapsed={snapshot.paletteCollapsed}
          onLeftToggle={() => dispatch({ type: 'togglePalette' })}
          leftLabel="Expand palette"
          canvas={<DesignerCanvasContent />}
          rightPanel={hasRendererSlotContent(inspectorSlot) ? inspectorSlot : <DefaultInspector renderSchema={renderInspectorSchema} />}
          rightCollapsed={snapshot.inspectorCollapsed}
          onRightToggle={() => dispatch({ type: 'toggleInspector' })}
          rightLabel="Expand inspector"
          dialogs={hasRendererSlotContent(dialogsSlot) ? dialogsSlot : undefined}
        />
      </div>
      <Dialog open={jsonOpen} onOpenChange={setJsonOpen} draggable noOverlay noCenter closeOnOutsideClick={false}>
        <DialogContent
          offsetRef={jsonOffsetRef}
          aria-describedby={undefined}
          className="right-4 top-[72px] w-[min(560px,calc(100vw-32px))] max-h-[calc(100vh-96px)] p-0 overflow-hidden z-60 flex flex-col sm:max-w-2xl"
        >
          <DialogHeader className="px-4 pt-4 pb-0 shrink-0">
            <DialogTitle className="text-sm">{t('flux.flowDesigner.flowJson')}</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4">
            {jsonDocument && (
              <DataViewer data={jsonDocument} />
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(pendingCreateDialog)} onOpenChange={(next) => { if (!next) handleCloseCreateDialog(); }}>
        <DialogContent data-slot="designer-create-dialog" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{pendingCreateDialog?.nodeType.createDialog?.title ?? `Create ${pendingCreateDialog?.nodeType.label ?? 'Node'}`}</DialogTitle>
          </DialogHeader>
          <div data-slot="designer-create-dialog-body">
            {pendingCreateDialog?.nodeType.createDialog?.body
              ? props.helpers.render(pendingCreateDialog.nodeType.createDialog.body as any, {
                  scope: designerScope,
                  actionScope,
                  pathSuffix: `create-dialog:${pendingCreateDialog.nodeType.id}`,
                })
              : null}
          </div>
          <div data-slot="designer-create-dialog-actions" className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCloseCreateDialog} disabled={creatingNode}>
              {t('flux.flowDesigner.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleConfirmCreateDialog()} disabled={creatingNode}>
              {creatingNode ? t('flux.flowDesigner.creating') : t('flux.flowDesigner.create')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DesignerContext.Provider>
  );
}

interface DesignerPageInnerProps {
  rendererProps: RendererComponentProps<DesignerPageSchema>;
  document: GraphDocument;
  config: DesignerConfig;
  treeDocument?: TreeDocument;
  setTreeDocument?: React.Dispatch<React.SetStateAction<TreeDocument | undefined>>;
}

function DesignerPageInner({ rendererProps: props, document, config, treeDocument, setTreeDocument }: DesignerPageInnerProps) {
  const env = useRendererEnv();
  const core = useMemo(() => createDesignerCore(document, config), [document, config]);
  const commandAdapter = useMemo(() => createDesignerCommandAdapter(
    core,
    config.documentMode === 'tree' && treeDocument && setTreeDocument
      ? {
          getTreeDocument: () => treeDocument,
          setTreeDocument: (next) => setTreeDocument(next),
          config,
        }
      : undefined
  ), [core, config, treeDocument, setTreeDocument]);
  const dispatch = useCallback(
    (command: import('./designer-command-adapter').DesignerCommand) => {
      const result = commandAdapter.execute(command);
      notifyCommandFailure(env.notify, result.error, result.reason);
      return result;
    },
    [commandAdapter, env]
  );

  return <DesignerPageBody rendererProps={props} core={core} commandAdapter={commandAdapter} dispatch={dispatch} config={config} />;
}

export function DesignerCanvasRenderer() {
  return <DesignerCanvasContent />;
}

export function DesignerPaletteRenderer() {
  return <DesignerPaletteContent />;
}
