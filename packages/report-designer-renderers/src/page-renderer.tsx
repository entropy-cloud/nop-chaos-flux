import React, { useEffect, useMemo, useState } from 'react';
import type { ActionNamespaceProvider, ActionResult, RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent, useCurrentActionScope } from '@nop-chaos/flux-react';
import type {
  ReportDesignerAdapterRegistry,
  ReportDesignerConfig,
  ReportDesignerProfile,
  ReportTemplateDocument,
} from '@nop-chaos/report-designer-core';
import { createReportDesignerCore } from '@nop-chaos/report-designer-core';
import { renderFallbackCanvas, renderFallbackFieldPanel, renderFallbackInspector } from './fallbacks.js';
import { getFieldCount, joinClassNames } from './helpers.js';
import { createHostData } from './host-data.js';
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
  const actionScope = useCurrentActionScope();
  const reportDesignerProvider = useMemo(
    () => createReportDesignerActionProvider((command) => core.dispatch(command as any)),
    [core],
  );

  useEffect(() => {
    if (!actionScope) {
      return;
    }

    return actionScope.registerNamespace('report-designer', reportDesignerProvider);
  }, [actionScope, reportDesignerProvider]);

  useEffect(() => {
    void core.refreshFieldSources();
  }, [core]);

  const [snapshot, setSnapshot] = useState(() => core.getSnapshot());

  useEffect(() => {
    setSnapshot(core.getSnapshot());
    return core.subscribe(() => {
      setSnapshot(core.getSnapshot());
    });
  }, [core]);

  const hostData = useMemo(() => createHostData(core, snapshot), [core, snapshot]);
  const toolbarContent = props.regions.toolbar?.render({ data: hostData });
  const fieldPanelContent = props.regions.fieldPanel?.render({ data: hostData });
  const inspectorContent = props.regions.inspector?.render({ data: hostData });
  const dialogsContent = props.regions.dialogs?.render({ data: hostData });
  const bodyContent = props.regions.body?.render({ data: hostData });

  return (
    <section className={joinClassNames('nop-report-designer', props.meta.className)}>
      <header className="nop-report-designer__header">
        <div>
          <p className="nop-report-designer__eyebrow">Report Designer</p>
          {hasRendererSlotContent(titleContent) ? <h2>{titleContent}</h2> : <h2>{snapshot.document.name}</h2>}
        </div>
        <div className="nop-report-designer__status">
          <span>Target: {snapshot.selectionTarget?.kind ?? 'none'}</span>
          <span>Fields: {getFieldCount(snapshot.fieldSources)}</span>
        </div>
      </header>

      {hasRendererSlotContent(toolbarContent) ? (
        <div className="nop-report-designer__toolbar">{toolbarContent}</div>
      ) : null}

      <div className="nop-report-designer__layout">
        <aside className="nop-report-designer__field-panel">
          {hasRendererSlotContent(fieldPanelContent) ? fieldPanelContent : renderFallbackFieldPanel(snapshot.fieldSources)}
        </aside>

        <main className="nop-report-designer__canvas">
          {hasRendererSlotContent(bodyContent) ? bodyContent : renderFallbackCanvas(snapshot)}
        </main>

        <aside className="nop-report-designer__inspector">
          {hasRendererSlotContent(inspectorContent) ? inspectorContent : renderFallbackInspector(snapshot.activeMeta)}
        </aside>
      </div>

      {hasRendererSlotContent(dialogsContent) ? <div className="nop-report-designer__dialogs">{dialogsContent}</div> : null}
    </section>
  );
}

