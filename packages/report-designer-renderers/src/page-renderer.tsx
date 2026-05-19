import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { reportRuntimeHostIssue, type RendererComponentProps, type RenderNodeInput } from '@nop-chaos/flux-core';
import type { ReportDesignerHostStatusSummary } from '@nop-chaos/report-designer-core';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useCurrentActionScope,
  useRendererEnv,
  useStatusPathPublication,
  WorkbenchShell,
} from '@nop-chaos/flux-react';
import {
  createEmptyDocument,
  createSpreadsheetCore,
  type SpreadsheetRuntimeSnapshot,
} from '@nop-chaos/spreadsheet-core';
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
import {
  createEmptyAdapterRegistry,
  createReportDesignerCore,
  createReportTemplateDocument,
} from '@nop-chaos/report-designer-core';
import { t } from '@nop-chaos/flux-i18n';
import { Button, cn, resolveLucideIcon } from '@nop-chaos/ui';
import { renderFallbackFieldPanel } from './fallbacks.js';
import { createReportDesignerActionProvider } from './host-action-provider.js';
import { ReportSpreadsheetCanvas } from './report-spreadsheet-canvas.js';
import { getFieldCount } from './helpers.js';
import { useReportDesignerHostScope } from './host-data.js';
import type { ReportDesignerPageSchema } from './types.js';

export interface ReportPageSnapshotSlice {
  document: ReportTemplateDocument;
  spreadsheetSyncSource?: ReportTemplateDocument['spreadsheet'];
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
    spreadsheetSyncSource: snapshot.spreadsheetSyncSource,
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
    a.spreadsheetSyncSource === b.spreadsheetSyncSource &&
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

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isReportTemplateDocument(value: unknown): value is ReportTemplateDocument {
  return (
    isRecord(value) &&
    value.kind === 'report-template' &&
    typeof value.name === 'string' &&
    isRecord(value.spreadsheet)
  );
}

function resolveReportTemplateDocument(value: unknown): ReportTemplateDocument {
  if (isReportTemplateDocument(value)) {
    return value;
  }

  return createReportTemplateDocument(createEmptyDocument('report-designer-page-invalid-document'));
}

function resolveReportDesignerConfig(value: unknown): ReportDesignerConfig {
  return isRecord(value) ? (value as ReportDesignerConfig) : {};
}

function hasValidReportTemplateDocument(value: unknown): boolean {
  return isReportTemplateDocument(value);
}

function hasValidReportDesignerConfig(value: unknown): boolean {
  return isRecord(value);
}

function resolveReportDesignerProfile(value: unknown): ReportDesignerProfile | undefined {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.kind !== 'string') {
    return undefined;
  }

  return {
    id: value.id,
    kind: value.kind,
    fieldSourceIds: Array.isArray(value.fieldSourceIds)
      ? value.fieldSourceIds.filter((item): item is string => typeof item === 'string')
      : [],
    fieldDropIds: Array.isArray(value.fieldDropIds)
      ? value.fieldDropIds.filter((item): item is string => typeof item === 'string')
      : [],
    inspectorSchemaId:
      typeof value.inspectorSchemaId === 'string' ? value.inspectorSchemaId : undefined,
    previewId: typeof value.previewId === 'string' ? value.previewId : undefined,
    codecId: typeof value.codecId === 'string' ? value.codecId : undefined,
    expressionEditorId:
      typeof value.expressionEditorId === 'string' ? value.expressionEditorId : undefined,
  };
}

function resolveReportDesignerAdapters(
  value: unknown,
): Partial<ReportDesignerAdapterRegistry> | undefined {
  return isRecord(value) ? (value as Partial<ReportDesignerAdapterRegistry>) : undefined;
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  const Icon = resolveLucideIcon(direction === 'left' ? 'chevron-left' : 'chevron-right');
  const Comp = Icon as React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  return <Comp className="nop-icon" size={16} strokeWidth={1.8} aria-hidden="true" />;
}

