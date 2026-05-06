import type { ActionNamespaceProvider, ActionResult } from '@nop-chaos/flux-core';
import type {
  ReportDesignerCommand,
  ReportDesignerCommandResult,
} from '@nop-chaos/report-designer-core';

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

export function toReportDesignerActionResult(response: ReportDesignerCommandResult): ActionResult {
  return {
    ok: response.ok,
    cancelled: response.cancelled,
    data: response.data,
    error: toActionError(response.error),
  };
}

export function createReportDesignerActionProvider(
  dispatch: (command: ReportDesignerCommand) => Promise<ReportDesignerCommandResult>,
): ActionNamespaceProvider {
  return {
    kind: 'host',
    listMethods() {
      return [];
    },
    async invoke(method, payload) {
      const args = isCommandRecord(payload) ? payload : {};
      try {
        const result = await dispatch({
          type: `report-designer:${method}`,
          ...args,
        } as ReportDesignerCommand);
        return toReportDesignerActionResult(result);
      } catch (error) {
        console.warn(`[report-designer] action ${method} failed`, error);
        return {
          ok: false,
          error: toActionError(error),
        } satisfies ActionResult;
      }
    },
  };
}
