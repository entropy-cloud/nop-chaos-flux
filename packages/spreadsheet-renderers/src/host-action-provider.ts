import type { ActionNamespaceProvider, ActionResult } from '@nop-chaos/flux-core';
import type { SpreadsheetCommand, SpreadsheetCommandResult } from '@nop-chaos/spreadsheet-core';

export const SPREADSHEET_HOST_METHODS = [
  'setActiveSheet',
  'setSelection',
  'setCellValue',
  'setCellFormula',
  'setCellStyle',
  'resizeRow',
  'resizeColumn',
  'mergeRange',
  'unmergeRange',
  'hideRow',
  'hideColumn',
  'addSheet',
  'removeSheet',
  'undo',
  'redo',
  'copyCells',
  'cutCells',
  'pasteCells',
  'clearCells',
  'insertRow',
  'insertColumn',
  'deleteRow',
  'deleteColumn',
  'renameSheet',
  'moveSheet',
  'copySheet',
  'setSheetTabColor',
  'hideSheet',
  'protectSheet',
  'selectAll',
  'selectRow',
  'selectColumn',
  'setCellFontFamily',
  'setCellFontSize',
  'setCellFontWeight',
  'setCellFontStyle',
  'setCellTextDecoration',
  'setCellFontColor',
  'setCellBackgroundColor',
  'setCellBorder',
  'setCellTextAlign',
  'setCellVerticalAlign',
  'setCellWrapText',
  'setCellNumberFormat',
  'fillDown',
  'fillRight',
  'fillSeries',
  'addComment',
  'editComment',
  'deleteComment',
  'autoFitRow',
  'autoFitColumn',
  'mergeCellsCenter',
  'freezePanes',
  'unfreezePanes',
  'sortRange',
  'filterRowsByCellValue',
  'clearRowFilters',
  'find',
  'findNext',
  'replace',
  'replaceAll',
] as const;

type CommandRecord = Record<string, unknown>;

function isCommandRecord(payload: unknown): payload is CommandRecord {
  return Boolean(payload) && typeof payload === 'object' && !Array.isArray(payload);
}

function toActionError(error: unknown): Error | undefined {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string' && error.length > 0) {
    return new Error(error);
  }

  return error == null ? undefined : new Error(String(error));
}

export function toSpreadsheetActionResult(response: SpreadsheetCommandResult): ActionResult {
  return {
    ok: response.ok,
    data: response.data,
    error: toActionError(response.error),
  };
}

export function createSpreadsheetActionProvider(
  dispatch: (command: SpreadsheetCommand) => Promise<SpreadsheetCommandResult>,
): ActionNamespaceProvider {
  return {
    kind: 'host',
    listMethods() {
      return SPREADSHEET_HOST_METHODS;
    },
    async invoke(method, payload) {
      const args = isCommandRecord(payload) ? payload : {};
      const result = await dispatch({
        type: `spreadsheet:${method}`,
        ...args,
      } as SpreadsheetCommand);
      return toSpreadsheetActionResult(result);
    },
  };
}
