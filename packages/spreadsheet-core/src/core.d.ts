import type { SpreadsheetConfig, SpreadsheetDocument, SpreadsheetRuntimeSnapshot, ClipboardData } from './types.js';
import type { SpreadsheetCommand, SpreadsheetCommandResult } from './commands.js';
export interface SpreadsheetCore {
    getSnapshot(): SpreadsheetRuntimeSnapshot;
    subscribe(listener: () => void): () => void;
    dispatch(command: SpreadsheetCommand): Promise<SpreadsheetCommandResult>;
    replaceDocument(nextDocument: SpreadsheetDocument): void;
    exportDocument(): SpreadsheetDocument;
    getClipboard(): ClipboardData | null;
}
export interface CreateSpreadsheetCoreOptions {
    document: SpreadsheetDocument;
    config?: SpreadsheetConfig;
    readonly?: boolean;
}
export declare function createSpreadsheetCore(options: CreateSpreadsheetCoreOptions): SpreadsheetCore;
