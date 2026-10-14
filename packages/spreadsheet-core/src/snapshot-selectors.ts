import type { SpreadsheetRuntimeSnapshot } from './types.js';

/**
 * Page-snapshot slice family (plan 598 G1, ex spreadsheet-renderers/
 * page-renderer.tsx:35-75 — moved verbatim): projects the workbench-relevant
 * fields of a SpreadsheetRuntimeSnapshot for use-sync-external-store-with-
 * selector consumers. Reference equality per field; the React hook
 * (useSnapshotSelector) stays renderer-side (core is React-free).
 */
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
