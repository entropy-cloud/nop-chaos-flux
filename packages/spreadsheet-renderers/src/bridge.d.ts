import type { SpreadsheetCore, SpreadsheetRuntimeSnapshot, SpreadsheetSelection, SpreadsheetCellRef, SpreadsheetRange, WorkbookDocument, WorksheetDocument, SpreadsheetCommand, SpreadsheetCommandResult } from '@nop-chaos/spreadsheet-core';
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
export declare function deriveHostSnapshot(runtime: SpreadsheetRuntimeSnapshot): SpreadsheetHostSnapshot;
export declare function createSpreadsheetBridge(core: SpreadsheetCore): SpreadsheetBridge;
