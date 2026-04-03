import React, { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ActionNamespaceProvider, ActionResult, RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent, useCurrentActionScope } from '@nop-chaos/flux-react';
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

interface SpreadsheetPageHostData {
  spreadsheetCore: ReturnType<typeof createSpreadsheetCore>;
  spreadsheetSnapshot: SpreadsheetRuntimeSnapshot;
  spreadsheet: ReturnType<typeof deriveHostSnapshot>;
}

function renderFallbackBody(snapshot: SpreadsheetRuntimeSnapshot) {
  const activeSheetName = getRuntimeActiveSheetName(snapshot);
  const cellCount = getRuntimeActiveSheetCellCount(snapshot);

  return (
    <div className="nop-spreadsheet-page__fallback">
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
  const resolvedReadonly = props.props.readonly as boolean | undefined;

  const spreadsheetCore = useMemo(
    () =>
      createSpreadsheetCore({
        document: resolvedDocument,
        config: resolvedConfig,
        readonly: resolvedReadonly,
      }),
    [resolvedConfig, resolvedDocument, resolvedReadonly],
  );
  const actionScope = useCurrentActionScope();
  const spreadsheetProvider = useMemo(
    () => createSpreadsheetActionProvider((command) => spreadsheetCore.dispatch(command as any)),
    [spreadsheetCore],
  );

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
  const hostData = useMemo<SpreadsheetPageHostData>(
    () => ({
      spreadsheetCore,
      spreadsheetSnapshot: snapshot,
      spreadsheet,
    }),
    [spreadsheet, spreadsheetCore, snapshot],
  );

  const toolbarContent = props.regions.toolbar?.render({ data: hostData });
  const bodyContent = props.regions.body?.render({ data: hostData });
  const dialogsContent = props.regions.dialogs?.render({ data: hostData });

  return (
    <section className="nop-spreadsheet-page">
      <header className="nop-spreadsheet-page__header">
        <h2>{hasRendererSlotContent(titleContent) ? titleContent : 'Spreadsheet Designer'}</h2>
        <p>{buildSpreadsheetStatusLabel(spreadsheet)}</p>
      </header>

      {hasRendererSlotContent(toolbarContent) ? <div className="nop-spreadsheet-page__toolbar">{toolbarContent}</div> : null}

      <main className="nop-spreadsheet-page__body">
        {hasRendererSlotContent(bodyContent) ? bodyContent : renderFallbackBody(snapshot)}
      </main>

      {hasRendererSlotContent(dialogsContent) ? <div className="nop-spreadsheet-page__dialogs">{dialogsContent}</div> : null}
    </section>
  );
}
