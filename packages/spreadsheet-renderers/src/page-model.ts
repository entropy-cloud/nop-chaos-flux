import type { SpreadsheetRuntimeSnapshot } from '@nop-chaos/spreadsheet-core';
import { t } from '@nop-chaos/flux-i18n';
import type { SpreadsheetHostSnapshot } from './bridge.js';

export function getRuntimeActiveSheet(snapshot: SpreadsheetRuntimeSnapshot) {
  return snapshot.document.workbook.sheets.find((sheet) => sheet.id === snapshot.activeSheetId);
}

export function getRuntimeActiveSheetName(snapshot: SpreadsheetRuntimeSnapshot): string {
  return getRuntimeActiveSheet(snapshot)?.name ?? t('flux.spreadsheet.unknown');
}

export function getRuntimeActiveSheetCellCount(snapshot: SpreadsheetRuntimeSnapshot): number {
  return Object.keys(getRuntimeActiveSheet(snapshot)?.cells ?? {}).length;
}

export function buildSpreadsheetStatusLabel(hostSnapshot: SpreadsheetHostSnapshot): string {
  return t('flux.spreadsheet.statusLabel', {
    name: hostSnapshot.activeSheet?.name ?? t('flux.spreadsheet.unknown'),
    selection: hostSnapshot.selection.kind,
  });
}
