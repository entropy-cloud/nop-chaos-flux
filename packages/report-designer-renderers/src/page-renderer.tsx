import React, { useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { RendererComponentProps, RenderNodeInput } from '@nop-chaos/flux-core';
import type { ReportDesignerHostStatusSummary } from '@nop-chaos/report-designer-core';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useCurrentActionScope,
  useStatusPathPublication,
  WorkbenchShell,
} from '@nop-chaos/flux-react';
import { createSpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import {
  createSpreadsheetBridge,
  createSpreadsheetActionProvider,
} from '@nop-chaos/spreadsheet-renderers';
import type {
  ReportDesignerCommand,
  ReportDesignerCommandResult,
  ReportDesignerAdapterRegistry,
  ReportDesignerConfig,
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

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
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
    void core.refreshFieldSources();
  }, [core]);

  useEffect(() => {
    return () => {
      core.dispose();
    };
  }, [core]);

  const snapshot = useSyncExternalStore(core.subscribe, core.getSnapshot, core.getSnapshot);
  const spreadsheetSnapshot = useSyncExternalStore(
    spreadsheetCore.subscribe,
    spreadsheetCore.getSnapshot,
    spreadsheetCore.getSnapshot,
  );

  useEffect(() => {
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
      ? props.helpers.render(props.regions.toolbar.templateNode, {
          scope: reportDesignerScope,
          actionScope,
        })
      : undefined;
  const fieldPanelContent = fieldPanelSchema
    ? props.helpers.render(fieldPanelSchema, { scope: reportDesignerScope, actionScope })
    : props.regions.fieldPanel
      ? props.helpers.render(props.regions.fieldPanel.templateNode, {
          scope: reportDesignerScope,
          actionScope,
        })
      : undefined;
  const inspectorContent = inspectorSchema
    ? props.helpers.render(inspectorSchema, { scope: reportDesignerScope, actionScope })
    : props.regions.inspector
      ? props.helpers.render(props.regions.inspector.templateNode, {
          scope: reportDesignerScope,
          actionScope,
        })
      : undefined;
  const dialogsContent = props.regions.dialogs
    ? props.helpers.render(props.regions.dialogs.templateNode, {
        scope: reportDesignerScope,
        actionScope,
      })
    : undefined;
  const bodyContent = props.regions.body
    ? props.helpers.render(props.regions.body.templateNode, {
        scope: reportDesignerScope,
        actionScope,
      })
    : undefined;
  const statusPath =
    typeof props.props.statusPath === 'string' ? props.props.statusPath : undefined;

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

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
        hasRendererSlotContent(asReactNode(fieldPanelContent))
          ? asReactNode(fieldPanelContent)
          : renderFallbackFieldPanel(snapshot.fieldSources)
      }
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
      rightPanel={
        hasRendererSlotContent(asReactNode(inspectorContent))
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
      }
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
