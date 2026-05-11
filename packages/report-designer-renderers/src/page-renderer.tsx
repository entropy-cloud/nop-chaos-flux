import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import type { RendererComponentProps, RenderNodeInput } from '@nop-chaos/flux-core';
import type { ReportDesignerHostStatusSummary } from '@nop-chaos/report-designer-core';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useCurrentActionScope,
  useRendererEnv,
  useStatusPathPublication,
  WorkbenchShell,
} from '@nop-chaos/flux-react';
import { createSpreadsheetCore, type SpreadsheetRuntimeSnapshot } from '@nop-chaos/spreadsheet-core';
import {
  createSpreadsheetBridge,
  createSpreadsheetActionProvider,
} from '@nop-chaos/spreadsheet-renderers';
import type {
  ReportDesignerCommand,
  ReportDesignerCommandResult,
  ReportDesignerAdapterRegistry,
  ReportDesignerConfig,
  ReportDesignerCore,
  ReportDesignerProfile,
  ReportTemplateDocument,
} from '@nop-chaos/report-designer-core';
import { createReportDesignerCore } from '@nop-chaos/report-designer-core';
import { t } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import { renderFallbackFieldPanel } from './fallbacks.js';
import { createReportDesignerActionProvider } from './host-action-provider.js';
import { ReportSpreadsheetCanvas } from './report-spreadsheet-canvas.js';
import { getFieldCount } from './helpers.js';
import { useReportDesignerHostScope } from './host-data.js';
import type { ReportDesignerPageSchema } from './types.js';

export interface ReportPageSnapshotSlice {
  document: ReportTemplateDocument;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  selectionTarget: ReturnType<ReportDesignerCore['getSnapshot']>['selectionTarget'];
  inspector: ReturnType<ReportDesignerCore['getSnapshot']>['inspector'];
  fieldDrag: ReturnType<ReportDesignerCore['getSnapshot']>['fieldDrag'];
  preview: ReturnType<ReportDesignerCore['getSnapshot']>['preview'];
  activeMeta: ReturnType<ReportDesignerCore['getSnapshot']>['activeMeta'];
  fieldSources: ReturnType<ReportDesignerCore['getSnapshot']>['fieldSources'];
}

export function selectReportPageSnapshot(
  snapshot: ReturnType<ReportDesignerCore['getSnapshot']>,
): ReportPageSnapshotSlice {
  return {
    document: snapshot.document,
    dirty: snapshot.dirty,
    canUndo: snapshot.canUndo,
    canRedo: snapshot.canRedo,
    selectionTarget: snapshot.selectionTarget,
    inspector: snapshot.inspector,
    fieldDrag: snapshot.fieldDrag,
    preview: snapshot.preview,
    activeMeta: snapshot.activeMeta,
    fieldSources: snapshot.fieldSources,
  };
}

export function equalReportPageSnapshot(a: ReportPageSnapshotSlice, b: ReportPageSnapshotSlice) {
  return (
    a.document === b.document &&
    a.dirty === b.dirty &&
    a.canUndo === b.canUndo &&
    a.canRedo === b.canRedo &&
    a.selectionTarget === b.selectionTarget &&
    a.inspector === b.inspector &&
    a.fieldDrag === b.fieldDrag &&
    a.preview === b.preview &&
    a.activeMeta === b.activeMeta &&
    a.fieldSources === b.fieldSources
  );
}

export interface ReportSpreadsheetSnapshotSlice {
  document: SpreadsheetRuntimeSnapshot['document'];
  activeSheetId: SpreadsheetRuntimeSnapshot['activeSheetId'];
  selection: SpreadsheetRuntimeSnapshot['selection'];
  history: SpreadsheetRuntimeSnapshot['history'];
  dirty: boolean;
  readonly: boolean;
  viewport: SpreadsheetRuntimeSnapshot['viewport'];
  layout: SpreadsheetRuntimeSnapshot['layout'];
}