function renderPanelFrame(input: {
  title: string;
  subtitle: string;
  collapseLabel: string;
  collapseIcon: 'left' | 'right';
  collapseTestId: string;
  onCollapse: () => void;
  content: React.ReactNode;
}) {
  const CollapseButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={input.onCollapse}
      aria-label={input.collapseLabel}
      data-testid={input.collapseTestId}
      className="shrink-0 self-start"
    >
      <ChevronIcon direction={input.collapseIcon} />
    </Button>
  );

  return (
    <div className="flex h-full min-h-0 flex-col text-foreground">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        {input.collapseIcon === 'right' ? CollapseButton : null}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">{input.title}</div>
          <div className="text-sm text-muted-foreground">{input.subtitle}</div>
        </div>
        {input.collapseIcon === 'left' ? CollapseButton : null}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3">{input.content}</div>
    </div>
  );
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
  const env = useRendererEnv();
  const documentInputValid = hasValidReportTemplateDocument(props.props.document);
  const configInputValid = hasValidReportDesignerConfig(props.props.config);
  const resolvedDocument = useMemo(
    () => resolveReportTemplateDocument(props.props.document),
    [props.props.document],
  );
  const resolvedDesigner = useMemo(
    () => resolveReportDesignerConfig(props.props.config),
    [props.props.config],
  );
  const resolvedProfile = useMemo(
    () => resolveReportDesignerProfile(props.props.profile),
    [props.props.profile],
  );
  const resolvedAdapters = useMemo(
    () => resolveReportDesignerAdapters(props.props.adapters),
    [props.props.adapters],
  );
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
        adapters: resolvedAdapters ?? createEmptyAdapterRegistry(),
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

  useEffect(() => {
    if (documentInputValid && configInputValid) {
      return;
    }

    const issues: string[] = [];
    if (!documentInputValid) {
      issues.push('document');
    }
    if (!configInputValid) {
      issues.push('config');
    }

    const error = new Error(`report-designer-page received invalid required prop(s): ${issues.join(', ')}`);
    reportRuntimeHostIssue({
      env,
      error,
      phase: 'render',
      path: props.path,
      details: {
        schemaPath: props.path,
        operation: 'resolveReportDesignerPageInputs',
        invalidProps: issues,
      },
    });
    env.notify?.('warning', error.message);
  }, [configInputValid, documentInputValid, env, props.path]);

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
    void core.initialize().catch((error) => {
      reportRuntimeHostIssue({
        env,
        error,
        phase: 'render',
        path: props.path,
        details: {
          schemaPath: props.path,
          operation: 'initializeReportDesigner',
        },
      });
      env.notify?.(
        'warning',
        error instanceof Error && error.message ? error.message : t('flux.reportDesigner.loadPanelsFailed'),
      );
    });
  }, [core, env, props.path]);

  useEffect(() => {
    if (!hasConfiguredInspector(resolvedDesigner)) {
      return;
    }
    if (core.getSnapshot().inspector.open) {
      return;
    }

    void core.dispatch({ type: 'report-designer:openInspector' }).catch((error) => {
      reportRuntimeHostIssue({
        env,
        error,
        phase: 'render',
        path: props.path,
        details: {
          schemaPath: props.path,
          operation: 'seedReportInspectorOpenState',
        },
      });
    });
  }, [core, env, props.path, resolvedDesigner]);

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
  const lastSyncedSpreadsheetRef = useRef(spreadsheetSnapshot.document);
  const lastAppliedReportSpreadsheetRef = useRef(snapshot.document.spreadsheet);

  useEffect(() => {
    const nextReportSpreadsheet = snapshot.document.spreadsheet;

    if (nextReportSpreadsheet === lastAppliedReportSpreadsheetRef.current) {
      return;
    }

    lastAppliedReportSpreadsheetRef.current = nextReportSpreadsheet;
    if (
      nextReportSpreadsheet === lastSyncedSpreadsheetRef.current ||
      snapshot.spreadsheetSyncSource === lastSyncedSpreadsheetRef.current
    ) {
      return;
    }

    syncingSpreadsheetFromReportRef.current = true;
    spreadsheetCore.replaceDocument(snapshot.document.spreadsheet);
    lastSyncedSpreadsheetRef.current = nextReportSpreadsheet;
    syncingSpreadsheetFromReportRef.current = false;
  }, [snapshot.document.spreadsheet, snapshot.spreadsheetSyncSource, spreadsheetCore]);

  useEffect(() => {
    const nextSpreadsheetDocument = spreadsheetSnapshot.document;

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
  const showInspectorPanel = hasConfiguredInspector(resolvedDesigner) && snapshot.inspector.open;

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

  const leftPanelSlot = showFieldPanel
    ? renderPanelFrame({
        title: t('flux.reportDesigner.fieldSources'),
        subtitle: `${getFieldCount(snapshot.fieldSources)} ${t('flux.reportDesigner.fields')}`,
        collapseLabel: t('flux.reportDesigner.collapseFieldPanel'),
        collapseIcon: 'left',
        collapseTestId: 'collapse-report-field-panel',
        onCollapse: () => setLeftCollapsed(true),
        content: hasRendererSlotContent(asReactNode(fieldPanelContent))
          ? asReactNode(fieldPanelContent)
          : renderFallbackFieldPanel(snapshot.fieldSources),
      })
    : undefined;

  const rightPanelSlot = showInspectorPanel
    ? renderPanelFrame({
        title: t('flux.reportDesigner.inspectorTitle'),
        subtitle: t('flux.reportDesigner.inspectorSubtitle'),
        collapseLabel: t('flux.reportDesigner.collapseInspector'),
        collapseIcon: 'right',
        collapseTestId: 'collapse-report-inspector',
        onCollapse: () => setRightCollapsed(true),
        content: hasRendererSlotContent(asReactNode(inspectorContent))
          ? asReactNode(inspectorContent)
          : asReactNode(
              props.helpers.render(
                { type: 'report-inspector-shell' },
                {
                  scope: reportDesignerScope,
                  actionScope,
                },
              ),
            ),
      })
    : undefined;

  return (
    <WorkbenchShell
      className={cn('nop-report-designer', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
      header={headerSlot}
      leftPanel={leftPanelSlot}
      leftCollapsed={leftCollapsed}
      onLeftToggle={() => setLeftCollapsed((v) => !v)}
      leftLabel={t('flux.reportDesigner.expandFieldPanel')}
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
      rightPanel={rightPanelSlot}
      rightCollapsed={rightCollapsed}
      onRightToggle={() => setRightCollapsed((v) => !v)}
      rightLabel={t('flux.reportDesigner.expandInspector')}
      dialogs={
        hasRendererSlotContent(asReactNode(dialogsContent))
          ? asReactNode(dialogsContent)
          : undefined
      }
    />
  );
}
