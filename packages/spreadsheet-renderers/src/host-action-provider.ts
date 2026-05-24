import { validateHostMethodPayload } from '@nop-chaos/flux-core';
import type { ActionNamespaceProvider, ActionResult, HostCapabilityContract } from '@nop-chaos/flux-core';
import type { SpreadsheetCommand, SpreadsheetCommandResult } from '@nop-chaos/spreadsheet-core';
import { SPREADSHEET_HOST_METHOD_CONTRACTS, SPREADSHEET_HOST_METHODS } from './spreadsheet-manifest.js';

type CommandRecord = Record<string, unknown>;

function toActionError(error: unknown): Error | undefined {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string' && error.length > 0) {
    return new Error(error);
  }

  if (error == null) {
    return undefined;
  }

  if (typeof error === 'object') {
    const message =
      typeof (error as { message?: unknown }).message === 'string' &&
      (error as { message: string }).message.length > 0
        ? (error as { message: string }).message
        : typeof (error as { code?: unknown }).code === 'string' &&
            (error as { code: string }).code.length > 0
          ? (error as { code: string }).code
          : 'Spreadsheet command failed';

    return new Error(message, { cause: error });
  }

  return new Error(String(error), { cause: error });
}

function validateMethodPayload(
  method: string,
  payload: unknown,
): { ok: true; args: CommandRecord } | { ok: false; error: Error } {
  const contract = (SPREADSHEET_HOST_METHOD_CONTRACTS as HostCapabilityContract['methods'])[method];
  const validation = validateHostMethodPayload('spreadsheet', method, payload, contract);
  return validation.ok
    ? { ok: true, args: validation.args as CommandRecord }
    : validation;
}

export function toSpreadsheetActionResult(response: SpreadsheetCommandResult): ActionResult {
  return {
    ok: response.ok,
    data: response.data,
    error: toActionError(response.error),
    cancelled: response.cancelled,
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
      const validation = validateMethodPayload(method, payload);
      if (!validation.ok) {
        return {
          ok: false,
          error: validation.error,
        };
      }

      try {
        const result = await dispatch({
          type: `spreadsheet:${method}`,
          ...validation.args,
        } as SpreadsheetCommand);
        return toSpreadsheetActionResult(result);
      } catch (error) {
        const normalizedError = toActionError(error);
        return {
          ok: false,
          error: normalizedError,
          cause: error,
        } satisfies ActionResult;
      }
    },
  };
}
