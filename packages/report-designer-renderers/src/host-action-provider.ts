import type {
  ActionNamespaceProvider,
  ActionResult,
  FluxValueShape,
  HostCapabilityContract,
} from '@nop-chaos/flux-core';
import type {
  ReportDesignerCommand,
  ReportDesignerCommandResult,
} from '@nop-chaos/report-designer-core';
import { REPORT_DESIGNER_MANIFEST_V1 } from './report-designer-manifest.js';

export const REPORT_DESIGNER_HOST_METHODS = [
  'dropFieldToTarget',
  'updateMeta',
  'replaceMeta',
  'openInspector',
  'closeInspector',
  'preview',
  'stopPreview',
  'undo',
  'redo',
  'save',
  'importTemplate',
  'exportTemplate',
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
          : 'Report designer command failed';

    return new Error(message, { cause: error });
  }

  return new Error(String(error), { cause: error });
}

function matchesShape(value: unknown, shape: FluxValueShape): boolean {
  switch (shape.kind) {
    case 'unknown':
      return true;
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'null':
      return value === null;
    case 'literal':
      return value === shape.value;
    case 'array':
      return Array.isArray(value) && value.every((item) => matchesShape(item, shape.item));
    case 'union':
      return shape.anyOf.some((variant) => matchesShape(value, variant));
    case 'object': {
      if (!isCommandRecord(value)) {
        return false;
      }
      const optional = new Set(shape.optional ?? []);
      for (const [key, fieldShape] of Object.entries(shape.fields)) {
        if (!(key in value)) {
          if (!optional.has(key)) {
            return false;
          }
          continue;
        }
        if (!matchesShape(value[key], fieldShape)) {
          return false;
        }
      }
      return true;
    }
    default:
      return false;
  }
}

function validateMethodPayload(
  method: string,
  payload: unknown,
): { ok: true; args: CommandRecord } | { ok: false; error: Error } {
  const contract = (REPORT_DESIGNER_MANIFEST_V1.capabilities.methods as HostCapabilityContract['methods'])[method];
  if (!contract?.args) {
    if (payload === undefined) {
      return { ok: true, args: {} };
    }
    if (isCommandRecord(payload)) {
      return { ok: true, args: payload };
    }
    return {
      ok: false,
      error: new Error(`report-designer:${method} does not accept a non-object payload.`),
    };
  }

  const args = payload === undefined ? {} : payload;
  if (!matchesShape(args, contract.args)) {
    return {
      ok: false,
      error: new Error(
        `report-designer:${method} payload does not match the published host args contract.`,
      ),
    };
  }

  return { ok: true, args: args as CommandRecord };
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
      return REPORT_DESIGNER_HOST_METHODS;
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
          type: `report-designer:${method}`,
          ...validation.args,
        } as ReportDesignerCommand);
        return toReportDesignerActionResult(result);
      } catch (error) {
        console.warn(`[report-designer] action ${method} failed`, error);
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
