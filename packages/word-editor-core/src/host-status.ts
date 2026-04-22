export interface WordEditorHostStatusSummary {
  kind: 'word-editor';
  dirty: boolean;
  busy: boolean;
  canUndo: boolean;
  canRedo: boolean;
  wordCount: number;
  datasetCount: number;
  chartCount: number;
  codeCount: number;
}