export function selectReportSpreadsheetSnapshot(
  snapshot: SpreadsheetRuntimeSnapshot,
): ReportSpreadsheetSnapshotSlice {
  return {
    document: snapshot.document,
    activeSheetId: snapshot.activeSheetId,
    selection: snapshot.selection,
    history: snapshot.history,
    dirty: snapshot.dirty,
    readonly: snapshot.readonly,
    viewport: snapshot.viewport,
    layout: snapshot.layout,
  };
}

export function equalReportSpreadsheetSnapshot(
  a: ReportSpreadsheetSnapshotSlice,
  b: ReportSpreadsheetSnapshotSlice,
) {
  return (
    a.document === b.document &&
    a.activeSheetId === b.activeSheetId &&
    a.selection === b.selection &&
    a.history === b.history &&
    a.dirty === b.dirty &&
    a.readonly === b.readonly &&
    a.viewport === b.viewport &&
    a.layout === b.layout
  );
}

function serializeSpreadsheetDocument(document: SpreadsheetRuntimeSnapshot['document']): string {
  return JSON.stringify(document);
}

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

function hasConfiguredFieldPanel(args: {
  config: ReportDesignerConfig;
  adapters: Partial<ReportDesignerAdapterRegistry> | undefined;
  resolvedFieldSources: ReportPageSnapshotSlice['fieldSources'];
}): boolean {
  if (args.config.features?.fieldPanel === false) {
    return false;
  }
  if (args.resolvedFieldSources.length > 0) {
    return true;
  }

  return (args.config.fieldSources ?? []).some((fieldSource) => {
    if (!fieldSource.provider) {
      return true;
    }
    return args.adapters?.fieldSources?.has(fieldSource.provider) ?? false;
  });
}

function hasConfiguredInspector(config: ReportDesignerConfig): boolean {
  if (config.features?.inspector === false) {
    return false;
  }

  const inspector = config.inspector;
  if (!inspector) {
    return false;
  }

  return Boolean(
    inspector.body ||
      (inspector.byTarget && Object.keys(inspector.byTarget).length > 0) ||
      (inspector.byProfile && Object.keys(inspector.byProfile).length > 0),
  );
}

