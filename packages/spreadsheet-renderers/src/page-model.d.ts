import type { SpreadsheetRuntimeSnapshot } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetHostSnapshot } from './bridge.js';
export declare function getRuntimeActiveSheet(snapshot: SpreadsheetRuntimeSnapshot): import("@nop-chaos/spreadsheet-core").WorksheetDocument | undefined;
export declare function getRuntimeActiveSheetName(snapshot: SpreadsheetRuntimeSnapshot): string;
export declare function getRuntimeActiveSheetCellCount(snapshot: SpreadsheetRuntimeSnapshot): number;
export declare function buildSpreadsheetStatusLabel(hostSnapshot: SpreadsheetHostSnapshot): string;
