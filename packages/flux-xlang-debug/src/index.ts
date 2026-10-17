export {
  createDebugStore,
  type Breakpoint,
  type SuspendedState,
  type ExceptionItem,
  type LeaseState,
  type StepKind,
  type DebugTransport,
  type DebugStoreState,
  type DebugStoreInternalState,
  type DebugStoreActions,
  type DebugStore,
} from './state/debug-store.js';
export { createBreakpointGutter, handleGutterClick, BreakpointMarker } from './extension/breakpoint-gutter.js';
export { breakpointsField } from './extension/fields.js';
export { createSuspendedLineExtension, suspendedLinesField, setSuspendedLines } from './extension/decorations.js';
export { createExceptionSquiggleExtension, exceptionLinesField, setExceptionLines } from './extension/decorations.js';
export {
  setBreakpointsEffect,
  setSuspendedLinesEffect,
  setExceptionLinesEffect,
  XLANG_DEBUG_EFFECT_FAMILIES,
} from './extension/effects.js';
export { sourcePathFacet } from './extension/source-path.js';
export { syncStoreToExtensions, type SyncStoreToExtensionsOptions } from './extension/sync.js';
export {
  createDebugClient,
  type CreateDebugClientOptions,
  type DebugClient,
  type LeasePolicy,
  type SessionCloseReason,
  type XlangLogEntry,
  type XlangCompleted,
} from './client/debug-client.js';
export { DebugPanel, type DebugPanelProps } from './panel/debug-panel.js';
export { ControlButtons, type ControlButtonsProps } from './panel/control-buttons.js';
export { CallStackPanel, CallStackPanelGuarded, type CallStackPanelProps } from './panel/call-stack-panel.js';
export { VariablesTree, type VariablesTreeProps } from './panel/variables-tree.js';
export { EvalInput, type EvalInputProps } from './panel/eval-input.js';
export { LogPanel, type LogPanelProps } from './panel/log-panel.js';
export {
  XlangDebugEditor,
  XlangDebugEditorRenderer,
  type XlangDebugEditorProps,
} from './assembly/xlang-debug-editor.js';
export {
  createCompileService,
  type CompileFetcherAdapterOptions,
} from './assembly/compile-service.js';
export {
  xlangDebugEditorRendererDefinition,
  xlangDebugEditorFieldRules,
  registerXlangDebugEditorRenderers,
  type XlangDebugEditorSchema,
} from './assembly/renderer.js';
