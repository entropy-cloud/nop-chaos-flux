import type { ActionContext, ActionNamespaceProvider, ActionResult } from '@nop-chaos/flux-core';
import type {
  CanvasEditorBridge,
  DatasetStoreApi,
  DocChart,
  DocCode,
  EditorStoreApi,
} from '@nop-chaos/word-editor-core';
import { saveDatasets, saveDocument } from '@nop-chaos/word-editor-core';

function ok(data?: unknown): ActionResult {
  return data === undefined ? { ok: true } : { ok: true, data };
}

function fail(message: string): ActionResult {
  return { ok: false, error: new Error(message) };
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
    | ((event?: unknown, ctx?: Partial<ActionContext>) => Promise<ActionResult>)
    | undefined;
}): ActionNamespaceProvider {
  return {
    kind: 'host',
    listMethods() {
      return ['save', 'insertField', 'insertChart', 'insertCode', 'undo', 'redo'];
    },
    async invoke(method, payload, ctx) {
      switch (method) {
        case 'save': {
          const saved = saveDocument(input.bridge, {
            charts: input.getCharts(),
            codes: input.getCodes(),
          });
          if (!saved) {
            return fail('Unable to save word document.');
          }
          saveDatasets(input.datasetStore.getAll());
          input.editorStore.setDirty(false);
          if (input.saveEvent) {
            const result = await input.saveEvent(undefined, ctx);
            if (!result.ok) {
              return result;
            }
          }
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
          if (!chart?.id || !chart.chartName) {
            return fail('insertChart requires a complete chart payload.');
          }
          input.bridge.insertChart(chart);
          input.setCharts([...input.getCharts(), chart]);
          return ok({ chartId: chart.id });
        }
        case 'insertCode': {
          const code = payload as DocCode | undefined;
          if (!code?.id || !code.codeName) {
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
