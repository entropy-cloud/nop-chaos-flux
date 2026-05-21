import type {
  ActionContext,
  ActionNamespaceProvider,
  ActionResult,
  FluxValueShape,
  HostCapabilityContract,
} from '@nop-chaos/flux-core';
import type {
  CanvasEditorBridge,
  DatasetStoreApi,
  DocChart,
  DocCode,
  EditorStoreApi,
  PaperSettings,
  SavedDocumentData,
} from '@nop-chaos/word-editor-core';
import {
  captureDocumentSnapshot,
  persistSavedDocument,
  saveDatasets,
  validateDocChart,
  validateDocCode,
} from '@nop-chaos/word-editor-core';
import { WORD_EDITOR_HOST_METHOD_CONTRACTS } from './word-editor-manifest.js';

type CommandRecord = Record<string, unknown>;

function isCommandRecord(payload: unknown): payload is CommandRecord {
  return Boolean(payload) && typeof payload === 'object' && !Array.isArray(payload);
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
  const contract = (WORD_EDITOR_HOST_METHOD_CONTRACTS as HostCapabilityContract['methods'])[method];
  if (!contract?.args) {
    if (payload === undefined) {
      return { ok: true, args: {} };
    }
    if (isCommandRecord(payload)) {
      return { ok: true, args: payload };
    }
    return {
      ok: false,
      error: new Error(`word-editor:${method} does not accept a non-object payload.`),
    };
  }

  const args = payload === undefined ? {} : payload;
  if (!matchesShape(args, contract.args)) {
    return {
      ok: false,
      error: new Error(`word-editor:${method} payload does not match the published host args contract.`),
    };
  }

  return { ok: true, args: args as CommandRecord };
}

function ok(data?: unknown): ActionResult {
  return data === undefined ? { ok: true } : { ok: true, data };
}

function fail(message: string): ActionResult {
  return { ok: false, error: new Error(message) };
}

function failWithError(error: Error): ActionResult {
  return { ok: false, error };
}

function toAbortError(reason: unknown, message: string): Error {
  if (reason instanceof Error) {
    return reason;
  }

  if (reason === undefined) {
    const error = new Error(message);
    error.name = 'AbortError';
    return error;
  }

  const error = new Error(message, { cause: reason });
  error.name = 'AbortError';
  return error;
}

export function createWordEditorActionProvider(input: {
  bridge: CanvasEditorBridge;
  editorStore: EditorStoreApi;
  datasetStore: DatasetStoreApi;
  getCharts(): DocChart[];
  setCharts(next: DocChart[]): void;
  getCodes(): DocCode[];
  setCodes(next: DocCode[]): void;
  getPaperSettings(): PaperSettings;
  saveEvent?:
    | ((event?: SavedDocumentData, ctx?: Partial<ActionContext>) => Promise<ActionResult>)
    | undefined;
  onDocumentSaved?: (saved: SavedDocumentData) => void;
}): ActionNamespaceProvider {
  return {
    kind: 'host',
    listMethods() {
      return ['save', 'insertField', 'insertChart', 'insertCode', 'undo', 'redo'];
    },
    async invoke(method, payload, ctx) {
      switch (method) {
        case 'save': {
          let saved: SavedDocumentData;
          try {
            saved = captureDocumentSnapshot(input.bridge, {
              paperSettings: input.getPaperSettings(),
            });
          } catch (error) {
            const normalizedError = error instanceof Error ? error : new Error(String(error));
            return failWithError(
              new Error('Unable to save word document.', {
                cause: normalizedError,
              }),
            );
          }
          if (input.saveEvent) {
            const result = await input.saveEvent(saved, ctx);
            if (!result.ok) {
              return result;
            }
          }
          if (ctx.signal?.aborted) {
            return {
              ok: false,
              cancelled: true,
              error: toAbortError(ctx.signal.reason, 'Word document save was aborted.'),
            };
          }
          try {
            persistSavedDocument(saved);
            saveDatasets(input.datasetStore.getAll());
          } catch (error) {
            const normalizedError = error instanceof Error ? error : new Error(String(error));
            return failWithError(
              new Error('Unable to save word document.', {
                cause: normalizedError,
              }),
            );
          }
          input.editorStore.setDirty(false);
          input.onDocumentSaved?.(saved);
          return ok({ saved: true });
        }
        case 'insertField': {
          if (typeof payload?.datasetName !== 'string' || typeof payload?.fieldName !== 'string') {
            return fail('insertField requires datasetName and fieldName.');
          }
          input.bridge.insertFieldExpression(payload.datasetName, payload.fieldName);
          return ok();
        }
        case 'insertChart': {
          const payloadValidation = validateMethodPayload(method, payload);
          if (!payloadValidation.ok) {
            return { ok: false, error: payloadValidation.error };
          }
          const chart = payloadValidation.args as unknown as DocChart;
          const domainValidation = validateDocChart(chart ?? {});
          if (!chart?.id || !domainValidation.valid) {
            return fail('insertChart requires a complete chart payload.');
          }
          input.bridge.insertChart(chart);
          input.setCharts([...input.getCharts(), chart]);
          return ok({ chartId: chart.id });
        }
        case 'insertCode': {
          const payloadValidation = validateMethodPayload(method, payload);
          if (!payloadValidation.ok) {
            return { ok: false, error: payloadValidation.error };
          }
          const code = payloadValidation.args as unknown as DocCode;
          const domainValidation = validateDocCode(code ?? {});
          if (!code?.id || !domainValidation.valid) {
            return fail('insertCode requires a complete code payload.');
          }
          input.bridge.insertCode(code);
          input.setCodes([...input.getCodes(), code]);
          return ok({ codeId: code.id });
        }
        case 'undo': {
          input.bridge.undo();
          return ok();
        }
        case 'redo': {
          input.bridge.redo();
          return ok();
        }
        default:
          return fail(`Unknown word-editor method: ${method}`);
      }
    },
  };
}
