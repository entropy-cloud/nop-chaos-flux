import React, { useLayoutEffect, useMemo } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { SpreadsheetHostStatusSummary } from '@nop-chaos/spreadsheet-core';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useCurrentActionScope,
  useHostScope,
  useStatusPathPublication,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import {
  createSpreadsheetCore,
  type SpreadsheetConfig,
  type SpreadsheetCommand,
  type SpreadsheetCommandResult,
  type SpreadsheetDocument,
  type SpreadsheetRuntimeSnapshot,
} from '@nop-chaos/spreadsheet-core';
import { cn } from '@nop-chaos/ui';
import { deriveHostSnapshot } from './bridge.js';
import { createSpreadsheetActionProvider } from './host-action-provider.js';
import {
  buildSpreadsheetStatusLabel,
  getRuntimeActiveSheetCellCount,
  getRuntimeActiveSheetName,
} from './page-model.js';
import type { SpreadsheetPageSchema } from './types.js';

export interface SpreadsheetPageSnapshotSlice {
  document: SpreadsheetRuntimeSnapshot['document'];
  activeSheetId: SpreadsheetRuntimeSnapshot['activeSheetId'];
  selection: SpreadsheetRuntimeSnapshot['selection'];
  history: SpreadsheetRuntimeSnapshot['history'];
  dirty: boolean;
  readonly: boolean;
  viewport: SpreadsheetRuntimeSnapshot['viewport'];
  layout: SpreadsheetRuntimeSnapshot['layout'];
}

export function selectSpreadsheetPageSnapshot(
  snapshot: SpreadsheetRuntimeSnapshot,
): SpreadsheetPageSnapshotSlice {
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

export function equalSpreadsheetPageSnapshot(
  a: SpreadsheetPageSnapshotSlice,
  b: SpreadsheetPageSnapshotSlice,
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
    () =>
      createSpreadsheetActionProvider(
        (command: SpreadsheetCommand) =>
          spreadsheetCore.dispatch(command) as Promise<SpreadsheetCommandResult>,
      ),
    [spreadsheetCore],
  );
  const actionScope = useCurrentActionScope();

  useLayoutEffect(() => {
    if (!actionScope) {
      return;
    }

    return actionScope.registerNamespace('spreadsheet', spreadsheetProvider);
  }, [actionScope, spreadsheetProvider]);

  const snapshot = useSyncExternalStoreWithSelector(
    spreadsheetCore.subscribe,
    spreadsheetCore.getSnapshot,
    spreadsheetCore.getSnapshot,
    selectSpreadsheetPageSnapshot,
    equalSpreadsheetPageSnapshot,
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
  const spreadsheetScope = useHostScope(spreadsheetScopeData, props.path, 'spreadsheet');

  const toolbarContent = props.regions.toolbar
    ? props.regions.toolbar.render({
        scope: spreadsheetScope,
        actionScope,
      })
    : undefined;
  const bodyContent = props.regions.body
    ? props.regions.body.render({
        scope: spreadsheetScope,
        actionScope,
      })
    : undefined;
  const dialogsContent = props.regions.dialogs
    ? props.regions.dialogs.render({
        scope: spreadsheetScope,
        actionScope,
      })
    : undefined;
  const statusPath =
    typeof props.props.statusPath === 'string' ? props.props.statusPath : undefined;

  useStatusPathPublication<SpreadsheetHostStatusSummary>(
    props.node.scope.parent ?? props.node.scope,
    statusPath,
    {
      kind: 'spreadsheet',
      dirty: spreadsheet.runtime.dirty,
      busy: false,
      canUndo: spreadsheet.runtime.canUndo,
      canRedo: spreadsheet.runtime.canRedo,
      readonly: spreadsheet.runtime.readonly,
      activeSheetId: spreadsheet.activeSheet?.id,
      selectionKind: snapshot.selection.kind,
    },
  );

  return (
    <section
      className={cn('nop-spreadsheet-page', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
    >
      <header data-slot="spreadsheet-page-header">
        <h2>
          {hasRendererSlotContent(titleContent)
            ? asReactNode(titleContent)
            : t('flux.spreadsheet.designer')}
        </h2>
        <p>{buildSpreadsheetStatusLabel(spreadsheet)}</p>
      </header>

      {hasRendererSlotContent(asReactNode(toolbarContent)) ? (
        <div data-slot="spreadsheet-page-toolbar">{asReactNode(toolbarContent)}</div>
      ) : null}

      <main data-slot="spreadsheet-page-body">
        {hasRendererSlotContent(asReactNode(bodyContent))
          ? asReactNode(bodyContent)
          : renderFallbackBody(snapshot)}
      </main>

      {hasRendererSlotContent(asReactNode(dialogsContent)) ? (
        <div data-slot="spreadsheet-page-dialogs">{asReactNode(dialogsContent)}</div>
      ) : null}
    </section>
  );
}
