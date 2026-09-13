import './print-designer.css';

export * from './schemas.js';
export {
  PRINT_ELEMENT_RENDERERS,
  getPrintElementRenderer,
  type PrintElementRendererComponent,
  type PrintElementRendererEntry,
} from './renderer-definitions.js';
export {
  createPrintDomainAdapter,
  applyPrintDocumentDiff,
  diffPrintDocuments,
  type PrintDocument,
  type PrintTemplateDiff,
} from './editor/print-domain-adapter.js';
export {
  createPrintEditorController,
  usePrintEditorSnapshot,
  PASTE_OFFSET_MM,
  type PrintEditorController,
  type PrintEditorOptions,
  type PrintEditorSnapshot,
} from './editor/use-print-editor.js';
export {
  applyHandleDelta,
  computeRotateAngle,
  computeSnap,
  gridCandidates,
  screenDeltaToPaper,
  screenToPaper,
  MIN_ELEMENT_SIZE_MM,
  type Frame,
  type PaperPoint,
  type ResizeHandle,
  type SnapOptions,
  type SnapResult,
} from './editor/canvas-math.js';
export { PrintDesignerCanvas, type PrintDesignerCanvasProps } from './print-designer-canvas.js';
export { PrintPalette, PRINT_ELEMENT_MIME, type PrintPaletteProps } from './print-palette.js';
export { PrintInspector, type PrintInspectorProps } from './print-inspector.js';
export { PrintPreview, type PrintPreviewProps } from './print-preview.js';
export { PrintDesigner, type PrintDesignerProps } from './print-designer.js';
