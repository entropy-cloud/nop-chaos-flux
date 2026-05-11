import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  reportRuntimeHostIssue,
  type ActionNamespaceProvider,
  type RendererComponentProps,
} from '@nop-chaos/flux-core';
import type { DesignerHostStatusSummary } from '@nop-chaos/flow-designer-core';
import {
  hasRendererSlotContent,
  useCurrentActionScope,
  useRendererEnv,
  useStatusPathPublication,
  WorkbenchShell,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { createDesignerCore } from '@nop-chaos/flow-designer-core';
import type { DesignerConfig } from '@nop-chaos/flow-designer-core';
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
import { createDesignerCommandAdapter } from './designer-command-adapter.js';
import type { DesignerPageSchema } from './schemas.js';
import {
  DesignerContext,
  type DesignerContextValue,
  useDesignerSnapshot,
  useDesignerHostScope,
} from './designer-context.js';
import { createDesignerActionProvider } from './designer-action-provider.js';
import {
  confirmCreateDialog,
  createDesignerContextValue,
  createMergedDesignerProvider,
  renderDesignerSchema,
  type DesignerCreateDialogState,
} from './designer-page-helpers.js';
import { DesignerPaletteContent } from './designer-palette.js';
import { DesignerCanvasContent, invokeDesignerPlusButtonHandler } from './designer-canvas.js';
import { DefaultInspector } from './designer-inspector.js';
import { DesignerToolbarContent } from './designer-toolbar.js';
import { useDesignerAutoLayout } from './use-designer-auto-layout.js';
import { useDesignerShortcuts } from './use-designer-shortcuts.js';
import { emitTreeLayoutDebugSnapshot } from './tree-layout-debug.js';

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

function hasPalettePanel(config: DesignerConfig): boolean {
  return (config.palette?.groups.length ?? 0) > 0;
}

function hasInspectorPanel(config: DesignerConfig): boolean {
  return (
    config.nodeTypes.some((nodeType) => nodeType.inspector?.body !== undefined) ||
    (config.edgeTypes ?? []).some((edgeType) => edgeType.inspector?.body !== undefined)
  );
}

function readDesignerResolvedProp<T>(
  props: RendererComponentProps<DesignerPageSchema>,
  key: string,
): T | undefined {
  return props.props[key] as T | undefined;
}

interface DesignerPageBodyProps {
  rendererProps: RendererComponentProps<DesignerPageSchema>;
  core: ReturnType<typeof createDesignerCore>;
  commandAdapter: ReturnType<typeof createDesignerCommandAdapter>;
  dispatch: (
    command: import('./designer-command-adapter.js').DesignerCommand,
  ) => import('./designer-command-adapter.js').DesignerCommandResult;
  config: DesignerConfig;
}

interface DesignerTestConnectDetail {
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
}

export function DesignerPageBody({
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
  const { layoutBusy, layoutError, handleAutoLayout } = useDesignerAutoLayout(core, config);

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
        invokeDesignerPlusButtonHandler(core, sourceId, clientX, clientY, sourceKind);
      }
    },
    [core, isTreeMode],
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
  const creatingNodeRef = useRef(false);
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
    if (!pendingCreateDialog || creatingNodeRef.current) {
      return;
    }

    creatingNodeRef.current = true;
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
      creatingNodeRef.current = false;
      setCreatingNode(false);
    }
  }, [actionScope, designerScope, dispatch, pendingCreateDialog, props.helpers]);

  const reportHostIssue = useCallback(
    (input: { message: string; error?: unknown; details?: Record<string, unknown> }) => {
      reportRuntimeHostIssue({
        env,
        level: 'error',
        message: input.message,
        error: input.error,
        phase: 'render',
        details: input.details,
      });
    },
    [env],
  );

  useEffect(() => {
    if (!layoutError) {
      return;
    }

    reportHostIssue({
      message: layoutError,
      error: new Error(layoutError),
      details: {
        reason: 'designer-auto-layout-failed',
        documentId: snapshot.doc.id,
        documentMode: config.documentMode,
      },
    });
  }, [config.documentMode, layoutError, reportHostIssue, snapshot.doc.id]);

  const ctxValue = useMemo<DesignerContextValue>(
    () =>
      createDesignerContextValue({
        core,
        commandAdapter,
        dispatch,
        config,
        openCreateDialog: handleOpenCreateDialog,
        onPlusButtonClick: ctxOnPlusButtonClick,
        reportHostIssue,
      }),
    [
      commandAdapter,
      config,
      core,
      dispatch,
      handleOpenCreateDialog,
      ctxOnPlusButtonClick,
      reportHostIssue,
    ],
  );

  useLayoutEffect(() => {
    if (!actionScope || !mergedDesignerProvider) {
      return;
    }

    return actionScope.registerNamespace('designer', mergedDesignerProvider);
  }, [actionScope, mergedDesignerProvider]);

  useDesignerShortcuts({ core, rootRef, dispatch });

  const toolbarSlot = props.regions.toolbar?.render({
    scope: designerScope,
    actionScope,
  });
  const inspectorSlot = props.regions.inspector
    ? props.regions.inspector.render({
        scope: designerScope,
        actionScope,
      })
    : ((props.props as Record<string, unknown>).inspector as React.ReactNode);
  const dialogsSlot = props.regions.dialogs
    ? props.regions.dialogs.render({
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
  const showPalettePanel = hasPalettePanel(config);
  const showInspectorPanel = hasInspectorPanel(config);

  useStatusPathPublication<DesignerHostStatusSummary>(
    props.node.scope.parent ?? props.node.scope,
    statusPath,
    {
      kind: 'designer',
      dirty: snapshot.isDirty,
      busy: layoutBusy,
      error: layoutError,
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
          leftPanel={showPalettePanel ? <DesignerPaletteContent /> : undefined}
          leftCollapsed={snapshot.paletteCollapsed}
          onLeftToggle={() => dispatch({ type: 'togglePalette' })}
          leftLabel={t('flux.flowDesigner.expandPalette')}
          leftCollapseLabel={t('flux.flowDesigner.collapsePalette')}
          canvas={<DesignerCanvasContent />}
          rightPanel={
            showInspectorPanel
              ? hasRendererSlotContent(asReactNode(inspectorSlot))
                ? asReactNode(inspectorSlot)
                : <DefaultInspector renderSchema={renderInspectorSchema} />
              : undefined
          }
          rightCollapsed={snapshot.inspectorCollapsed}
          onRightToggle={() => dispatch({ type: 'toggleInspector' })}
          rightLabel={t('flux.flowDesigner.expandInspector')}
          rightCollapseLabel={t('flux.flowDesigner.collapseInspector')}
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
