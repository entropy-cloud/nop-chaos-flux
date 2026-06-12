export * from './types.js';
export * from './schema-diagnostics/index.js';
export * from './validation-model.js';
export * from './constants.js';
export * from './compiled-cid.js';
export * from './value-adapter.js';
export * from './registry.js';

export {
  clampArrayIndex,
  clampInsertIndex,
  insertArrayValue,
  moveArrayValue,
  removeArrayValue,
  swapArrayValue,
} from './utils/array.js';

export { resolveClassAliases, mergeClassAliases } from './class-aliases.js';

export {
  isPlainObject,
  isRecord,
  toRecord,
  toPositiveNumber,
  toStringArray,
  shallowEqualRecords,
  shallowEqual,
} from './utils/object.js';
export { parsePath, normalizeRootPath, normalizeRootPaths, getIn, setIn } from './utils/path.js';
export { isSchema, isSchemaArray, isSchemaInput, createNodeId } from './utils/schema.js';
export { decorateRendererEnv } from './utils/renderer-env.js';
export {
  isReportedImportError,
  markImportErrorReported,
  reportImportFailure,
} from './utils/import-failure.js';
export { reportRuntimeHostIssue } from './utils/runtime-host-reporting.js';

export { createNamedActionProvider } from './named-action-provider.js';
export {
  createTemplateRegion,
  extractNestedSchemaRegions,
  validateRegionParams,
  visitNestedSchemaRegions,
} from './nested-regions.js';
export type { NestedRegionFieldRule, RegionCompileSchema } from './nested-regions.js';

export {
  FAIL_ON_SCHEMA_DIAGNOSTICS_KEY,
  STRICT_VALIDATION_KEY,
  isStrictValidationEnabled,
  shouldFailOnSchemaDiagnostics,
  setFailOnSchemaDiagnosticsGlobal,
  setStrictValidationGlobal,
} from './strict-mode.js';

export type { PathBindingContext, PathBindingService } from './utils/path-binding.js';
export { createPathBinding, projectBooleanMap, projectFieldStates } from './utils/path-binding.js';
export type { RendererEnvDecoratorHooks } from './utils/renderer-env.js';
export type { RuntimeHostIssueInput } from './utils/runtime-host-reporting.js';

export { validationErrorsEqual } from './utils/validation-utils.js';
export { normalizeInstancePath } from './utils/instance-path.js';
export { cancelPendingDebounce, scheduleDebounce } from './utils/debounce.js';
export { matchesFluxValueShape, validateHostMethodPayload } from './schema-diagnostics/value-shape-runtime.js';

export { setMessageFormatter, getMessageFormatter } from './i18n-sink.js';
export type { MessageFormatter } from './i18n-sink.js';

export type {
  DomainBridge,
  BusyActionPhase,
  BusyActionState,
  WorkbenchSessionState,
  ResourceBrowserInteractionPolicy,
} from './workbench/index.js';

export type { StructuralLoopBindings, StructuralLoopRenderContext } from './types/renderer-hooks.js';

export { isAbortError, buildScopeChain } from './runtime-inspection.js';
