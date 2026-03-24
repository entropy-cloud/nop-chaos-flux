import type {
  SpreadsheetCore,
  SpreadsheetRuntimeSnapshot,
  SpreadsheetSelection,
  SpreadsheetCellRef,
  SpreadsheetRange,
  WorkbookDocument,
  WorksheetDocument,
  SpreadsheetCommand,
  SpreadsheetCommandResult,
} from '@nop-chaos/spreadsheet-core';

export interface SpreadsheetHostSnapshot {
  workbook: WorkbookDocument;
  activeSheet?: WorksheetDocument;
  selection: SpreadsheetSelection;
  activeCell?: SpreadsheetCellRef;
  activeRange?: SpreadsheetRange;
  runtime: {
    canUndo: boolean;
    canRedo: boolean;
    readonly: boolean;
    dirty: boolean;
    zoom: number;
  };
}

export interface SpreadsheetBridge {
  getSnapshot(): SpreadsheetHostSnapshot;
  subscribe(listener: () => void): () => void;
  dispatch(command: SpreadsheetCommand): Promise<SpreadsheetCommandResult>;
  getCore(): SpreadsheetCore;
}

export function deriveHostSnapshot(runtime: SpreadsheetRuntimeSnapshot): SpreadsheetHostSnapshot {
  const activeSheet = runtime.document.workbook.sheets.find(
    (s) => s.id === runtime.activeSheetId,
  );

  let activeCell: SpreadsheetCellRef | undefined;
  let activeRange: SpreadsheetRange | undefined;

  if (runtime.selection.kind === 'cell' && runtime.selection.anchor) {
    activeCell = runtime.selection.anchor;
  }
  if (runtime.selection.kind === 'range' && runtime.selection.range) {
    activeRange = runtime.selection.range;
  }

  return {
    workbook: runtime.document.workbook,
    activeSheet,
    selection: runtime.selection,
    activeCell,
    activeRange,
    runtime: {
      canUndo: runtime.history.canUndo,
      canRedo: runtime.history.canRedo,
      readonly: runtime.readonly,
      dirty: runtime.dirty,
      zoom: runtime.viewport.zoom,
    },
  };
}

export function createSpreadsheetBridge(core: SpreadsheetCore): SpreadsheetBridge {
  return {
    getSnapshot() {
      const runtime = core.getSnapshot();
      return deriveHostSnapshot(runtime);
    },

    subscribe(listener: () => void) {
      return core.subscribe(listener);
    },

    dispatch(command: SpreadsheetCommand) {
      return core.dispatch(command);
    },

    getCore() {
      return core;
    },
  };
}
