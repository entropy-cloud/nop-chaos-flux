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
} from './client/debug-client.js';