export function ReportDesignerPageRenderer(
  props: RendererComponentProps<ReportDesignerPageSchema>,
) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const resolvedDocument = props.props.document as ReportTemplateDocument;
  const resolvedDesigner = props.props.designer as ReportDesignerConfig;
  const resolvedProfile = props.props.profile as ReportDesignerProfile | undefined;
  const resolvedAdapters = props.props.adapters as
    | Partial<ReportDesignerAdapterRegistry>
    | undefined;
  const spreadsheetCore = useMemo(
    () => createSpreadsheetCore({ document: resolvedDocument.spreadsheet }),
    [resolvedDocument],
  );
  const spreadsheetProvider = useMemo(
    () => createSpreadsheetActionProvider(spreadsheetCore.dispatch),
    [spreadsheetCore],
  );
  const spreadsheetBridge = useMemo(
    () => createSpreadsheetBridge(spreadsheetCore),
    [spreadsheetCore],
  );
  const core = useMemo(
    () =>
      createReportDesignerCore({
        document: resolvedDocument,
        config: resolvedDesigner,
        profile: resolvedProfile,
        adapters: resolvedAdapters,
      }),
    [resolvedAdapters, resolvedDesigner, resolvedDocument, resolvedProfile],
  );
  const reportDesignerProvider = useMemo(
    () =>
      createReportDesignerActionProvider(
        (command: ReportDesignerCommand) =>
          core.dispatch(command) as Promise<ReportDesignerCommandResult>,
      ),
    [core],
  );
  const actionScope = useCurrentActionScope();
  const env = useRendererEnv();

  useLayoutEffect(() => {
    if (!actionScope) {
      return;
    }

    return actionScope.registerNamespace('report-designer', reportDesignerProvider);
  }, [actionScope, reportDesignerProvider]);

  useLayoutEffect(() => {
    if (!actionScope) {
      return;
    }

    return actionScope.registerNamespace('spreadsheet', spreadsheetProvider);
  }, [actionScope, spreadsheetProvider]);

  useEffect(() => {
    void core.refreshFieldSources().catch((error) => {
      env.notify?.(
        'warning',
        error instanceof Error && error.message ? error.message : t('flux.reportDesigner.loadPanelsFailed'),
      );
    });
  }, [core, env]);

  useEffect(() => {
    return () => {
      core.dispose();
    };
  }, [core]);

  const snapshot = useSyncExternalStoreWithSelector(
    core.subscribe,
    core.getSnapshot,
    core.getSnapshot,
    selectReportPageSnapshot,
    equalReportPageSnapshot,
  );
  const spreadsheetSnapshot = useSyncExternalStoreWithSelector(
    spreadsheetCore.subscribe,
    spreadsheetCore.getSnapshot,
    spreadsheetCore.getSnapshot,
    selectReportSpreadsheetSnapshot,
    equalReportSpreadsheetSnapshot,
  );
  const syncingSpreadsheetFromReportRef = useRef(false);
  const lastSyncedSpreadsheetRef = useRef(serializeSpreadsheetDocument(spreadsheetSnapshot.document));
  const lastAppliedReportSpreadsheetRef = useRef(
    serializeSpreadsheetDocument(snapshot.document.spreadsheet),
  );

  useEffect(() => {
    const nextReportSpreadsheet = serializeSpreadsheetDocument(snapshot.document.spreadsheet);

    if (nextReportSpreadsheet === lastAppliedReportSpreadsheetRef.current) {
      return;
    }

    lastAppliedReportSpreadsheetRef.current = nextReportSpreadsheet;
    if (nextReportSpreadsheet === lastSyncedSpreadsheetRef.current) {
      return;
    }

    syncingSpreadsheetFromReportRef.current = true;
    spreadsheetCore.replaceDocument(snapshot.document.spreadsheet);
    lastSyncedSpreadsheetRef.current = nextReportSpreadsheet;
    syncingSpreadsheetFromReportRef.current = false;
  }, [snapshot.document.spreadsheet, spreadsheetCore]);

  useEffect(() => {
    const nextSpreadsheetDocument = serializeSpreadsheetDocument(spreadsheetSnapshot.document);

    if (syncingSpreadsheetFromReportRef.current) {
      return;
    }
    if (nextSpreadsheetDocument === lastSyncedSpreadsheetRef.current) {
      return;
    }

    lastSyncedSpreadsheetRef.current = nextSpreadsheetDocument;
    core.syncSpreadsheetDocument(spreadsheetSnapshot.document);
  }, [core, spreadsheetSnapshot.document]);

  const reportDesignerScope = useReportDesignerHostScope(
    core,
    snapshot,
    props.path,
    spreadsheetSnapshot,
  );

  const toolbarSchema = props.props.toolbar as RenderNodeInput | undefined;
  const fieldPanelSchema = props.props.fieldPanel as RenderNodeInput | undefined;
  const inspectorSchema = props.props.inspector as RenderNodeInput | undefined;

  const toolbarContent = toolbarSchema
    ? props.helpers.render(toolbarSchema, { scope: reportDesignerScope, actionScope })
    : props.regions.toolbar
      ? props.regions.toolbar.render({
          scope: reportDesignerScope,
          actionScope,
        })
      : undefined;
  const fieldPanelContent = fieldPanelSchema
    ? props.helpers.render(fieldPanelSchema, { scope: reportDesignerScope, actionScope })
    : props.regions.fieldPanel
      ? props.regions.fieldPanel.render({
          scope: reportDesignerScope,
          actionScope,
        })
      : undefined;
  const inspectorContent = inspectorSchema
    ? props.helpers.render(inspectorSchema, { scope: reportDesignerScope, actionScope })
    : props.regions.inspector
      ? props.regions.inspector.render({
          scope: reportDesignerScope,
          actionScope,
        })
      : undefined;
  const dialogsContent = props.regions.dialogs
    ? props.regions.dialogs.render({
        scope: reportDesignerScope,
        actionScope,
      })
    : undefined;
  const bodyContent = props.regions.body
    ? props.regions.body.render({
        scope: reportDesignerScope,
        actionScope,
      })
    : undefined;
  const statusPath =
    typeof props.props.statusPath === 'string' ? props.props.statusPath : undefined;

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const showFieldPanel = hasConfiguredFieldPanel({
    config: resolvedDesigner,
    adapters: resolvedAdapters,
    resolvedFieldSources: snapshot.fieldSources,
  });
  const showInspectorPanel = hasConfiguredInspector(resolvedDesigner);

  useStatusPathPublication<ReportDesignerHostStatusSummary>(
    props.node.scope.parent ?? props.node.scope,
    statusPath,
    {
      kind: 'report-designer',
      dirty: snapshot.dirty || spreadsheetSnapshot.dirty,
      busy: snapshot.preview.running,
      canUndo: snapshot.canUndo || spreadsheetSnapshot.history.canUndo,
      canRedo: snapshot.canRedo || spreadsheetSnapshot.history.canRedo,
      previewRunning: snapshot.preview.running,
      selectionKind: snapshot.selectionTarget?.kind,
      fieldSourceCount: snapshot.fieldSources.length,
    },
  );

  const headerSlot = (
    <>
      <div data-slot="report-designer-header">
        <div>
          <p data-slot="report-designer-eyebrow">{t('flux.reportDesigner.title')}</p>
          {hasRendererSlotContent(titleContent) ? (
            <h2>{asReactNode(titleContent)}</h2>
          ) : (
            <h2>{snapshot.document.name}</h2>
          )}
        </div>
        <div data-slot="report-designer-status">
          <span>
            {t('flux.reportDesigner.target')}:{' '}
            {snapshot.selectionTarget?.kind ?? t('flux.reportDesigner.none')}
          </span>
          <span>
            {t('flux.reportDesigner.fields')}: {getFieldCount(snapshot.fieldSources)}
          </span>
        </div>
      </div>
      {hasRendererSlotContent(asReactNode(toolbarContent)) ? (
        <div data-slot="report-designer-toolbar">{asReactNode(toolbarContent)}</div>
      ) : null}
    </>
  );

  return (
    <WorkbenchShell
      className={cn('nop-report-designer', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
      header={headerSlot}
      leftPanel={
        showFieldPanel
          ? hasRendererSlotContent(asReactNode(fieldPanelContent))
            ? asReactNode(fieldPanelContent)
            : renderFallbackFieldPanel(snapshot.fieldSources)
          : undefined
      }
      leftCollapsed={leftCollapsed}
      onLeftToggle={() => setLeftCollapsed((v) => !v)}
      leftLabel={t('flux.reportDesigner.expandFieldPanel')}
      leftCollapseLabel={t('flux.reportDesigner.collapseFieldPanel')}
      canvas={
        hasRendererSlotContent(asReactNode(bodyContent)) ? (
          asReactNode(bodyContent)
        ) : (
          <ReportSpreadsheetCanvas
            core={core}
            snapshot={snapshot}
            spreadsheetBridge={spreadsheetBridge}
            spreadsheetSnapshot={spreadsheetSnapshot}
          />
        )
      }
      rightPanel={
        showInspectorPanel
          ? hasRendererSlotContent(asReactNode(inspectorContent))
            ? asReactNode(inspectorContent)
            : asReactNode(
                props.helpers.render(
                  { type: 'report-inspector-shell' },
                  {
                    scope: reportDesignerScope,
                    actionScope,
                  },
                ),
              )
          : undefined
      }
      rightCollapsed={rightCollapsed}
      onRightToggle={() => setRightCollapsed((v) => !v)}
      rightLabel={t('flux.reportDesigner.expandInspector')}
      rightCollapseLabel={t('flux.reportDesigner.collapseInspector')}
      dialogs={
        hasRendererSlotContent(asReactNode(dialogsContent))
          ? asReactNode(dialogsContent)
          : undefined
      }
    />
  );
}
