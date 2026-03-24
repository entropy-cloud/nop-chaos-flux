import type { SpreadsheetRuntimeSnapshot } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetHostSnapshot } from './bridge.js';

export function getRuntimeActiveSheet(snapshot: SpreadsheetRuntimeSnapshot) {
  return snapshot.document.workbook.sheets.find((sheet) => sheet.id === snapshot.activeSheetId);
}

export function getRuntimeActiveSheetName(snapshot: SpreadsheetRuntimeSnapshot): string {
  return getRuntimeActiveSheet(snapshot)?.name ?? 'Unknown';
}

export function getRuntimeActiveSheetCellCount(snapshot: SpreadsheetRuntimeSnapshot): number {
  return Object.keys(getRuntimeActiveSheet(snapshot)?.cells ?? {}).length;
}

export function buildSpreadsheetStatusLabel(hostSnapshot: SpreadsheetHostSnapshot): string {
  return `Active sheet: ${hostSnapshot.activeSheet?.name ?? 'Unknown'} | Selection: ${hostSnapshot.selection.kind}`;
}
