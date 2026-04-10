import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { ActionNamespaceProvider, ActionResult, RendererComponentProps, RenderNodeInput, ReportDesignerHostStatusSummary } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent, useCurrentActionScope, WorkbenchShell } from '@nop-chaos/flux-react';
import { publishOwnerStatus } from '@nop-chaos/flux-runtime';
import type {
  ReportDesignerAdapterRegistry,
  ReportDesignerConfig,
  ReportDesignerProfile,
  ReportTemplateDocument,
} from '@nop-chaos/report-designer-core';
import { createReportDesignerCore } from '@nop-chaos/report-designer-core';
import { renderFallbackFieldPanel, renderFallbackInspector } from './fallbacks.js';
import { ReportSpreadsheetCanvas } from './report-spreadsheet-canvas.js';
import { getFieldCount } from './helpers.js';
import { useReportDesignerHostScope } from './host-data.js';
import type { ReportDesignerPageSchema } from './types.js';

function toActionResult(response: unknown): ActionResult {
  if (response && typeof response === 'object' && 'ok' in response) {
    return {
      ok: Boolean((response as { ok?: unknown }).ok),
      data: response,
    };
  }

  return {
    ok: true,
    data: response,
  };
}

function createReportDesignerActionProvider(
  dispatch: (command: Record<string, unknown>) => Promise<unknown>,
): ActionNamespaceProvider {
  return {
    kind: 'host',
    listMethods() {
      return [];
    },
    async invoke(method, payload) {
      const args = payload && typeof payload === 'object' && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : {};
      const result = await dispatch({
        type: `report-designer:${method}`,
        ...args,
      });
      return toActionResult(result);
    },
  };
}

export function ReportDesignerPageRenderer(props: RendererComponentProps<ReportDesignerPageSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const resolvedDocument = props.props.document as ReportTemplateDocument;
  const resolvedDesigner = props.props.designer as ReportDesignerConfig;
  const resolvedProfile = props.props.profile as ReportDesignerProfile | undefined;
  const resolvedAdapters = props.props.adapters as Partial<ReportDesignerAdapterRegistry> | undefined;
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
    () => createReportDesignerActionProvider((command) => core.dispatch(command as any)),
    [core],
  );
  const actionScope = useCurrentActionScope();

  useEffect(() => {
    if (!actionScope) {
      return;
    }

    return actionScope.registerNamespace('report-designer', reportDesignerProvider);
  }, [actionScope, reportDesignerProvider]);

  useEffect(() => {
    void core.refreshFieldSources();
  }, [core]);

  const snapshot = useSyncExternalStore(
    core.subscribe,
    core.getSnapshot,
    core.getSnapshot,
  );

  const reportDesignerScope = useReportDesignerHostScope(core, snapshot, props.path);

  const toolbarSchema = props.props.toolbar as RenderNodeInput | undefined;
  const fieldPanelSchema = props.props.fieldPanel as RenderNodeInput | undefined;
  const inspectorSchema = props.props.inspector as RenderNodeInput | undefined;

  const toolbarContent = toolbarSchema
    ? props.helpers.render(toolbarSchema, { scope: reportDesignerScope, actionScope })
    : props.regions.toolbar
      ? props.helpers.render(props.regions.toolbar.templateNode, { scope: reportDesignerScope, actionScope })
      : undefined;
  const fieldPanelContent = fieldPanelSchema
    ? props.helpers.render(fieldPanelSchema, { scope: reportDesignerScope, actionScope })
    : props.regions.fieldPanel
      ? props.helpers.render(props.regions.fieldPanel.templateNode, { scope: reportDesignerScope, actionScope })
      : undefined;
  const inspectorContent = inspectorSchema
    ? props.helpers.render(inspectorSchema, { scope: reportDesignerScope, actionScope })
    : props.regions.inspector
      ? props.helpers.render(props.regions.inspector.templateNode, { scope: reportDesignerScope, actionScope })
      : undefined;
  const dialogsContent = props.regions.dialogs
    ? props.helpers.render(props.regions.dialogs.templateNode, { scope: reportDesignerScope, actionScope })
    : undefined;
  const bodyContent = props.regions.body
    ? props.helpers.render(props.regions.body.templateNode, { scope: reportDesignerScope, actionScope })
    : undefined;
  const statusPath = typeof props.schema.statusPath === 'string' ? props.schema.statusPath : undefined;

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  useEffect(() => {
    if (!statusPath) {
      return;
    }

    const summary: ReportDesignerHostStatusSummary = {
      kind: 'report-designer',
      dirty: false,
      busy: snapshot.preview.running,
      canUndo: snapshot.canUndo,
      canRedo: snapshot.canRedo,
      previewRunning: snapshot.preview.running,
      selectionKind: snapshot.selectionTarget?.kind,
      fieldSourceCount: snapshot.fieldSources.length,
    };
    publishOwnerStatus(props.node.scope.parent ?? props.node.scope, statusPath, summary);
  }, [props.node.scope, snapshot, statusPath]);

  const headerSlot = (
    <>
      <div data-slot="report-designer-header">
        <div>
          <p data-slot="report-designer-eyebrow">Report Designer</p>
          {hasRendererSlotContent(titleContent) ? <h2>{titleContent}</h2> : <h2>{snapshot.document.name}</h2>}
        </div>
        <div data-slot="report-designer-status">
          <span>Target: {snapshot.selectionTarget?.kind ?? 'none'}</span>
          <span>Fields: {getFieldCount(snapshot.fieldSources)}</span>
        </div>
      </div>
      {hasRendererSlotContent(toolbarContent) ? (
        <div data-slot="report-designer-toolbar">{toolbarContent}</div>
      ) : null}
    </>
  );

  return (
    <WorkbenchShell
      className={props.meta.className ? `nop-report-designer ${props.meta.className}` : 'nop-report-designer'}
      header={headerSlot}
      leftPanel={hasRendererSlotContent(fieldPanelContent) ? fieldPanelContent : renderFallbackFieldPanel(snapshot.fieldSources)}
      leftCollapsed={leftCollapsed}
      onLeftToggle={() => setLeftCollapsed((v) => !v)}
      leftLabel="Expand field panel"
      canvas={hasRendererSlotContent(bodyContent) ? bodyContent : <ReportSpreadsheetCanvas core={core} snapshot={snapshot} />}
      rightPanel={hasRendererSlotContent(inspectorContent) ? inspectorContent : renderFallbackInspector(snapshot.activeMeta)}
      rightCollapsed={rightCollapsed}
      onRightToggle={() => setRightCollapsed((v) => !v)}
      rightLabel="Expand inspector"
      dialogs={hasRendererSlotContent(dialogsContent) ? dialogsContent : undefined}
    />
  );
}
