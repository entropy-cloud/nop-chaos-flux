import React, { useEffect, useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import type {
  ActionNamespaceProvider,
  ActionResult,
  RendererComponentProps,
} from '@nop-chaos/flux-core';
import type { SpreadsheetHostStatusSummary } from '@nop-chaos/spreadsheet-core';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useCurrentActionScope,
  useHostScope,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { publishOwnerStatus } from '@nop-chaos/flux-react';
import {
  createSpreadsheetCore,
  type SpreadsheetConfig,
  type SpreadsheetDocument,
  type SpreadsheetRuntimeSnapshot,
} from '@nop-chaos/spreadsheet-core';
import { cn } from '@nop-chaos/ui';
import { deriveHostSnapshot } from './bridge.js';
import {
  buildSpreadsheetStatusLabel,
  getRuntimeActiveSheetCellCount,
  getRuntimeActiveSheetName,
} from './page-model.js';
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
      const args =
        payload && typeof payload === 'object' && !Array.isArray(payload)
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
      <p>{t('flux.spreadsheet.canvasNotConfigured')}</p>
      <p>{t('flux.spreadsheet.activeSheet', { name: activeSheetName })}</p>
      <p>{t('flux.spreadsheet.cellEntries', { count: cellCount })}</p>
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

  useLayoutEffect(() => {
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
  const spreadsheetScopeData = useMemo(
    () => ({
      spreadsheet,
      workbook: spreadsheet.workbook,
      activeSheet: spreadsheet.activeSheet,
      selection: spreadsheet.selection,
      activeCell: spreadsheet.activeCell,
      activeRange: spreadsheet.activeRange,
      runtime: spreadsheet.runtime,
    }),
    [spreadsheet],
  );
  const spreadsheetScope = useHostScope(
    spreadsheetScopeData,
    props.path,
    'spreadsheet',
  );

  const toolbarContent = props.regions.toolbar
    ? props.helpers.render(props.regions.toolbar.templateNode, {
        scope: spreadsheetScope,
        actionScope,
      })
    : undefined;
  const bodyContent = props.regions.body
    ? props.helpers.render(props.regions.body.templateNode, {
        scope: spreadsheetScope,
        actionScope,
      })
    : undefined;
  const dialogsContent = props.regions.dialogs
    ? props.helpers.render(props.regions.dialogs.templateNode, {
        scope: spreadsheetScope,
        actionScope,
      })
    : undefined;
  const statusPath =
    typeof props.props.statusPath === 'string' ? props.props.statusPath : undefined;

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
    publishOwnerStatus(props.node.scope.parent ?? props.node.scope, statusPath, summary);
  }, [props.node.scope, snapshot.selection.kind, spreadsheet, statusPath]);

  return (
    <section
      className={cn('nop-spreadsheet-page', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
    >
      <header data-slot="spreadsheet-page-header">
        <h2>
          {hasRendererSlotContent(titleContent) ? titleContent : t('flux.spreadsheet.designer')}
        </h2>
        <p>{buildSpreadsheetStatusLabel(spreadsheet)}</p>
      </header>

      {hasRendererSlotContent(toolbarContent) ? (
        <div data-slot="spreadsheet-page-toolbar">{toolbarContent}</div>
      ) : null}

      <main data-slot="spreadsheet-page-body">
        {hasRendererSlotContent(bodyContent) ? bodyContent : renderFallbackBody(snapshot)}
      </main>

      {hasRendererSlotContent(dialogsContent) ? (
        <div data-slot="spreadsheet-page-dialogs">{dialogsContent}</div>
      ) : null}
    </section>
  );
}
