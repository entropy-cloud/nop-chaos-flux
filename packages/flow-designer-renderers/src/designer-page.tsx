import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ActionNamespaceProvider, RendererComponentProps } from '@nop-chaos/flux-core';
import type { DesignerHostStatusSummary } from '@nop-chaos/flow-designer-core';
import {
  hasRendererSlotContent,
  useCurrentActionScope,
  useCurrentNodeMeta,
  useRendererEnv,
  useStatusPathPublication,
  WorkbenchShell,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { createDesignerCore } from '@nop-chaos/flow-designer-core';
import type { DesignerConfig, GraphDocument, TreeDocument } from '@nop-chaos/flow-designer-core';
import {
  Button,
  cn,
  DataViewer,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@nop-chaos/ui';
import { createDesignerCommandAdapter } from './designer-command-adapter';
import type { DesignerPageSchema } from './schemas';
import {
  DesignerContext,
  type DesignerContextValue,
  useDesignerSnapshot,
  useDesignerHostScope,
  notifyCommandFailure,
} from './designer-context';
import { createDesignerActionProvider } from './designer-action-provider';
import {
  computeTreeModeDocument,
  confirmCreateDialog,
  createDesignerContextValue,
  createMergedDesignerProvider,
  renderDesignerSchema,
  type DesignerCreateDialogState,
} from './designer-page-helpers';
import { DesignerPaletteContent } from './designer-palette';
import { DesignerCanvasContent, plusButtonHandlerHolder } from './designer-canvas';
import { DefaultInspector } from './designer-inspector';
import { DesignerToolbarContent } from './designer-toolbar';
import { useDesignerAutoLayout } from './use-designer-auto-layout';
import { useDesignerShortcuts } from './use-designer-shortcuts';
import { emitTreeLayoutDebugSnapshot } from './tree-layout-debug';

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

function getRootMetaProps(meta: RendererComponentProps['meta']) {
  return {
    className: meta.className,
    'data-testid': meta.testid || undefined,
    'data-cid': meta.cid != null ? String(meta.cid) : undefined,
  };
}

function readDesignerResolvedProp<T>(
  props: RendererComponentProps<DesignerPageSchema>,
  key: string,
): T | undefined {
  return props.props[key] as T | undefined;
}

function TreeModeLayoutWrapper(
  props: RendererComponentProps<DesignerPageSchema> & { config: DesignerConfig },
) {
  const { config } = props;
  const inputTreeDocument = readDesignerResolvedProp<TreeDocument>(props, 'treeDocument');
  const [initialTreeDocument] = React.useState(() => inputTreeDocument);
  const [treeDocument, setTreeDocument] = React.useState<TreeDocument | undefined>(
    inputTreeDocument,
  );

  useEffect(() => {
    setTreeDocument(inputTreeDocument);
  }, [inputTreeDocument]);

  const core = useMemo(
    () =>
      createDesignerCore(
        initialTreeDocument
          ? computeTreeModeDocument(initialTreeDocument, config)
          : { id: '', kind: '', name: '', version: '', nodes: [], edges: [] },
        config,
      ),
    [config, initialTreeDocument],
  );
  const lastSyncedInputRef = useRef<TreeDocument | undefined>(inputTreeDocument);

  useEffect(() => {
    if (inputTreeDocument === lastSyncedInputRef.current) {
      return;
    }
    lastSyncedInputRef.current = inputTreeDocument;
    if (inputTreeDocument) {
      core.replaceDocument(computeTreeModeDocument(inputTreeDocument, config));
    }
  }, [config, core, inputTreeDocument]);

  if (!treeDocument) {
    return <div>{t('flux.flowDesigner.treeDocumentRequired')}</div>;
  }

  return (
    <DesignerPageInner
      rendererProps={props}
      config={config}
      core={core}
      treeDocument={treeDocument}
      setTreeDocument={setTreeDocument}
    />
  );
}

export function DesignerPageRenderer(props: RendererComponentProps<DesignerPageSchema>) {
  const meta = useCurrentNodeMeta();
  const config = (meta.templateNode.schema as DesignerPageSchema).config as DesignerConfig | undefined;

  if (!config) {
    return <div>{t('flux.flowDesigner.configRequired')}</div>;
  }

  const documentMode = config.documentMode;

  if (documentMode === 'tree') {
    return <TreeModeLayoutWrapper {...props} config={config} />;
  }

  const document = readDesignerResolvedProp<GraphDocument>(props, 'document');
  if (!document) {
    return <div>{t('flux.flowDesigner.documentRequired')}</div>;
  }

  return <DesignerPageInner rendererProps={props} document={document} config={config} />;
}

interface DesignerPageBodyProps {
  rendererProps: RendererComponentProps<DesignerPageSchema>;
  core: ReturnType<typeof createDesignerCore>;
  commandAdapter: ReturnType<typeof createDesignerCommandAdapter>;
  dispatch: (
    command: import('./designer-command-adapter').DesignerCommand,
  ) => import('./designer-command-adapter').DesignerCommandResult;
  config: DesignerConfig;
}

interface DesignerTestConnectDetail {
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
}

function DesignerPageBody({
  rendererProps: props,
  core,
  commandAdapter,
  dispatch,
  config,
}: DesignerPageBodyProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const snapshot = useDesignerSnapshot(core);
  const env = useRendererEnv();
  const statusPath =
    typeof readDesignerResolvedProp<string>(props, 'statusPath') === 'string'
      ? readDesignerResolvedProp<string>(props, 'statusPath')
      : undefined;
  const { layoutBusy, handleAutoLayout } = useDesignerAutoLayout(core, config);

  const isTreeMode = config.documentMode === 'tree';

  useEffect(() => {
    if (!isTreeMode) {
      return;
    }
    emitTreeLayoutDebugSnapshot(env, snapshot);
  }, [env, isTreeMode, snapshot]);
  const onPlusButtonClick = useCallback(
    (
      sourceId: string,
      clientX: number,
      clientY: number,
      sourceKind?: 'node' | 'branch-group' | 'merge',
    ) => {
      if (isTreeMode) {
        plusButtonHandlerHolder.current?.(sourceId, clientX, clientY, sourceKind);
      }
    },
    [isTreeMode],
  );

  const ctxOnPlusButtonClick = isTreeMode ? onPlusButtonClick : undefined;

  const actionScope = useCurrentActionScope();
  const designerProvider = useMemo(
    () => createDesignerActionProvider(core, commandAdapter),
    [core, commandAdapter],
  );
  const upstreamBackHandler = useMemo(
    () => actionScope?.resolve('designer:navigate-back'),
    [actionScope],
  );
  const mergedDesignerProvider = useMemo<ActionNamespaceProvider | undefined>(
    () => createMergedDesignerProvider({ designerProvider, upstreamBackHandler }),
    [designerProvider, upstreamBackHandler],
  );
  const designerScope = useDesignerHostScope({ snapshot, config, core, path: props.path });
  const [jsonOpen, setJsonOpen] = React.useState(false);
  const [pendingCreateDialog, setPendingCreateDialog] =
    React.useState<DesignerCreateDialogState | null>(null);
  const [creatingNode, setCreatingNode] = React.useState(false);
  const jsonOffsetRef = useRef({ x: 0, y: 0 });
  const jsonDocument = useMemo(() => {
    if (!jsonOpen) return null;
    try {
      return JSON.parse(core.exportDocument());
    } catch {
      return null;
    }
  }, [core, jsonOpen]);

  const handleOpenCreateDialog = useCallback(
    (
      nodeType: import('@nop-chaos/flow-designer-core').NodeTypeConfig,
      position: { x: number; y: number },
    ) => {
      setPendingCreateDialog({ nodeType, position });
    },
    [],
  );

  const handleCloseCreateDialog = useCallback(() => {
    if (creatingNode) {
      return;
    }
    setPendingCreateDialog(null);
  }, [creatingNode]);

  const handleConfirmCreateDialog = useCallback(async () => {
    if (!pendingCreateDialog || creatingNode) {
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
  }, [actionScope, creatingNode, designerScope, dispatch, pendingCreateDialog, props.helpers]);

  const ctxValue = useMemo<DesignerContextValue>(
    () =>
      createDesignerContextValue({
        core,
        commandAdapter,
        dispatch,
        config,
        openCreateDialog: handleOpenCreateDialog,
        onPlusButtonClick: ctxOnPlusButtonClick,
      }),
    [commandAdapter, config, core, dispatch, handleOpenCreateDialog, ctxOnPlusButtonClick],
  );

  useLayoutEffect(() => {
    if (!actionScope || !mergedDesignerProvider) {
      return;
    }

    return actionScope.registerNamespace('designer', mergedDesignerProvider);
  }, [actionScope, mergedDesignerProvider]);

  useDesignerShortcuts({ core, rootRef, dispatch });

  const toolbarSlot = props.regions.toolbar
    ? props.helpers.render(props.regions.toolbar.templateNode, {
        scope: designerScope,
        actionScope,
      })
    : undefined;
  const inspectorSlot = props.regions.inspector
    ? props.helpers.render(props.regions.inspector.templateNode, {
        scope: designerScope,
        actionScope,
      })
    : ((props.props as Record<string, unknown>).inspector as React.ReactNode);
  const dialogsSlot = props.regions.dialogs
    ? props.helpers.render(props.regions.dialogs.templateNode, {
        scope: designerScope,
        actionScope,
      })
    : ((props.props as Record<string, unknown>).dialogs as React.ReactNode);
  const renderInspectorSchema = useCallback(
    (schema: import('@nop-chaos/flux-core').SchemaInput) => {
      return asReactNode(
        renderDesignerSchema({ schema, helpers: props.helpers, designerScope, actionScope }),
      );
    },
    [actionScope, designerScope, props.helpers],
  );

  useStatusPathPublication<DesignerHostStatusSummary>(
    props.node.scope.parent ?? props.node.scope,
    statusPath,
    {
      kind: 'designer',
      dirty: snapshot.isDirty,
      busy: layoutBusy,
      canUndo: snapshot.canUndo,
      canRedo: snapshot.canRedo,
      selectionKind: snapshot.activeNode ? 'node' : snapshot.activeEdge ? 'edge' : 'none',
      selectionCount:
        snapshot.selection.selectedNodeIds.length + snapshot.selection.selectedEdgeIds.length,
    },
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleTestConnect = (event: Event) => {
      const detail = (event as CustomEvent<DesignerTestConnectDetail>).detail;
      if (!detail?.source || !detail?.target) {
        return;
      }

      dispatch({
        type: 'addEdge',
        source: detail.source,
        target: detail.target,
        sourcePort: detail.sourcePort,
        targetPort: detail.targetPort,
      });
    };

    window.addEventListener('nop-designer:test-connect', handleTestConnect as EventListener);
    return () => {
      window.removeEventListener('nop-designer:test-connect', handleTestConnect as EventListener);
    };
  }, [dispatch]);

  return (
    <DesignerContext.Provider value={ctxValue}>
      <div ref={rootRef} className="contents">
        {config.themeStyles && <style>{config.themeStyles}</style>}
        <WorkbenchShell
          className={cn('nop-designer fd-theme-root text-foreground', props.meta.className)}
          data-testid={props.meta.testid || undefined}
          data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
          header={
            hasRendererSlotContent(asReactNode(toolbarSlot)) ? (
              asReactNode(toolbarSlot)
            ) : (
              <DesignerToolbarContent
                exportActive={jsonOpen}
                onExportToggle={() => setJsonOpen((value) => !value)}
                onAutoLayout={handleAutoLayout}
                autoLayoutBusy={layoutBusy}
              />
            )
          }
          leftPanel={<DesignerPaletteContent />}
          leftCollapsed={snapshot.paletteCollapsed}
          onLeftToggle={() => dispatch({ type: 'togglePalette' })}
          leftLabel={t('flux.flowDesigner.expandPalette')}
          canvas={<DesignerCanvasContent />}
          rightPanel={
            hasRendererSlotContent(asReactNode(inspectorSlot)) ? (
              asReactNode(inspectorSlot)
            ) : (
              <DefaultInspector renderSchema={renderInspectorSchema} />
            )
          }
          rightCollapsed={snapshot.inspectorCollapsed}
          onRightToggle={() => dispatch({ type: 'toggleInspector' })}
          rightLabel={t('flux.flowDesigner.expandInspector')}
          dialogs={
            hasRendererSlotContent(asReactNode(dialogsSlot)) ? asReactNode(dialogsSlot) : undefined
          }
        />
      </div>
      <Dialog
        open={jsonOpen}
        onOpenChange={setJsonOpen}
        draggable
        noOverlay
        noCenter
        closeOnOutsideClick={false}
      >
        <DialogContent
          offsetRef={jsonOffsetRef}
          aria-describedby={undefined}
          data-slot="designer-json-panel"
          className="right-4 top-[72px] w-[min(560px,calc(100vw-32px))] max-h-[calc(100vh-96px)] p-0 overflow-hidden z-60 flex flex-col sm:max-w-2xl"
        >
          <DialogHeader className="px-4 pt-4 pb-0 shrink-0">
            <DialogTitle className="text-sm">{t('flux.flowDesigner.flowJson')}</DialogTitle>
          </DialogHeader>
          <div data-slot="designer-json-panel-body" className="px-4 pb-4">
            {jsonDocument && <DataViewer data={jsonDocument} />}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(pendingCreateDialog)}
        onOpenChange={(next) => {
          if (!next) handleCloseCreateDialog();
        }}
      >
        <DialogContent data-slot="designer-create-dialog" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {pendingCreateDialog?.nodeType.createDialog?.title ??
                t('flux.flowDesigner.createNodeWithLabel', {
                  label: pendingCreateDialog?.nodeType.label ?? t('flux.flowDesigner.node'),
                })}
            </DialogTitle>
          </DialogHeader>
          <DialogBody data-slot="designer-create-dialog-body">
            {pendingCreateDialog?.nodeType.createDialog?.body
              ? asReactNode(
                  props.helpers.render(pendingCreateDialog.nodeType.createDialog.body, {
                    scope: designerScope,
                    actionScope,
                    pathSuffix: `create-dialog:${pendingCreateDialog.nodeType.id}`,
                  }),
                )
              : null}
          </DialogBody>
          <DialogFooter data-slot="designer-create-dialog-actions" className="bg-transparent">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseCreateDialog}
              disabled={creatingNode}
            >
              {t('flux.flowDesigner.cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => {
                handleConfirmCreateDialog().catch((error) => {
                  console.warn('[flow-designer] create dialog confirm failed', error);
                });
              }}
              disabled={creatingNode}
            >
              {creatingNode ? t('flux.flowDesigner.creating') : t('flux.flowDesigner.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DesignerContext.Provider>
  );
}

interface DesignerPageInnerProps {
  rendererProps: RendererComponentProps<DesignerPageSchema>;
  document?: GraphDocument;
  config: DesignerConfig;
  core?: ReturnType<typeof createDesignerCore>;
  treeDocument?: TreeDocument;
  setTreeDocument?: React.Dispatch<React.SetStateAction<TreeDocument | undefined>>;
}

function DesignerPageInner({
  rendererProps: props,
  document,
  config,
  core: providedCore,
  treeDocument,
  setTreeDocument,
}: DesignerPageInnerProps) {
  const env = useRendererEnv();
  const core = useMemo(() => {
    if (providedCore) {
      return providedCore;
    }
    if (!document) {
      throw new Error('DesignerPageInner requires document when core is not provided.');
    }
    return createDesignerCore(document, config);
  }, [config, document, providedCore]);
  const commandAdapter = useMemo(
    () =>
      createDesignerCommandAdapter(
        core,
        config.documentMode === 'tree' && treeDocument && setTreeDocument
          ? {
              getTreeDocument: () => treeDocument,
              setTreeDocument: (next) => setTreeDocument(next),
              config,
            }
          : undefined,
      ),
    [core, config, treeDocument, setTreeDocument],
  );
  const dispatch = useCallback(
    (command: import('./designer-command-adapter').DesignerCommand) => {
      const result = commandAdapter.execute(command);
      notifyCommandFailure(env.notify, result.error, result.reason);
      return result;
    },
    [commandAdapter, env],
  );

  return (
    <DesignerPageBody
      rendererProps={props}
      core={core}
      commandAdapter={commandAdapter}
      dispatch={dispatch}
      config={config}
    />
  );
}

export function DesignerCanvasRenderer(props: RendererComponentProps) {
  return <DesignerCanvasContent rootProps={getRootMetaProps(props.meta)} />;
}

export function DesignerPaletteRenderer(props: RendererComponentProps) {
  return <DesignerPaletteContent rootProps={getRootMetaProps(props.meta)} />;
}
