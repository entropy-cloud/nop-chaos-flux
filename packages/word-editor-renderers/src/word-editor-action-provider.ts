import type { ActionContext, ActionNamespaceProvider, ActionResult } from '@nop-chaos/flux-core';
import type {
  CanvasEditorBridge,
  DatasetStoreApi,
  DocChart,
  DocCode,
  EditorStoreApi,
  SavedDocumentData,
} from '@nop-chaos/word-editor-core';
import {
  captureDocumentSnapshot,
  persistSavedDocument,
  saveDatasets,
  validateDocChart,
  validateDocCode,
} from '@nop-chaos/word-editor-core';

function ok(data?: unknown): ActionResult {
  return data === undefined ? { ok: true } : { ok: true, data };
}

function fail(message: string): ActionResult {
  return { ok: false, error: new Error(message) };
}

function failWithError(error: Error): ActionResult {
  return { ok: false, error };
}

export function createWordEditorActionProvider(input: {
  bridge: CanvasEditorBridge;
  editorStore: EditorStoreApi;
  datasetStore: DatasetStoreApi;
  getCharts(): DocChart[];
  setCharts(next: DocChart[]): void;
  getCodes(): DocCode[];
  setCodes(next: DocCode[]): void;
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
          const charts = input.getCharts();
          const codes = input.getCodes();
          let saved: SavedDocumentData;
          try {
            saved = captureDocumentSnapshot(input.bridge, {
              charts,
              codes,
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
            return { ok: false, error: new Error('Word document save was aborted.') };
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
          const chart = payload as DocChart | undefined;
          const validation = validateDocChart(chart ?? {});
          if (!chart?.id || !validation.valid) {
            return fail('insertChart requires a complete chart payload.');
          }
          input.bridge.insertChart(chart);
          input.setCharts([...input.getCharts(), chart]);
          return ok({ chartId: chart.id });
        }
        case 'insertCode': {
          const code = payload as DocCode | undefined;
          const validation = validateDocCode(code ?? {});
          if (!code?.id || !validation.valid) {
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
