import React, { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ActionNamespaceProvider, ActionResult, RendererComponentProps, SpreadsheetHostStatusSummary } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent, useCurrentActionScope, useHostScope } from '@nop-chaos/flux-react';
import { publishOwnerStatus } from '@nop-chaos/flux-runtime';
import { createSpreadsheetCore, type SpreadsheetConfig, type SpreadsheetDocument, type SpreadsheetRuntimeSnapshot } from '@nop-chaos/spreadsheet-core';
import { deriveHostSnapshot } from './bridge.js';
import { buildSpreadsheetStatusLabel, getRuntimeActiveSheetCellCount, getRuntimeActiveSheetName } from './page-model.js';
import type { SpreadsheetPageSchema } from './types.js';

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

function createSpreadsheetActionProvider(
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
        type: `spreadsheet:${method}`,
        ...args,
      });
      return toActionResult(result);
    },
  };
}

function renderFallbackBody(snapshot: SpreadsheetRuntimeSnapshot) {
  const activeSheetName = getRuntimeActiveSheetName(snapshot);
  const cellCount = getRuntimeActiveSheetCellCount(snapshot);

  return (
    <div data-slot="spreadsheet-page-fallback">
      <p>Spreadsheet canvas region is not configured.</p>
      <p>Active sheet: {activeSheetName}.</p>
      <p>Cell entries: {cellCount}.</p>
    </div>
  );
}

export function SpreadsheetPageRenderer(props: RendererComponentProps<SpreadsheetPageSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const resolvedDocument = props.props.document as SpreadsheetDocument;
  const resolvedConfig = props.props.config as SpreadsheetConfig | undefined;
  const resolvedReadOnly = props.props.readOnly as boolean | undefined;

  const spreadsheetCore = useMemo(
    () =>
      createSpreadsheetCore({
        document: resolvedDocument,
        config: resolvedConfig,
        readonly: resolvedReadOnly,
      }),
    [resolvedConfig, resolvedDocument, resolvedReadOnly],
  );
  const spreadsheetProvider = useMemo(
    () => createSpreadsheetActionProvider((command) => spreadsheetCore.dispatch(command as any)),
    [spreadsheetCore],
  );
  const actionScope = useCurrentActionScope();

  useEffect(() => {
    if (!actionScope) {
      return;
    }

    return actionScope.registerNamespace('spreadsheet', spreadsheetProvider);
  }, [actionScope, spreadsheetProvider]);

  const snapshot = useSyncExternalStore(
    spreadsheetCore.subscribe,
    spreadsheetCore.getSnapshot,
    spreadsheetCore.getSnapshot,
  );

  const spreadsheet = useMemo(() => deriveHostSnapshot(snapshot), [snapshot]);
  const spreadsheetScope = useHostScope({ spreadsheet }, props.path, 'spreadsheet');

  const toolbarContent = props.regions.toolbar?.render({ scope: spreadsheetScope, actionScope });
  const bodyContent = props.regions.body?.render({ scope: spreadsheetScope, actionScope });
  const dialogsContent = props.regions.dialogs?.render({ scope: spreadsheetScope, actionScope });
  const statusPath = typeof props.schema.statusPath === 'string' ? props.schema.statusPath : undefined;

  useEffect(() => {
    if (!statusPath) {
      return;
    }

    const summary: SpreadsheetHostStatusSummary = {
      kind: 'spreadsheet',
      dirty: spreadsheet.runtime.dirty,
      busy: false,
      canUndo: spreadsheet.runtime.canUndo,
      canRedo: spreadsheet.runtime.canRedo,
      readonly: spreadsheet.runtime.readonly,
      activeSheetId: spreadsheet.activeSheet?.id,
      selectionKind: snapshot.selection.kind,
    };
    publishOwnerStatus(props.nodeInstance.scope.parent ?? props.nodeInstance.scope, statusPath, summary);
  }, [props.nodeInstance.scope, snapshot.selection.kind, spreadsheet, statusPath]);

  return (
    <section className="nop-spreadsheet-page">
      <header data-slot="spreadsheet-page-header">
        <h2>{hasRendererSlotContent(titleContent) ? titleContent : 'Spreadsheet Designer'}</h2>
        <p>{buildSpreadsheetStatusLabel(spreadsheet)}</p>
      </header>

      {hasRendererSlotContent(toolbarContent) ? <div data-slot="spreadsheet-page-toolbar">{toolbarContent}</div> : null}

      <main data-slot="spreadsheet-page-body">
        {hasRendererSlotContent(bodyContent) ? bodyContent : renderFallbackBody(snapshot)}
      </main>

      {hasRendererSlotContent(dialogsContent) ? <div data-slot="spreadsheet-page-dialogs">{dialogsContent}</div> : null}
    </section>
  );
}
