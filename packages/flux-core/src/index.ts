export * from './types.js';
export * from './schema-diagnostics/index.js';
export * from './validation-model.js';
export * from './constants.js';
export * from './compiled-cid.js';
export * from './value-adapter.js';
export { commitCompositeState } from './commit-state.js';
export * from './registry.js';
export * from './format-registry.js';

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
export { parsePath, normalizeRootPath, normalizeRootPaths, getIn, setIn, resolveRelativePath, toJsonPointer, appendToJsonPointer } from './utils/path.js';
export {
  mergeJson,
  diffToDelta,
  classifyList,
  readIdentity,
  planListMerge,
  DEFAULT_IDENTITY_KEYS,
  DEFAULT_OVERRIDE_KEY,
  DEFAULT_UNIQUE_ATTR_KEY,
  DEFAULT_VIRTUAL_KEY,
} from './json-merge/index.js';
export type {
  DeltaResult,
  IdentityRef,
  JsonMergeOptions,
  ListIdentityKind,
  ListMergeSlot,
  MergeDiagnostic,
  MergeDiagnosticCode,
  MergeMarkers,
  MergeResult,
} from './json-merge/index.js';
export { genId } from './utils/id.js';
export { cloneDeep } from './utils/object.js';
export { isSchema, isSchemaArray, isSchemaInput, createNodeId } from './utils/schema.js';
export { decorateRendererEnv } from './utils/renderer-env.js';
export {
  isReportedImportError,
  markImportErrorReported,
  reportImportFailure,
} from './utils/import-failure.js';
export { createLazyLibLoader } from './utils/lazy-lib.js';
export type { LazyLibLoader } from './utils/lazy-lib.js';
export { reportRuntimeHostIssue } from './utils/runtime-host-reporting.js';

export { createNamedActionProvider } from './named-action-provider.js';
export { createTemplateRegion, validateRegionParams } from './nested-regions.js';
export type { RegionCompileSchema } from './nested-regions.js';

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
export { isSafeNavigationUrl } from './utils/url.js';
export type { SafeNavigationUrlOptions } from './utils/url.js';
export { matchesFluxValueShape, validateHostMethodPayload } from './schema-diagnostics/value-shape-runtime.js';
export { defineRendererFamily } from './renderer-definition-builder.js';
export {
  createHostActionProvider,
  createHostMethodValidator,
  toHostActionError,
  type HostActionProviderFactoryOptions,
  type HostCommandResult,
} from './host-action-provider.js';

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

export {
  findUnreferencedContracts,
  isRendererEventKeyReferenced,
  isCapabilityHandleReferenced,
  buildPerRendererSourceResolver,
} from './contract-honesty.js';
export type {
  ContractHonestyViolation,
  ContractHonestySources,
  ContractHonestySourceResolver,
  ContractHonestySourceFile,
  ContractHonestyHandleFactory,
} from './contract-honesty.js';
export {
  INSPECTOR_ADAPTER_KEY,
  INSPECTOR_EDITOR_TYPE_KEY,
  INSPECTOR_EVENTS_KEY,
  INSPECTOR_RAW_JSON_FIELD,
  INSPECTOR_READONLY_KEY,
  buildInspectorSchema,
  deriveControlFromShape,
  resolveInspectorRoutedKeys,
  type InspectorBuildOptions,
  type InspectorControlAdapter,
} from './authoring/index.js';
