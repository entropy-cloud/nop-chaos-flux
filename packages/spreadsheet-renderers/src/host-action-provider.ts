import type { ActionResult } from '@nop-chaos/flux-core';
import { createHostActionProvider, toHostActionError } from '@nop-chaos/flux-core';
import type { SpreadsheetCommand, SpreadsheetCommandResult } from '@nop-chaos/spreadsheet-core';
import { SPREADSHEET_HOST_METHOD_CONTRACTS, SPREADSHEET_HOST_METHODS } from './spreadsheet-manifest.js';

export function toSpreadsheetActionResult(response: SpreadsheetCommandResult): ActionResult {
  return {
    ok: response.ok,
    data: response.data,
    error: toHostActionError(response.error, 'Spreadsheet command failed'),
    cancelled: response.cancelled,
  };
}

export function createSpreadsheetActionProvider(
  dispatch: (command: SpreadsheetCommand) => Promise<SpreadsheetCommandResult>,
) {
  return createHostActionProvider<SpreadsheetCommand, SpreadsheetCommandResult>({
    namespace: 'spreadsheet',
    methods: SPREADSHEET_HOST_METHODS,
    contracts: SPREADSHEET_HOST_METHOD_CONTRACTS,
    dispatch,
    toActionResult: toSpreadsheetActionResult,
    fallbackErrorMessage: 'Spreadsheet command failed',
  });
}
