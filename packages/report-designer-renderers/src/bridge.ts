import type {
  SpreadsheetBridge,
  SpreadsheetHostSnapshot,
} from '@nop-chaos/spreadsheet-renderers';
import type {
  ReportDesignerCore,
  ReportDesignerRuntimeSnapshot,
  ReportDesignerCommand,
  ReportDesignerCommandResult,
  InspectorRuntimeState,
  InspectorPanelDescriptor,
  FieldSourceSnapshot,
  FieldDragState,
  MetadataBag,
} from '@nop-chaos/report-designer-core';

export interface ReportDesignerHostSnapshot extends SpreadsheetHostSnapshot {
  designer: {
    kind: string;
    dirty: boolean;
    inspector: InspectorRuntimeState;
  };
  fieldSources: FieldSourceSnapshot[];
  fieldDrag: FieldDragState;
  meta?: MetadataBag;
  preview: {
    running: boolean;
    mode?: string;
  };
  inspectorPanels: InspectorPanelDescriptor[];
}

export interface ReportDesignerBridge extends SpreadsheetBridge {
  getDesignerSnapshot(): ReportDesignerHostSnapshot;
  dispatchDesigner(command: ReportDesignerCommand): Promise<ReportDesignerCommandResult>;
  getDesignerCore(): ReportDesignerCore;
}

export type ReportDesignerEvent =
  | { type: 'report-designer:fieldDragStart'; payload: FieldDragState }
  | { type: 'report-designer:fieldDragEnd'; payload: FieldDragState }
  | { type: 'report-designer:selectionTargetChanged'; payload: import('@nop-chaos/report-designer-core').ReportSelectionTarget | undefined }
  | { type: 'report-designer:previewStarted'; payload: { mode?: string } }
  | { type: 'report-designer:previewFinished'; payload: import('@nop-chaos/report-designer-core').PreviewResult };

export interface ReportDesignerEventEmitter {
  emit(event: ReportDesignerEvent): void;
  on(handler: (event: ReportDesignerEvent) => void): () => void;
}

export function createEventEmitter(): ReportDesignerEventEmitter {
  const handlers = new Set<(event: ReportDesignerEvent) => void>();

  return {
    emit(event: ReportDesignerEvent) {
      for (const handler of handlers) {
        handler(event);
      }
    },
    on(handler: (event: ReportDesignerEvent) => void) {
      handlers.add(handler);
      return () => { handlers.delete(handler); };
    },
  };
}

export function deriveDesignerHostSnapshot(
  spreadsheet: SpreadsheetHostSnapshot,
  designer: ReportDesignerRuntimeSnapshot,
  inspectorPanels?: InspectorPanelDescriptor[],
): ReportDesignerHostSnapshot {
  return {
    ...spreadsheet,
    designer: {
      kind: designer.document.kind,
      dirty: spreadsheet.runtime.dirty,
      inspector: designer.inspector,
    },
    fieldSources: designer.fieldSources,
    fieldDrag: designer.fieldDrag,
    meta: designer.activeMeta,
    preview: {
      running: designer.preview.running,
      mode: designer.preview.mode,
    },
    inspectorPanels: inspectorPanels ?? [],
  };
}

export function createReportDesignerBridge(
  spreadsheetBridge: SpreadsheetBridge,
  designerCore: ReportDesignerCore,
): ReportDesignerBridge {
  return {
    ...spreadsheetBridge,

    getDesignerSnapshot() {
      const spreadsheet = spreadsheetBridge.getSnapshot();
      const designer = designerCore.getSnapshot();
      return deriveDesignerHostSnapshot(spreadsheet, designer, designerCore.getInspectorPanels());
    },

    dispatchDesigner(command: ReportDesignerCommand) {
      return designerCore.dispatch(command);
    },

    getDesignerCore() {
      return designerCore;
    },
  };
}
